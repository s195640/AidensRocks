// Admin create/edit/delete, one block per admin router, with the bugs this
// suite was built around pinned by their plan IDs.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { api, bearer, sql } from '../helpers/server.mjs';
import { clearMail, waitForMail } from '../helpers/mailpit.mjs';
import { makeImage } from '../helpers/media.mjs';
import { MEDIA_ROOT } from '../setup/testEnv.mjs';

let A; // admin auth header
beforeAll(async () => {
  A = await bearer('admin');
});

describe('artists (/api/users) [A5]', () => {
  it('create, rename, list', async () => {
    const created = await api().post('/api/users').set(A).send({ display_name: 'Cousin Kim', relation: 'Cousin' });
    expect(created.status).toBeLessThan(300);
    const list = (await api().get('/api/users').set(A)).body;
    const kim = list.find((a) => a.display_name === 'Cousin Kim');
    expect(kim).toBeTruthy();
    const upd = await api().put(`/api/users/${kim.ra_key}`).set(A).send({ display_name: 'Cousin Kimberly', relation: 'Cousin' });
    expect(upd.status).toBe(200);
  });

  it('renaming onto an existing name is refused with a message', async () => {
    const res = await api().put('/api/users/3').set(A).send({ display_name: 'Ashley', relation: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it('deleting an artist still linked to rocks is a 409 with a message, not a 500', async () => {
    const res = await api().delete('/api/users/1').set(A);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/linked to rocks/);
  });

  it('deleting an unused artist works', async () => {
    expect((await api().delete('/api/users/3').set(A)).status).toBe(200);
  });
});

describe('rocks (/api/rocks) [S5 A7]', () => {
  it('creates a rock with an image and artists', async () => {
    const res = await api()
      .post('/api/rocks')
      .set(A)
      .field('rock_number', '200')
      .field('artist_keys', JSON.stringify([1]))
      .field('comment', 'new')
      .attach('image', await makeImage('jpeg'), 'rock.jpg');
    expect(res.status).toBeLessThan(300);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'catalog', '200'))).toBe(true);
  });

  it('[A7] saving a rock with [null] artists drops the null instead of failing', async () => {
    const res = await api().put('/api/rocks/4').set(A).field('artist_keys', '[null]').field('comment', 'still none');
    expect(res.status).toBe(200);
    expect(await sql('SELECT * FROM artist_link WHERE rc_key = 4')).toEqual([]);
  });

  it('bad artist_keys is a 400', async () => {
    expect((await api().put('/api/rocks/4').set(A).field('artist_keys', 'nope')).status).toBe(400);
  });

  it('[S5] delete removes links, catalog row and media atomically; missing rock is 404', async () => {
    const [{ rc_key }] = await sql('SELECT rc_key FROM catalog WHERE rock_number = 200');
    expect((await api().delete(`/api/rocks/${rc_key}`).set(A)).status).toBe(200);
    expect(await sql('SELECT 1 FROM catalog WHERE rc_key = $1', [rc_key])).toEqual([]);
    expect(await sql('SELECT 1 FROM artist_link WHERE rc_key = $1', [rc_key])).toEqual([]);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'catalog', '200'))).toBe(false);
    expect((await api().delete('/api/rocks/999999').set(A)).status).toBe(404);
    // nothing left "idle in transaction"
    const stuck = await sql(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE state = 'idle in transaction'`);
    expect(stuck[0].n).toBe(0);
  });
});

describe('albums [S6 S21]', () => {
  it('[S21] refuses album names that are not plain folder names', async () => {
    for (const name of ['../evil', 'a/b', '..', '']) {
      expect((await api().post('/api/albums').set(A).send({ name, display_name: 'x', show: true })).status).toBe(400);
    }
    expect((await api().post('/api/albums/..%2F..%2Fx/init-folder').set(A)).status).toBe(400);
  });

  it('creates an album and its folder', async () => {
    const res = await api().post('/api/albums').set(A).send({ name: 'newalbum', display_name: 'New', desc: '', show: true, tags: [] });
    expect(res.status).toBeLessThan(300);
    expect((await api().post('/api/albums/newalbum/init-folder').set(A)).status).toBe(200);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'albums', 'newalbum'))).toBe(true);
    expect((await api().post('/api/albums').set(A).send({ name: 'newalbum', display_name: 'Dup', show: true })).status).toBe(400);
  });

  it('toggles a photo', async () => {
    const res = await api().post('/api/albums/photos/2/toggle-show').set(A);
    expect(res.body.show).toBe(true);
    await api().post('/api/albums/photos/2/toggle-show').set(A);
  });

  it('[S6] deleting a missing photo 404s without leaving a transaction open', async () => {
    for (let i = 0; i < 12; i++) {
      expect((await api().delete('/api/albums/photos/999999').set(A)).status).toBe(404);
    }
    const stuck = await sql(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE state = 'idle in transaction'`);
    expect(stuck[0].n).toBe(0);
  });
});

