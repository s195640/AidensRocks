// Fixes from the Site Tracking code review (0.15.17). Each test pins one
// bug so it can't come back.
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import express from 'express';
import supertest from 'supertest';
import { require, api, bearer, sql, waitFor } from '../helpers/server.mjs';
import { clearMail, listMail } from '../helpers/mailpit.mjs';

const { errorCapture } = require('../../src/middleware/errorCapture');
const recordServerError = require('../../src/utils/errors/recordServerError');
const resolveStack = require('../../src/utils/errors/resolveStack');

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const LIVE = { 'X-Forwarded-For': '8.8.8.8', Origin: 'http://localhost:4174' };
const ALERTS_TO = 'failures@aidensrocks.com';

const newVisit = (version = '0.15.17') => ({ id: randomUUID(), deviceId: randomUUID(), landingPath: '/', clientVersion: version });
const send = (visit, events, headers = LIVE) =>
  api().post('/api/activity').set('User-Agent', CHROME).set(headers).send({ visit, events });
const clientError = (message, version = '0.15.17') => ({
  id: randomUUID(),
  type: 'client_error',
  path: '/map',
  meta: { message, stack: `Error: ${message}\n    at x (http://localhost:4174/assets/index-AbCd1234.js:1:1)`, app_version: version },
});
const eventsOf = (visitId) => sql('SELECT * FROM site_event WHERE visit_id = $1', [visitId]);
const fpOf = async (visitId) =>
  (await waitFor(async () => (await eventsOf(visitId)).find((e) => e.meta?.fingerprint), { label: 'error event' })).meta
    .fingerprint;
const groupOf = async (fp) => (await sql('SELECT * FROM error_group WHERE fingerprint = $1', [fp]))[0];
const newErrorMails = async (needle) =>
  (await listMail(ALERTS_TO)).filter((m) => /New error on the site/.test(m.Subject) && m.Subject.includes(needle));

let A;
beforeAll(async () => {
  A = await bearer('admin');
});

describe('alerts', () => {
  it('an error first seen on internal traffic still alerts when a real visitor hits it', async () => {
    await clearMail();
    const internal = newVisit();
    await send(internal, [clientError('review fix internal first 1')], {});
    const fp = await fpOf(internal.id);
    await waitFor(() => groupOf(fp), { label: 'group' });
    expect((await groupOf(fp)).last_alerted_at).toBeNull();

    await send(newVisit(), [clientError('review fix internal first 2')]);
    await waitFor(async () => (await groupOf(fp)).last_alerted_at, { label: 'alerted' });
    await waitFor(async () => (await newErrorMails('review fix internal first')).length === 1, { label: 'one email' });
  });

  it('a Fixed error seen again from an older version (an old tab) stays Fixed', async () => {
    const first = newVisit('0.15.17');
    await send(first, [clientError('review fix stale tab 1', '0.15.17')]);
    const fp = await fpOf(first.id);
    await waitFor(() => groupOf(fp), { label: 'group' });
    await sql(`UPDATE error_group SET status = 'fixed', fixed_in_version = '0.15.18' WHERE fingerprint = $1`, [fp]);

    const stale = newVisit('0.15.17');
    await send(stale, [clientError('review fix stale tab 2', '0.15.17')]);
    await waitFor(async () => (await eventsOf(stale.id)).length === 1, { label: 'stale event' });
    await new Promise((r) => setTimeout(r, 300));
    expect((await groupOf(fp)).status).toBe('fixed');

    await send(newVisit('0.15.18'), [clientError('review fix stale tab 3', '0.15.18')]);
    await waitFor(async () => (await groupOf(fp)).status === 'new', { label: 'reopened on the fixed version' });
  });
});

describe('fingerprints', () => {
  it('a non-error event can\'t carry a fingerprint into the error counts', async () => {
    const visit = newVisit();
    await send(visit, [clientError('review fix forged target')]);
    const fp = await fpOf(visit.id);
    await waitFor(() => groupOf(fp), { label: 'group' });
    const before = (await api().get('/api/admin/site-health/errors').set(A).query({ range: '7', tz: 'UTC' })).body.find(
      (g) => g.fingerprint === fp
    ).count;

    const forger = newVisit();
    await send(forger, [{ id: randomUUID(), type: 'page_view', path: '/', meta: { fingerprint: fp } }]);
    const [row] = await waitFor(async () => {
      const rows = await eventsOf(forger.id);
      return rows.length && rows;
    }, { label: 'forged event' });
    expect(row.meta).not.toHaveProperty('fingerprint');
    const after = (await api().get('/api/admin/site-health/errors').set(A).query({ range: '7', tz: 'UTC' })).body.find(
      (g) => g.fingerprint === fp
    ).count;
    expect(after).toBe(before);
  });
});

