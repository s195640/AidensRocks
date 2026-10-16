// Client errors get their real 4xx instead of a 500, and aren't recorded as
// server errors (middleware/errorHandler.js).
import { describe, it, expect } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { require, api, sql } from '../helpers/server.mjs';

const multer = require('multer');
const { errorCapture } = require('../../src/middleware/errorCapture');
const errorHandler = require('../../src/middleware/errorHandler');

const serverErrors = async () => (await sql('SELECT COUNT(*)::int AS n FROM server_error'))[0].n;

describe('HTTP error codes', () => {
  it('malformed JSON is a 400 with the usual { error } body, not a recorded 500', async () => {
    const before = await serverErrors();
    const res = await api()
      .post('/api/rock-requests')
      .set('Content-Type', 'application/json')
      .send('{"name": "oops"');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    await new Promise((r) => setTimeout(r, 300));
    expect(await serverErrors()).toBe(before);
  });

  // The same handler and capture as app.js, with routes that fail the way
  // multer and a real bug do.
  const app = express();
  app.use(errorCapture);
  app.post('/too-large', (req, res, next) => next(new multer.MulterError('LIMIT_FILE_SIZE', 'images')));
  app.post('/too-many', (req, res, next) => next(new multer.MulterError('LIMIT_FILE_COUNT')));
  app.post('/bug', (req, res, next) => next(new Error('http codes test: a real bug')));
  app.use(errorHandler);

  it('an upload over the size limit is 413; other upload problems are 400', async () => {
    const big = await supertest(app).post('/too-large');
    expect(big.status).toBe(413);
    expect(big.body.error).toMatch(/too large/i);
    expect((await supertest(app).post('/too-many')).status).toBe(400);
  });

  it('anything else is still a 500 and is recorded', async () => {
    const res = await supertest(app).post('/bug').set('User-Agent', 'Mozilla/5.0 Chrome/129');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something broke!' });
    await new Promise((r) => setTimeout(r, 400));
    const rows = await sql(`SELECT kind, status FROM server_error WHERE message = 'http codes test: a real bug'`);
    expect(rows).toEqual([{ kind: 'request', status: 500 }]);
  });
});