describe('journey admin', () => {
  it('lists journeys and their images', async () => {
    expect((await api().get('/api/journey-admin').set(A)).body.length).toBeGreaterThan(0);
    expect((await api().get('/api/journey-admin/1/images').set(A)).body).toHaveLength(1);
  });

  it('toggles a journey', async () => {
    expect((await api().post('/api/journey-admin/4/toggle-show').set(A).send({ show: true })).status).toBe(200);
    expect((await sql('SELECT show FROM journey WHERE rps_key = 4'))[0].show).toBe(true);
    await api().post('/api/journey-admin/4/toggle-show').set(A).send({ show: false });
  });

  it('changing the rock number moves the folder; an unchanged one leaves it alone', async () => {
    const [j] = await sql('SELECT * FROM journey WHERE rps_key = 3');
    const body = {
      rock_number: '103', location: j.location, date: '2025-07-01', comment: j.comment,
      name: j.name, email: j.email, show: true, latitude: null, longitude: null,
    };
    expect((await api().put('/api/journey-admin/3').set(A).send(body)).status).toBe(200);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'rocks', '103', j.uuid, 'webp'))).toBe(true);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'rocks', '102', j.uuid))).toBe(false);
    // same number again (string vs int) -- must not try to move
    expect((await api().put('/api/journey-admin/3').set(A).send(body)).status).toBe(200);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'rocks', '103', j.uuid, 'webp'))).toBe(true);
    // back to where it was for the other tests
    expect((await api().put('/api/journey-admin/3').set(A).send({ ...body, rock_number: '102' })).status).toBe(200);
  });

  it('delete removes the journey, its image and tracking rows, and its folder', async () => {
    const [j] = await sql('SELECT * FROM journey WHERE rps_key = 4');
    await sql(`INSERT INTO journey_tracking (rps_key) VALUES (4)`);
    expect((await api().delete('/api/journey-admin/4').set(A)).status).toBe(200);
    expect(await sql('SELECT 1 FROM journey_image WHERE rps_key = 4')).toEqual([]);
    expect(await sql('SELECT 1 FROM journey_tracking WHERE rps_key = 4')).toEqual([]);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'rocks', '103', j.uuid))).toBe(false);
    expect((await api().delete('/api/journey-admin/4').set(A)).status).toBe(404);
  });
});

describe('music', () => {
  it('toggles show and deletes a song with its files', async () => {
    expect((await api().put('/api/music/2/toggle-show').set(A).send({ show: true })).status).toBe(200);
    expect((await api().delete('/api/music/2').set(A)).status).toBe(200);
    expect(fs.existsSync(path.join(MEDIA_ROOT, 'music', '2'))).toBe(false);
    expect((await api().delete('/api/music/2').set(A)).status).toBe(404);
  });
});