describe('malformed event values', () => {
  it("can't break the admin panels", async () => {
    const visit = newVisit();
    const ev = (type, meta, targetId = '1') => ({ id: randomUUID(), type, path: '/photos', targetId, meta });
    await send(visit, [
      ev('album_close', { open_id: 'x', engaged_ms: 'lots', photos_viewed: 2.5 }),
      ev('page_leave', { view_id: 'v', engaged_ms: 'x', max_scroll_pct: '90%' }),
      ev('rock_search', { page: 'map', input: 'highlight', found: 'maybe' }, '7'),
      ev('song_stop', { play_id: 'p', listened_ms: {}, duration_ms: 'long', completed: 'yes' }),
      ev('photo_view', { is_video: 'no', engaged_ms: [] }),
      ev('slow_request', { method: 'GET', duration_ms: 'slow' }, '/api/x'),
      ev('page_perf', { lcp_ms: 'fast', load_ms: null, ttfb_ms: true }, null),
      ev('rock_close', { open_id: 'r', engaged_ms: 'z' }, '7'),
    ]);
    await waitFor(async () => (await eventsOf(visit.id)).length === 8, { label: 'bad events stored' });

    const q = { range: '7', tz: 'UTC' };
    for (const panel of ['visitors', 'activity', 'forms', 'albums', 'searches', 'journeys', 'music', 'outbound', 'scroll', 'top']) {
      expect((await api().get(`/api/admin/activity/${panel}`).set(A).query(q)).status, panel).toBe(200);
    }
    for (const panel of ['errors', 'slow', 'speed']) {
      expect((await api().get(`/api/admin/site-health/${panel}`).set(A).query(q)).status, panel).toBe(200);
    }
  });
});

describe('server error recording', () => {
  const app = express();
  app.use(errorCapture);
  // Like an email-sending route: sendEmail already recorded the failure,
  // then the route logs it and answers 500.
  app.post('/api/mail-route', (req, res) => {
    const err = new Error('smtp down for review test');
    recordServerError(err, { kind: 'email' });
    console.error('Mail route failed:', err);
    res.status(500).json({ error: 'Something broke' });
  });

  it('a failure already recorded (e.g. an email send) is not recorded again as the 500', async () => {
    await supertest(app).post('/api/mail-route').set('User-Agent', CHROME).expect(500);
    await new Promise((r) => setTimeout(r, 400));
    const rows = await sql(`SELECT kind FROM server_error WHERE message = 'smtp down for review test'`);
    expect(rows.map((r) => r.kind)).toEqual(['email']);
  });

  it('an oversized beacon is a 413, not a recorded server error', async () => {
    const before = (await sql('SELECT COUNT(*)::int AS n FROM server_error'))[0].n;
    const res = await api()
      .post('/api/activity')
      .set('User-Agent', CHROME)
      .set('Content-Type', 'text/plain')
      .send('x'.repeat(250 * 1024));
    expect(res.status).toBe(413);
    await new Promise((r) => setTimeout(r, 300));
    expect((await sql('SELECT COUNT(*)::int AS n FROM server_error'))[0].n).toBe(before);
  });
});

describe('the Dashboard\'s new-errors count', () => {
  it('leaves out error kinds only ever seen on internal traffic', async () => {
    const before = (await api().get('/api/admin/activity/glance').set(A).query({ tz: 'UTC' })).body.new_errors;
    const internal = newVisit();
    await send(internal, [clientError('review fix internal only kind')], {});
    const fp = await fpOf(internal.id);
    await waitFor(() => groupOf(fp), { label: 'group' });
    expect((await groupOf(fp)).status).toBe('new');
    const after = (await api().get('/api/admin/activity/glance').set(A).query({ tz: 'UTC' })).body.new_errors;
    expect(after).toBe(before);
  });
});

describe('stack resolution', () => {
  it('rejects a version that could leave the source map folder', async () => {
    const stack = 'Error: x\n    at a (https://site/assets/index-abc.js:1:2)';
    expect(await resolveStack(stack, '..')).toBe(stack);
    expect(await resolveStack(stack, '../..')).toBe(stack);
  });
});
