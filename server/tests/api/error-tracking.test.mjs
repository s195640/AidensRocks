// Error tracking (Site Tracking phase 2): grouping, new / fixed -> new,
// alert emails and their throttle, server 5xx capture, the Site Health
// admin endpoints and the daily summary.
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import express from 'express';
import supertest from 'supertest';
import { require, api, bearer, sql, waitFor } from '../helpers/server.mjs';
import { clearMail, listMail, waitForMail } from '../helpers/mailpit.mjs';

const { errorCapture } = require('../../src/middleware/errorCapture');
const { runDailySummary } = require('../../src/utils/scheduledJobs');
const { errorCategory } = require('../../src/utils/errors/errorCategory');

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const ALERTS_TO = 'failures@aidensrocks.com'; // the templates' seeded Send To
// A real visitor on the live site (not internal), so alerts are sent.
const LIVE = { 'X-Forwarded-For': '8.8.8.8', Origin: 'http://localhost:4174' };

const newVisit = () => ({ id: randomUUID(), deviceId: randomUUID(), landingPath: '/', clientVersion: '0.15.12' });
const send = (visit, events, headers = LIVE) =>
  api().post('/api/activity').set('User-Agent', CHROME).set(headers).send({ visit, events });

const clientError = (message, extra = {}, version = '0.15.12') => ({
  id: randomUUID(),
  type: 'client_error',
  path: '/map',
  meta: { message, stack: `TypeError: ${message}\n    at Ab (http://localhost:4174/assets/index-AbCd1234.js:1:4821)`, app_version: version, fingerprint: 'forged' },
  ...extra,
});
// A version after any "fixed in" version: the error really came back after
// the fix (an older version stays Fixed -- tracking-review-fixes.test.mjs).
const AFTER_FIX = '99.0.0';

const fingerprintsOf = async (visitId) =>
  (await sql(`SELECT meta->>'fingerprint' AS fp FROM site_event WHERE visit_id = $1 ORDER BY created_at`, [visitId])).map((r) => r.fp);
const groupOf = async (fp) => (await sql('SELECT * FROM error_group WHERE fingerprint = $1', [fp]))[0];

let A;
beforeAll(async () => {
  A = await bearer('admin');
});

describe('grouping and alerts', () => {
  let fp;

  it('the same error with different numbers is one group; the browser fingerprint is ignored', async () => {
    await clearMail();
    const visit = newVisit();
    await send(visit, [clientError("Cannot read properties of undefined (reading 'x') at row 12"), clientError("Cannot read properties of undefined (reading 'y') at row 99")]);
    const fps = await waitFor(async () => {
      const rows = await fingerprintsOf(visit.id);
      return rows.length === 2 && rows;
    }, { label: 'two error events' });
    expect(fps[0]).toBe(fps[1]);
    expect(fps[0]).not.toBe('forged');
    fp = fps[0];
    const group = await waitFor(() => groupOf(fp), { label: 'error_group row' });
    expect(group).toMatchObject({ source: 'client', type: 'client_error', status: 'new' });
  });

  it('a new error emails the family once', async () => {
    const mail = await waitForMail(ALERTS_TO, { subject: /New error on the site/ });
    expect(mail.HTML).toContain('Cannot read properties of undefined');
    expect(mail.HTML).toContain('/admin');
    expect((await listMail(ALERTS_TO)).filter((m) => /New error on the site/.test(m.Subject))).toHaveLength(1);
  });

  it('fixed then seen again goes back to new, but within 24 hours sends no second email', async () => {
    const before = await groupOf(fp);
    expect((await api().put(`/api/admin/site-health/errors/${fp}`).set(A).send({ status: 'fixed', note: 'patched' })).status).toBe(200);
    expect(await groupOf(fp)).toMatchObject({ status: 'fixed', note: 'patched' });
    expect((await groupOf(fp)).fixed_in_version).toBeTruthy();

    await send(newVisit(), [clientError("Cannot read properties of undefined (reading 'z') at row 3", {}, AFTER_FIX)]);
    await waitFor(async () => (await groupOf(fp)).status === 'new', { label: 'reopened' });
    expect((await groupOf(fp)).last_alerted_at).toEqual(before.last_alerted_at);
  });

  it('after 24 hours a reopened error alerts again', async () => {
    await clearMail();
    await sql(`UPDATE error_group SET status = 'fixed', last_alerted_at = NOW() - INTERVAL '25 hours' WHERE fingerprint = $1`, [fp]);
    await send(newVisit(), [clientError("Cannot read properties of undefined (reading 'q') at row 4", {}, AFTER_FIX)]);
    await waitForMail(ALERTS_TO, { subject: /New error on the site/ });
  });

  it('internal traffic is grouped but never alerts', async () => {
    const visit = newVisit();
    await send(visit, [clientError('only on the dev site 123')], {}); // loopback = internal
    const [ifp] = await waitFor(async () => {
      const rows = await fingerprintsOf(visit.id);
      return rows.length && rows;
    }, { label: 'internal error event' });
    const group = await waitFor(() => groupOf(ifp), { label: 'internal group' });
    expect(group.last_alerted_at).toBeNull();
  });

  it('groups each kind of browser error sensibly', async () => {
    const visit = newVisit();
    const ev = (type, targetId, meta) => ({ id: randomUUID(), type, path: '/photos', targetId, meta });
    await send(visit, [
      ev('media_error', '/media/albums/Trip/webp/IMG_1.webp', { kind: 'image' }),
      ev('media_error', '/media/albums/Trip/webp/IMG_2.webp', { kind: 'image' }),
      ev('load_error', '/api/rock-posts/101', { method: 'GET', status: 500 }),
      ev('load_error', '/api/rock-posts/102', { method: 'GET', status: 500 }),
      ev('error_shown', 'allrocks_load', { message: "The rocks couldn't be loaded right now." }),
    ]);
    const fps = await waitFor(async () => {
      const rows = await fingerprintsOf(visit.id);
      return rows.length === 5 && rows;
    }, { label: 'five events' });
    expect(new Set(fps).size).toBe(3);
    const titles = (await sql('SELECT title FROM error_group WHERE fingerprint = ANY($1)', [fps])).map((r) => r.title).sort();
    expect(titles).toEqual([
      'Broken image: /media/albums/Trip/webp/*',
      'GET /api/rock-posts/:n failed (500)',
      "Shown to visitor (allrocks_load): The rocks couldn't be loaded right now.",
    ]);
  });
});