describe('rock requests (admin)', () => {
  it('list, edit, soft delete / undelete', async () => {
    expect((await api().get('/api/rock-requests').set(A)).status).toBe(200);
    const put = await api().put('/api/rock-requests/1').set(A).send({
      name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2,
      shipped: false, tracking_number: 'TRK1', comments: '', rock_numbers: '101',
    });
    expect(put.status).toBe(200);
    expect((await sql('SELECT rq_key FROM catalog WHERE rock_number = 101'))[0].rq_key).toBe(1);
    const unknownRock = await api().put('/api/rock-requests/1').set(A).send({
      name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2, rock_numbers: '5555',
    });
    expect(unknownRock.status).toBe(400);
    // can't delete while rocks are assigned to it
    expect((await api().delete('/api/rock-requests/1').set(A)).status).toBe(400);
    await api().put('/api/rock-requests/1').set(A).send({
      name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2, rock_numbers: '',
    });
    expect((await api().delete('/api/rock-requests/1').set(A)).status).toBe(200);
    expect((await api().post('/api/rock-requests/1/undelete').set(A)).status).toBe(200);
  });

  it('edits need-by / no rush, and lists the date as plain YYYY-MM-DD', async () => {
    const base = { name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2 };
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, needed_by: '2027-03-15' })).status).toBe(200);
    let row = (await api().get('/api/rock-requests').set(A)).body.find((r) => r.rq_key === 1);
    expect(row).toMatchObject({ needed_by: '2027-03-15', no_rush: false });
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, needed_by: '2027-03-15', no_rush: true })).status).toBe(200);
    row = (await api().get('/api/rock-requests').set(A)).body.find((r) => r.rq_key === 1);
    expect(row).toMatchObject({ needed_by: null, no_rush: true });
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, needed_by: 'nope' })).status).toBe(400);
  });

  it('admin-create only needs a name and # rocks, and saves every field', async () => {
    const create = (body) => api().post('/api/rock-requests/admin-create').set(A).send(body);
    expect((await create({ rocks_requested: 1 })).status).toBe(400);
    expect((await create({ name: 'Phone' })).status).toBe(400);
    expect((await create({ name: 'Phone', rocks_requested: 1, email: 'not-an-email' })).status).toBe(400);
    expect((await create({ name: 'Phone', rocks_requested: 1, rock_numbers: '5555' })).status).toBe(400);

    const bare = await create({ name: 'Phone', rocks_requested: 1, email: '', address: '' });
    expect(bare.status).toBe(201);
    expect((await sql('SELECT email, address FROM rock_requests WHERE rq_key = $1', [bare.body.rq_key]))[0])
      .toEqual({ email: null, address: null });

    const full = await create({
      name: 'Phone', email: 'phone@example.com', address: '2 Main St', rocks_requested: 1,
      needed_by: '2020-01-01', message: 'Called in', comments: 'Ship with the next batch',
      tracking_number: 'TRK9', shipped: true, rock_numbers: '101',
    });
    expect(full.status).toBe(201);
    const row = (await sql(
      `SELECT to_char(needed_by, 'YYYY-MM-DD') AS needed_by, message, comments, tracking_number, shipped,
              sent_dt IS NOT NULL AS has_sent_dt
       FROM rock_requests WHERE rq_key = $1`, [full.body.rq_key]))[0];
    expect(row).toEqual({
      needed_by: '2020-01-01', message: 'Called in', comments: 'Ship with the next batch',
      tracking_number: 'TRK9', shipped: true, has_sent_dt: true,
    });
    expect((await sql('SELECT rq_key FROM catalog WHERE rock_number = 101'))[0].rq_key).toBe(full.body.rq_key);
  });

  it('edit saves the message and refuses Send Email with no address', async () => {
    const created = await api().post('/api/rock-requests/admin-create').set(A).send({ name: 'No Email', rocks_requested: 1 });
    const key = created.body.rq_key;
    const put = await api().put(`/api/rock-requests/${key}`).set(A)
      .send({ name: 'No Email', rocks_requested: 1, message: 'Edited by admin' });
    expect(put.status).toBe(200);
    expect(put.body.message).toBe('Edited by admin');
    const send = await api().post(`/api/rock-requests/${key}/send-email`).set(A).send({ subject: 'Hi', body: 'Hi' });
    expect(send.status).toBe(400);
  });

  it('sends the reply email', async () => {
    await clearMail();
    const res = await api().post('/api/rock-requests/1/send-email').set(A).send({ subject: 'On the way', body: 'Hi', markShipped: true });
    expect(res.status).toBe(200);
    await waitForMail('requester@example.com', { subject: /On the way/ });
  });
});

describe('pages admin', () => {
  it('draft does not change the public page until published', async () => {
    expect((await api().put('/api/admin/pages/sudc/draft').set(A).send({ body: '<p>New SUDC copy</p>' })).status).toBe(200);
    expect((await api().get('/api/pages/sudc/content')).body.body).not.toMatch(/New SUDC copy/);
    expect((await api().post('/api/admin/pages/sudc/publish').set(A)).status).toBe(200);
    expect((await api().get('/api/pages/sudc/content')).body.body).toMatch(/New SUDC copy/);
  });

  it('Sign In and the required emails cannot be turned off', async () => {
    expect((await api().patch('/api/admin/pages/sign-in/visible').set(A).send({ visible: false })).status).toBe(400);
    expect((await api().patch('/api/admin/pages/password-reset-email/visible').set(A).send({ visible: false })).status).toBe(400);
    for (const slug of ['upload-files-failed-email', 'upload-processing-failed-email']) {
      expect((await api().patch(`/api/admin/pages/${slug}/visible`).set(A).send({ visible: false })).status).toBe(400);
    }
    const preview = await api().post('/api/admin/pages/upload-files-failed-email/render').set(A)
      .send({ values: { ROCK_NUMBER: '7', FAILED_COUNT: '2', FAILED_FILES: 'a.jpg: bad; <b>.mov: worse' } });
    expect(preview.status).toBe(200);
    expect(preview.body.subject).toBe('[2 FILE(S) FAILED] Rock upload: Rock 7');
    expect(preview.body.html).toContain('<ul><li>a.jpg: bad</li><li>&lt;b&gt;.mov: worse</li></ul>');
  });
});

