// POST /api/activity (Site Tracking phase 1): batches of visit + events from
// the browser. It answers 204 before inserting, so assertions wait for rows.
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { api, bearer, sql, waitFor } from '../helpers/server.mjs';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

const newVisit = (extra = {}) => ({
  id: randomUUID(),
  deviceId: randomUUID(),
  landingPath: '/map',
  referrer: 'https://www.google.com/',
  screen: '390x844',
  language: 'en-US',
  timezone: 'America/New_York',
  clientVersion: '0.15.10',
  isReturning: false,
  ...extra,
});
const event = (type, extra = {}) => ({ id: randomUUID(), type, path: '/map', ...extra });

const send = (body, { ua = CHROME, headers = {} } = {}) =>
  api().post('/api/activity').set('User-Agent', ua).set(headers).send(body);

const eventsOf = (visitId) => sql('SELECT * FROM site_event WHERE visit_id = $1 ORDER BY type', [visitId]);
const visitRow = async (id) => (await sql('SELECT * FROM visit WHERE id = $1', [id]))[0];
const waitForEvents = (visitId, n) =>
  waitFor(async () => {
    const rows = await eventsOf(visitId);
    return rows.length >= n && rows;
  }, { label: `${n} events for ${visitId}` });

describe('activity ingest', () => {
  it('stores the visit once and each event, with server-side platform, IP and flags', async () => {
    const visit = newVisit();
    const res = await send({ visit, events: [event('page_view'), event('outbound_click', { targetId: 'facebook.com', meta: { where: 'footer' } })] }, { ua: IPHONE });
    expect(res.status).toBe(204);

    const rows = await waitForEvents(visit.id, 2);
    expect(rows.map((r) => r.type)).toEqual(['outbound_click', 'page_view']);
    expect(rows[0]).toMatchObject({ device_id: visit.deviceId, target_id: 'facebook.com', meta: { where: 'footer' }, is_admin: false, account_id: null });

    const v = await visitRow(visit.id);
    expect(v).toMatchObject({ platform: 'iPhone', landing_path: '/map', screen: '390x844', client_version: '0.15.10', is_internal: true });
    expect(v.ip_address).toMatch(/127\.0\.0\.1|::1/);
  });

  it('a resent batch adds nothing, and later batches reuse the visit', async () => {
    const visit = newVisit();
    const batch = { visit, events: [event('page_view')] };
    await send(batch);
    await waitForEvents(visit.id, 1);
    await send(batch);
    await send({ visit: { ...visit, landingPath: '/other' }, events: [event('page_leave', { meta: { engaged_ms: 1200, max_scroll_pct: 80 } })] });
    await waitForEvents(visit.id, 2);
    expect(await eventsOf(visit.id)).toHaveLength(2);
    expect((await visitRow(visit.id)).landing_path).toBe('/map');
  });

  it('flags admins from their token, never from the body', async () => {
    const admin = newVisit();
    await send({ visit: admin, events: [event('page_view', { isAdmin: false })] }, { headers: await bearer('admin') });
    const [row] = await waitForEvents(admin.id, 1);
    expect(row.is_admin).toBe(true);
    expect(row.account_id).not.toBeNull();

    const user = newVisit();
    await send({ visit: user, events: [event('page_view')] }, { headers: await bearer('user') });
    const [userRow] = await waitForEvents(user.id, 1);
    expect(userRow.is_admin).toBe(false);
    expect(userRow.account_id).not.toBeNull();
  });

  it('a public IP on the real site is not internal and gets a location; the dev site is internal', async () => {
    const live = newVisit();
    await send({ visit: live, events: [event('page_view')] }, { headers: { 'X-Forwarded-For': '8.8.8.8', Origin: 'http://localhost:4174' } });
    await waitForEvents(live.id, 1);
    const v = await visitRow(live.id);
    expect(v.is_internal).toBe(false);
    expect(v.ip_address).toBe('8.8.8.8');
    expect(v.geo.country).toBe('US');

    const dev = newVisit();
    await send({ visit: dev, events: [event('page_view')] }, { headers: { 'X-Forwarded-For': '8.8.8.8', Origin: 'http://dev.example.org' } });
    await waitForEvents(dev.id, 1);
    expect((await visitRow(dev.id)).is_internal).toBe(true);
  });

  it('drops unknown types and replaces oversized meta, keeping the rest of the batch', async () => {
    const visit = newVisit();
    await send({
      visit,
      events: [
        event('page_view'),
        event('not_a_type'),
        { type: 'page_view' }, // no id
        event('client_error', { meta: { stack: 'x'.repeat(5000) } }),
      ],
    });
    const rows = await waitForEvents(visit.id, 2);
    await new Promise((r) => setTimeout(r, 200));
    expect((await eventsOf(visit.id)).map((r) => r.type)).toEqual(['client_error', 'page_view']);
    // Oversized meta is replaced; error events still get their group fingerprint.
    expect(rows.find((r) => r.type === 'client_error').meta).toEqual({ truncated: true, fingerprint: expect.any(String) });
  });

  it('accepts every event type the site sends', async () => {
    const types = [
      'page_view', 'page_leave', 'page_perf', 'outbound_click', 'contact_open', 'qr_scan', 'not_found',
      'slow_request', 'player_close', 'song_play', 'song_stop', 'entry_view', 'rock_view', 'rock_close',
      'journey_location', 'journey_comment', 'journey_photo_view', 'map_pin', 'rock_search', 'rock_link',
      'album_open', 'album_close', 'photo_view', 'form_open', 'form_start', 'form_submit', 'form_error',
      'form_close', 'follow', 'unfollow', 'follow_notify', 'my_rocks_search', 'sign_up', 'sign_in', 'sign_out',
    ];
    const visit = newVisit();
    await send({ visit, events: types.map((t) => event(t)) });
    const rows = await waitForEvents(visit.id, types.length);
    expect(rows.map((r) => r.type).sort()).toEqual([...types].sort());
  });

  it('accepts a page-exit beacon: text/plain JSON with the token in the body', async () => {
    const visit = newVisit();
    const { body: login } = await api().post('/api/auth/login').send({ email: 'admin@example.com', password: 'Test-Passw0rd!' });
    const res = await api()
      .post('/api/activity')
      .set('User-Agent', CHROME)
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify({ visit, events: [event('page_leave', { meta: { engaged_ms: 5 } })], auth: login.token }));
    expect(res.status).toBe(204);
    const [row] = await waitForEvents(visit.id, 1);
    expect(row).toMatchObject({ type: 'page_leave', is_admin: true });
    expect(row.meta).not.toHaveProperty('auth');

    const bad = await api().post('/api/activity').set('User-Agent', CHROME).set('Content-Type', 'text/plain').send('not json');
    expect(bad.status).toBe(400);
  });

  it('answers bots with 204 and stores nothing', async () => {
    const visit = newVisit();
    expect((await send({ visit, events: [event('page_view')] }, { ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)' })).status).toBe(204);
    expect((await send({ visit, events: [event('page_view')] }, { ua: '' })).status).toBe(204);
    await new Promise((r) => setTimeout(r, 300));
    expect(await visitRow(visit.id)).toBeUndefined();
  });

  it('rejects malformed or oversized batches', async () => {
    expect((await send({})).status).toBe(400);
    expect((await send({ visit: { id: 'nope', deviceId: randomUUID() }, events: [] })).status).toBe(400);
    expect((await send({ visit: newVisit(), events: 'x' })).status).toBe(400);
    const many = Array.from({ length: 51 }, () => event('page_view'));
    expect((await send({ visit: newVisit(), events: many })).status).toBe(413);
  });
});