describe('server errors', () => {
  // A tiny app with the real capture middleware and a route that fails the
  // way the real handlers do: console.error the error, then send a 500.
  const failing = express();
  failing.use(errorCapture);
  failing.get('/api/boom/:id', (req, res) => {
    console.error('Boom handler failed:', new Error(`database exploded on ${req.params.id}`));
    res.status(500).json({ error: 'Something broke' });
  });

  it('records a 5xx with the logged error, its route pattern and the visit', async () => {
    const visitId = randomUUID();
    await supertest(failing).get('/api/boom/77').set('X-Visit-Id', visitId).set('User-Agent', CHROME).expect(500);
    const [row] = await waitFor(
      () => sql(`SELECT * FROM server_error WHERE visit_id = $1`, [visitId]).then((r) => r.length && r),
      { label: 'server_error row' }
    );
    expect(row).toMatchObject({ kind: 'request', method: 'GET', route: '/api/boom/:id', status: 500, message: 'database exploded on 77' });
    expect(row.stack).toContain('database exploded');
    const group = await waitFor(() => groupOf(row.fingerprint), { label: 'server group' });
    expect(group).toMatchObject({ source: 'server', type: 'server_request' });
  });

  it('a successful request records nothing', async () => {
    const before = (await sql('SELECT COUNT(*)::int AS n FROM server_error'))[0].n;
    await api().get('/health').expect(200);
    await new Promise((r) => setTimeout(r, 200));
    expect((await sql('SELECT COUNT(*)::int AS n FROM server_error'))[0].n).toBe(before);
  });
});