describe('settings and path display names', () => {
  it('settings round-trip', async () => {
    expect((await api().put('/api/admin/settings/test-setting').set(A).send({ value: { a: 1 } })).status).toBe(200);
    expect((await api().get('/api/admin/settings/test-setting').set(A)).body.value).toEqual({ a: 1 });
  });

  it('path display names CRUD', async () => {
    const created = await api().post('/api/admin/path-display-names').set(A).send({ urlPattern: '/qr?r=*', displayName: 'Rock' });
    expect(created.status).toBeLessThan(300);
    const list = (await api().get('/api/admin/path-display-names').set(A)).body;
    const row = (Array.isArray(list) ? list : list.rows || []).find((r) => (r.url_pattern || r.urlPattern) === '/qr?r=*');
    expect(row).toBeTruthy();
    expect((await api().delete(`/api/admin/path-display-names/${row.id}`).set(A)).status).toBeLessThan(300);
  });
});

describe('Honoring Aiden admin [A1 A2]', () => {
  it('[A1] renaming (title only) keeps the page body', async () => {
    const before = (await sql('SELECT body_json FROM entry WHERE id = 1'))[0].body_json;
    const res = await api().put('/api/admin/honoring-aiden/entries/1').set(A).send({ title: 'All About Aiden' });
    expect(res.status).toBe(200);
    const [after] = await sql('SELECT title, body_json, published FROM entry WHERE id = 1');
    expect(after.title).toBe('All About Aiden');
    expect(after.body_json).toEqual(before);
    expect(after.published).toBe(true);
  });

  it('[A2] saving content or the Active toggle does not revert the title', async () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New body' }] }] };
    expect((await api().put('/api/admin/honoring-aiden/entries/1').set(A).send({ body_json: doc })).status).toBe(200);
    expect((await api().put('/api/admin/honoring-aiden/entries/1').set(A).send({ published: true })).status).toBe(200);
    const [row] = await sql('SELECT title, body_json FROM entry WHERE id = 1');
    expect(row.title).toBe('All About Aiden');
    expect(row.body_json).toEqual(doc);
  });

  it('rejects a blank title or an empty update', async () => {
    expect((await api().put('/api/admin/honoring-aiden/entries/1').set(A).send({ title: '  ' })).status).toBe(400);
    expect((await api().put('/api/admin/honoring-aiden/entries/1').set(A).send({})).status).toBe(400);
    expect((await api().post('/api/admin/honoring-aiden/entries').set(A).send({ title: 42 })).status).toBe(400);
  });

  it('creates a sub-entry with a unique slug', async () => {
    const a = await api().post('/api/admin/honoring-aiden/entries').set(A).send({ title: 'Trips', parent_id: 1 });
    const b = await api().post('/api/admin/honoring-aiden/entries').set(A).send({ title: 'Trips', parent_id: 1 });
    expect(a.status).toBeLessThan(300);
    expect(b.body.slug).not.toBe(a.body.slug);
  });
});

describe('accounts admin', () => {
  it('lists, edits a level, sends a reset, and refuses to demote yourself', async () => {
    expect((await api().get('/api/admin/accounts').set(A)).status).toBe(200);
    expect((await api().put('/api/admin/accounts/3').set(A).send({ access_level: 20 })).status).toBe(200);
    expect((await api().put('/api/admin/accounts/1').set(A).send({ access_level: 20 })).status).toBe(400);
    await clearMail();
    expect((await api().post('/api/admin/accounts/3/send-reset').set(A)).status).toBe(200);
    await waitForMail('creator@example.com');
  });
});

describe('jobs', () => {
  it('send-email delivers to the given address', async () => {
    await clearMail();
    const res = await api().post('/api/admin/jobs/send-email').set(A).send({ to: 'someone@example.com', subject: 'Hello', message: '<p>Hi</p>' });
    expect(res.status).toBe(200);
    await waitForMail('someone@example.com', { subject: /Hello/ });
  });
});
