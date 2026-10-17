// Admin → Activity page endpoints (Site Tracking phase 4). One realistic
// visit is sent through the real POST /api/activity, then each panel is
// checked for it. Values are unique to this file (rock 8181, form opens,
// song 1 ...), so other suites' events don't change the assertions.
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { api, bearer, sql, waitFor } from '../helpers/server.mjs';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const LIVE = { 'X-Forwarded-For': '8.8.4.4', Origin: 'http://localhost:4174' };
const Q = { range: '7', tz: 'UTC' };

const visit = {
  id: randomUUID(),
  deviceId: randomUUID(),
  landingPath: '/photos',
  referrer: 'https://www.facebook.com/groups/x',
  clientVersion: '0.15.16',
  isReturning: true,
};
const ev = (type, extra = {}) => ({ id: randomUUID(), type, path: '/photos', ...extra });
const formOpen = randomUUID();
const abandonedOpen = randomUUID();
const playId = randomUUID();
const albumOpen = randomUUID();
const rockOpen = randomUUID();
const viewId = randomUUID();

let A;
const get = (panel, query = Q) => api().get(`/api/admin/activity/${panel}`).set(A).query(query);

beforeAll(async () => {
  A = await bearer('admin');
  const events = [
    ev('page_view', { meta: { view_id: viewId } }),
    ev('page_leave', { meta: { view_id: viewId, engaged_ms: 4000, max_scroll_pct: 60 } }),
    ev('page_leave', { meta: { view_id: viewId, engaged_ms: 2000, max_scroll_pct: 95 } }),
    ev('song_play', { targetId: '1', meta: { play_id: playId } }),
    ev('song_stop', { targetId: '1', meta: { play_id: playId, listened_ms: 30000, duration_ms: 60000, completed: false, reason: 'skip' } }),
    ev('entry_view', { targetId: 'activity-test-entry' }),
    ev('qr_scan', { targetId: '8181' }),
    ev('not_found', { meta: { full_url: '/nope' } }),
    ev('album_open', { targetId: '1', meta: { open_id: albumOpen, album_name: 'visible-album', page: 'photos' } }),
    ev('photo_view', { targetId: '1', meta: { open_id: albumOpen, album_id: 1, engaged_ms: 1500, is_video: false } }),
    ev('album_close', { targetId: '1', meta: { open_id: albumOpen, engaged_ms: 9000, photos_viewed: 1 } }),
    ev('rock_search', { targetId: '8181', meta: { page: 'map', input: 'highlight', found: false } }),
    ev('rock_link', { targetId: '8181', meta: { found: false, from: 'email-follow' } }),
    ev('rock_view', { targetId: '8181', meta: { open_id: rockOpen, source: 'link' } }),
    ev('journey_location', { targetId: '8181', meta: { open_id: rockOpen, rps_key: 1 } }),
    ev('rock_close', { targetId: '8181', meta: { open_id: rockOpen, engaged_ms: 7000 } }),
    ev('form_open', { targetId: 'request_a_rock', meta: { open_id: formOpen, source: 'floating_button' } }),
    ev('form_start', { targetId: 'request_a_rock', meta: { open_id: formOpen } }),
    ev('form_error', { targetId: 'request_a_rock', meta: { open_id: formOpen, reason: 'validation:email' } }),
    ev('form_submit', { targetId: 'request_a_rock', meta: { open_id: formOpen } }),
    ev('form_open', { targetId: 'request_a_rock', meta: { open_id: abandonedOpen, source: 'floating_button' } }),
    ev('form_close', { targetId: 'request_a_rock', meta: { open_id: abandonedOpen, started: false } }),
    ev('outbound_click', { targetId: 'facebook.com', meta: { where: 'footer' } }),
    ev('contact_open'),
    ev('follow', { targetId: '8181', meta: { where: 'my_rocks' } }),
  ];
  const res = await api().post('/api/activity').set('User-Agent', CHROME).set(LIVE).send({ visit, events });
  expect(res.status).toBe(204);
  await waitFor(
    async () => (await sql('SELECT COUNT(*)::int AS n FROM site_event WHERE visit_id = $1', [visit.id]))[0].n === events.length,
    { label: 'seeded events' }
  );
});