describe('Site Health endpoints', () => {
  const q = { range: '7', tz: 'UTC', includeInternal: '1' };

  it('lists groups with counts, visitors, pages and platforms', async () => {
    const { status, body } = await api().get('/api/admin/site-health/errors').set(A).query(q);
    expect(status).toBe(200);
    const group = body.find((g) => g.type === 'client_error' && /Cannot read properties/.test(g.title));
    expect(group.count).toBeGreaterThanOrEqual(4);
    expect(group.visitors).toBeGreaterThanOrEqual(3);
    expect(group.pages).toContain('/map');
    expect(group.platforms).toContain('Windows');
    expect(group.versions).toContain('0.15.12');
    expect(group.category).toBe('Script error');
  });

  it('gives each group a short category', () => {
    const cat = (type, title) => errorCategory({ type, title });
    expect(cat('load_error', 'GET /api/albums/ failed (network error)')).toBe('Connection drop');
    expect(cat('load_error', 'POST /api/rock-count failed (500)')).toBe('Server error');
    expect(cat('load_error', 'POST /api/auth/login failed (429)')).toBe('Rate limited');
    expect(cat('error_shown', 'Shown to visitor (signin): Email or password is incorrect.')).toBe('Sign-in failed');
    expect(cat('error_shown', 'Shown to visitor (upload_submit): Sorry, something went wrong.')).toBe('Upload failed');
    expect(cat('error_shown', "Shown to visitor (albums_load): The photo albums couldn't be loaded right now.")).toBe("Couldn't load");
    expect(cat('error_shown', 'Shown to visitor (something_new): Hi')).toBe('Message shown');
    expect(cat('render_crash', 'Page crashed: boom')).toBe('Page crash');
    expect(cat('server_request', 'GET / → 500: column x does not exist')).toBe('Server error');
    expect(cat('server_email', 'Email failed: timeout')).toBe('Email failed');
  });

  it('internal errors are hidden unless asked for', async () => {
    const { body } = await api().get('/api/admin/site-health/errors').set(A).query({ range: '7', tz: 'UTC' });
    expect(body.some((g) => /only on the dev site/.test(g.title))).toBe(false);
  });

  it('shows an error with its occurrences and the visitor trail', async () => {
    const visit = newVisit();
    await send(visit, [{ id: randomUUID(), type: 'page_view', path: '/' }]);
    await new Promise((r) => setTimeout(r, 300));
    await send(visit, [clientError('trail test error 5')]);
    const [fp] = await waitFor(async () => {
      const rows = (await fingerprintsOf(visit.id)).filter(Boolean);
      return rows.length && rows;
    }, { label: 'trail error' });
    await waitFor(() => groupOf(fp), { label: 'trail group' });

    const { status, body } = await api().get(`/api/admin/site-health/errors/${fp}`).set(A).query(q);
    expect(status).toBe(200);
    expect(body.group.fingerprint).toBe(fp);
    const occ = body.occurrences.find((o) => o.visit_id === visit.id);
    expect(occ).toMatchObject({ source: 'client', page: '/map', platform: 'Windows', version: '0.15.12' });
    expect(occ.message).toContain('trail test error');
    expect(occ.stack).toContain('index-AbCd1234.js');
    expect(occ.trail.map((t) => t.type)).toEqual(['page_view']);
  });

  it('rejects a bad status, an unknown group and a bad range', async () => {
    expect((await api().put('/api/admin/site-health/errors/nope').set(A).send({ status: 'gone' })).status).toBe(400);
    expect((await api().put('/api/admin/site-health/errors/nope').set(A).send({ status: 'known' })).status).toBe(404);
    expect((await api().get('/api/admin/site-health/errors').set(A).query({ range: '14' })).status).toBe(400);
  });

  it('reports slow requests and page speed by platform', async () => {
    const visit = newVisit();
    await send(visit, [
      { id: randomUUID(), type: 'slow_request', path: '/map', targetId: '/api/rock-posts/locations/all', meta: { method: 'GET', status: 200, duration_ms: 12500 } },
      { id: randomUUID(), type: 'page_perf', path: '/', meta: { ttfb_ms: 120, dom_ready_ms: 800, load_ms: 1500, lcp_ms: 1900 } },
    ]);
    await waitFor(async () => (await fingerprintsOf(visit.id)).length === 2, { label: 'perf events' });

    const slow = (await api().get('/api/admin/site-health/slow').set(A).query(q)).body;
    expect(slow.find((s) => s.path === '/api/rock-posts/locations/all')).toMatchObject({ method: 'GET', count: 1, max_ms: 12500 });
    const speed = (await api().get('/api/admin/site-health/speed').set(A).query(q)).body;
    expect(speed.find((s) => s.platform === 'Windows')).toMatchObject({ lcp_median: 1900, load_median: 1500 });
  });
});

describe('daily summary', () => {
  it('sends once a day, after the hour, listing the day’s errors', async () => {
    await clearMail();
    await sql(`DELETE FROM setting WHERE name = 'error-summary-last-run'`);
    process.env.DAILY_SUMMARY_HOUR = '0';
    try {
      expect(await runDailySummary()).toBe('sent');
      const mail = await waitForMail(ALERTS_TO, { subject: /Site errors in the last 24 hours/ });
      expect(mail.HTML).toContain('Cannot read properties of undefined');
      expect(mail.HTML).not.toContain('only on the dev site'); // internal left out
      expect(await runDailySummary()).toBe('already');
    } finally {
      delete process.env.DAILY_SUMMARY_HOUR;
    }
  });

  it('waits until the hour', async () => {
    await sql(`DELETE FROM setting WHERE name = 'error-summary-last-run'`);
    process.env.DAILY_SUMMARY_HOUR = '24';
    try {
      expect(await runDailySummary()).toBe('not-yet');
    } finally {
      delete process.env.DAILY_SUMMARY_HOUR;
    }
  });
});
