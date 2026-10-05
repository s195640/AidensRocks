// What the public site can read. Seed rows (tests/fixtures/seed.sql) cover
// hidden content, a stop with no visible image, null coordinates and an
// artist with no relation.
import { describe, it, expect } from 'vitest';
import { api, bearer } from '../helpers/server.mjs';

describe('rock posts [C3 C-pin S20]', () => {
  it('lists only public stops, newest first, and the count matches what can be paged', async () => {
    const res = await api().get('/api/rock-posts').query({ page: 1, pageSize: 25 });
    expect(res.status).toBe(200);
    const rocks = new Set(res.body.rows.map((r) => r.rock_number));
    expect([...rocks].sort()).toEqual([101, 102]); // 103 hidden, 104 has no visible image
    expect(res.body.totalRocks).toBe(rocks.size);

    const rock101 = res.body.rows.filter((r) => r.rock_number === 101).map((r) => r.date);
    expect(rock101).toEqual(['08/01/2025', '06/01/2025']);
  });

  it('a page past the end is empty, not an error', async () => {
    const res = await api().get('/api/rock-posts').query({ page: 5, pageSize: 25 });
    expect(res.body.rows).toEqual([]);
  });

  it('an artist with no relation keeps their name', async () => {
    const res = await api().get('/api/rock-posts/102');
    expect(res.body[0].artists).toEqual(['Grandpa Joe']);
    const r101 = await api().get('/api/rock-posts/101');
    expect(r101.body[0].artists).toEqual(['Ashley (Mom)']);
  });

  it('a hidden or imageless rock has no public journey; a bad number is 400', async () => {
    expect((await api().get('/api/rock-posts/103')).body).toEqual([]);
    expect((await api().get('/api/rock-posts/104')).body).toEqual([]);
    expect((await api().get('/api/rock-posts/abc')).status).toBe(400);
  });

  it('map pins are exactly the public stops that have coordinates', async () => {
    const res = await api().get('/api/rock-posts/locations/all');
    expect(res.body.map((r) => r.rps_key).sort()).toEqual([1, 2]);
  });

  it('totals count only public rocks', async () => {
    const res = await api().get('/api/rock-posts/totals');
    expect(Number(res.body.rocks_found)).toBe(2);
    expect(Number(res.body.total_rocks)).toBe(4);
  });
});

describe('All Rocks stats [C-stats]', () => {
  it('ignore hidden stops and never list a null state', async () => {
    const { body } = await api().get('/api/ar-details');
    expect(body.rocksFound).toBe(2);
    expect(body.journeys).toBe(3);
    expect(body.statesTable.map((s) => s.name).sort()).toEqual(['Ohio', 'Utah']);
    expect(body.usStates).toBe(2);
    expect(body.countriesTable.map((c) => c.name)).toEqual(['United States']);
  });
});

describe('hidden albums, photos and songs [S16]', () => {
  it('public album list leaves hidden albums out', async () => {
    const { body } = await api().get('/api/albums');
    expect(body.map((a) => a.name)).toEqual(['visible-album']);
    expect(Number(body[0].count)).toBe(1);
  });

  it('?tag filters the public list', async () => {
    expect((await api().get('/api/albums?tag=main')).body).toHaveLength(1);
    expect((await api().get('/api/albums?tag=nope')).body).toHaveLength(0);
  });

  it('public photo list leaves hidden photos and hidden albums out', async () => {
    expect((await api().get('/api/albums/1/photos')).body.map((p) => p.p_key)).toEqual([1]);
    expect((await api().get('/api/albums/2/photos')).body).toEqual([]);
  });

  it('?includeHidden is ignored for the public and honoured for an admin', async () => {
    expect((await api().get('/api/albums?includeHidden=1')).body).toHaveLength(1);
    const admin = await api().get('/api/albums?includeHidden=1').set(await bearer('admin'));
    expect(admin.body).toHaveLength(2);
    const userRes = await api().get('/api/albums?includeHidden=1').set(await bearer('user'));
    expect(userRes.body).toHaveLength(1);
    const photos = await api().get('/api/albums/1/photos?includeHidden=1').set(await bearer('admin'));
    expect(photos.body).toHaveLength(2);
  });

  it('songs: hidden left out unless an admin asks', async () => {
    expect((await api().get('/api/music')).body.map((m) => m.name)).toEqual(['Visible Song']);
    const admin = await api().get('/api/music?includeHidden=1').set(await bearer('admin'));
    expect(admin.body).toHaveLength(2);
  });

  it('play count increments', async () => {
    const res = await api().put('/api/music/1/increment-play');
    expect(res.status).toBe(200);
    expect(res.body.play_count).toBeGreaterThan(0);
  });
});

describe('pages', () => {
  it('nav lists visible public pages only (no email templates or account pages)', async () => {
    const slugs = (await api().get('/api/pages')).body.map((p) => p.slug);
    expect(slugs).toContain('home');
    expect(slugs).not.toContain('response-email');
    expect(slugs).not.toContain('sign-in');
  });

  it('page content: real pages and account pages yes, email templates 404', async () => {
    expect((await api().get('/api/pages/home/content')).body.body).toMatch(/Aiden/);
    const signIn = await api().get('/api/pages/sign-in/content');
    expect(signIn.body.title).toBe('Sign In');
    expect((await api().get('/api/pages/new-journey-email/content')).status).toBe(404);
    expect((await api().get('/api/pages/nope/content')).status).toBe(404);
  });
});

describe('Honoring Aiden (public)', () => {
  it('lists and opens published entries only', async () => {
    const list = (await api().get('/api/honoring-aiden/entries')).body;
    expect(list.map((e) => e.slug)).toEqual(['about-aiden']);
    expect((await api().get('/api/honoring-aiden/entries/about-aiden')).status).toBe(200);
    expect((await api().get('/api/honoring-aiden/entries/draft-entry')).status).toBe(404);
  });
});

describe('follows', () => {
  it('follow, list, unfollow; unknown rock 404, bad input 400', async () => {
    const h = await bearer('user');
    expect((await api().post('/api/follows').set(h).send({ rockNumber: 101 })).status).toBe(201);
    expect((await api().get('/api/follows/ids').set(h)).body).toContain(101);
    expect((await api().post('/api/follows').set(h).send({ rockNumber: 999 })).status).toBe(404);
    expect((await api().post('/api/follows').set(h).send({ rockNumber: 'x' })).status).toBe(400);

    const followed = await api().get('/api/rock-posts?followed=1').set(h);
    expect(new Set(followed.body.rows.map((r) => r.rock_number))).toEqual(new Set([101]));

    expect((await api().delete('/api/follows/101').set(h)).status).toBe(200);
    expect((await api().get('/api/follows/ids').set(h)).body).not.toContain(101);
  });
});