describe('Activity page panels', () => {
  it('visitors: per day and totals, with visit length and on-screen time', async () => {
    const { status, body } = await get('visitors');
    expect(status).toBe(200);
    expect(body.days).toHaveLength(7);
    const today = body.days.at(-1);
    expect(today.visitors).toBeGreaterThanOrEqual(1);
    expect(today.page_views).toBeGreaterThanOrEqual(1);
    expect(body.totals.returning_visits).toBeGreaterThanOrEqual(1);
    expect(body.totals.avg_engaged_ms).toBeGreaterThan(0);
    expect(body.platforms.map((p) => p.platform)).toContain('Windows');
    // Per day by device, for the "By Device" chart; days with nothing are {}.
    expect(today.platforms.Windows.visitors).toBeGreaterThanOrEqual(1);
    expect(today.platforms.Windows.visits).toBeGreaterThanOrEqual(1);
    expect(body.days[0].platforms).toEqual({});
  });

  it('activity by day: song plays, entry views, QR scans and bad links', async () => {
    const { body } = await get('activity');
    const today = body.days.at(-1);
    for (const t of ['song_play', 'entry_view', 'qr_scan', 'not_found']) {
      expect(today[t]).toBeGreaterThanOrEqual(1);
      expect(body.totals[t]).toBeGreaterThanOrEqual(1);
    }
  });

  it('forms: opened, started, submitted and abandoned per form, by source, with reasons', async () => {
    const { body } = await get('forms');
    const req = body.forms.find((f) => f.form === 'request_a_rock');
    expect(req.opened).toBeGreaterThanOrEqual(2);
    expect(req.submitted).toBeGreaterThanOrEqual(1);
    expect(req.abandoned).toBeGreaterThanOrEqual(1);
    expect(req.started).toBeGreaterThanOrEqual(1);
    expect(body.days.at(-1).submitted).toBeGreaterThanOrEqual(1);
    expect(body.sources.find((s) => s.form === 'request_a_rock' && s.source === 'floating_button').opened).toBeGreaterThanOrEqual(2);
    expect(body.errors.find((e) => e.reason === 'validation:email').count).toBeGreaterThanOrEqual(1);
  });

  it('albums: opens, time and photos, with album and photo names', async () => {
    const { body } = await get('albums');
    const album = body.albums.find((a) => a.album_id === '1');
    expect(album).toMatchObject({ display_name: 'Visible Album' });
    expect(album.opens).toBeGreaterThanOrEqual(1);
    expect(album.avg_ms).toBeGreaterThan(0);
    expect(album.photos_opened).toBeGreaterThanOrEqual(1);
    expect(body.photos.find((p) => p.photo_id === '1')).toMatchObject({ display_name: 'Shown photo', album: 'Visible Album' });
  });

  it('searches: by rock, with the way it was searched, links from email, and not-found', async () => {
    const { body } = await get('searches');
    expect(body.rocks.find((r) => r.rock === '8181')).toMatchObject({
      searches: 1, from_map_box: 1, links: 1, email_links: 1, found: false,
    });
    const nf = body.notFound.find((r) => r.rock === '8181');
    expect(nf.count).toBe(2);
    expect(nf.ways.sort()).toEqual(['highlight', 'link']);
  });

  it('journeys: opens, time and what was opened inside, by source', async () => {
    const { body } = await get('journeys');
    expect(body.find((r) => r.rock === '8181')).toMatchObject({
      opens: 1, visitors: 1, avg_ms: 7000, locations: 1, from_link: 1,
    });
  });

  it('music: plays, listen-through, finished and skips, with the song name', async () => {
    const { body } = await get('music');
    const song = body.find((s) => s.m_key === '1');
    expect(song.name).toBe('Visible Song');
    expect(song.plays).toBeGreaterThanOrEqual(1);
    expect(song.skips).toBeGreaterThanOrEqual(1);
    expect(song.listen_through_pct).toBeGreaterThan(0);
  });

  it('outbound links and contact opens', async () => {
    const { body } = await get('outbound');
    expect(body.links.find((l) => l.target === 'facebook.com').places).toContain('footer');
    expect(body.contact.opens).toBeGreaterThanOrEqual(1);
  });

  it('scroll depth combines a page view\'s several leaves', async () => {
    const { body } = await get('scroll', { ...Q, includeInternal: '0' });
    const photos = body.find((p) => p.path === '/photos');
    expect(photos.views).toBeGreaterThanOrEqual(1);
    expect(photos.avg_engaged_ms).toBeGreaterThan(0);
  });

  it('top lists: pages, entries, QR scans, follows and referrers', async () => {
    const { body } = await get('top');
    expect(body.pages.map((p) => p.path)).toContain('/photos');
    expect(body.entries.map((e) => e.slug)).toContain('activity-test-entry');
    expect(body.qr.find((r) => r.rock === '8181').scans).toBe(1);
    expect(body.follows.find((r) => r.rock === '8181').follows).toBe(1);
    expect(body.referrers.map((r) => r.source)).toContain('facebook.com');
  });

  it('rocks created: per day and per artist, a two-artist rock counting for each', async () => {
    // A rock dated 3 days ago (UTC), by Ashley and Grandpa Joe, and one with no artist.
    const [{ day }] = await sql(`SELECT to_char((NOW() - INTERVAL '3 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day`);
    const [{ rc_key: both }] = await sql(
      `INSERT INTO catalog (rock_number, create_dt) VALUES (8191, NOW() - INTERVAL '3 days') RETURNING rc_key`);
    await sql('INSERT INTO artist_link (ra_key, rc_key) VALUES (1, $1), (2, $1)', [both]);
    await sql(`INSERT INTO catalog (rock_number, create_dt) VALUES (8192, NOW() - INTERVAL '3 days')`);
    // Outside the 7-day range: not counted.
    await sql(`INSERT INTO catalog (rock_number, create_dt) VALUES (8193, NOW() - INTERVAL '30 days')`);

    const { body, status } = await get('rocks');
    expect(status).toBe(200);
    expect(body.days).toHaveLength(7); // the last 7 days, today included
    const d = body.days.find((x) => x.date === day);
    expect(d).toEqual({ date: day, rocks: 2, artists: { Ashley: 1, 'Grandpa Joe': 1, '': 1 } });
    expect(body.totals.rocks).toBe(body.days.reduce((s, x) => s + x.rocks, 0));
    expect(body.artists.map((a) => a.artist)).toEqual(expect.arrayContaining(['Ashley', 'Grandpa Joe', null]));

    const all = (await get('rocks', { range: 'all', tz: 'UTC' })).body;
    expect(all.totals.rocks).toBeGreaterThan(body.totals.rocks);
  });

  it("today at a glance, and filters that leave this visit out", async () => {
    const glance = (await api().get('/api/admin/activity/glance').set(A).query({ tz: 'UTC' })).body;
    expect(glance.visitors).toBeGreaterThanOrEqual(1);
    expect(glance).toHaveProperty('new_errors');

    // The same panel from a range that starts tomorrow-ish: nothing from today.
    const bad = await get('visitors', { range: '14', tz: 'UTC' });
    expect(bad.status).toBe(400);
  });
});
