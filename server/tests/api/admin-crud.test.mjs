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

  it('[#6] a duplicate rock number is a 409 and leaves the existing rock alone', async () => {
    const imgPath = path.join(MEDIA_ROOT, 'catalog', '200', 'a.webp');
    const before = fs.readFileSync(imgPath);
    const res = await api()
      .post('/api/rocks')
      .set(A)
      .field('rock_number', '200')
      .field('artist_keys', JSON.stringify([1]))
      .field('comment', 'dupe')
      .attach('image', await makeImage('png'), 'other.png');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/200 already exists/);
    expect(await sql('SELECT comment FROM catalog WHERE rock_number = 200')).toEqual([{ comment: 'new' }]);
    expect(fs.readFileSync(imgPath).equals(before)).toBe(true);
  });

  it('[A7] saving a rock with [null] artists drops the null instead of failing', async () => {
    const res = await api().put('/api/rocks/4').set(A).field('artist_keys', '[null]').field('comment', 'still none');
    expect(res.status).toBe(200);
    expect(await sql('SELECT * FROM artist_link WHERE rc_key = 4')).toEqual([]);
  });

  it('assign status: defaults to available, table PATCH stamps/clears the date, dialog PUT sets both', async () => {
    const listed = async () => (await api().get('/api/rocks').set(A)).body.find((r) => r.rc_key === 2);
    const today = (await sql(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d`))[0].d;
    expect(await listed()).toMatchObject({ assign_status: 'available', assigned_dt: null });

    const patch = (assign_status) => api().patch('/api/rocks/2/assign-status').set(A).send({ assign_status });
    expect((await patch('assigned')).body).toEqual({ rc_key: 2, assign_status: 'assigned', assigned_dt: today });
    // keep leaves the date; re-assigning an assigned rock keeps its date
    await sql(`UPDATE catalog SET assigned_dt = '2025-01-02' WHERE rc_key = 2`);
    expect((await patch('assigned')).body.assigned_dt).toBe('2025-01-02');
    expect((await patch('keep')).body).toMatchObject({ assign_status: 'keep', assigned_dt: '2025-01-02' });
    expect((await patch('available')).body).toMatchObject({ assign_status: 'available', assigned_dt: null });
    // keep/unknown fill in today when there's no date, and keep one that's set
    expect((await patch('unknown')).body).toMatchObject({ assign_status: 'unknown', assigned_dt: today });
    await sql(`UPDATE catalog SET assigned_dt = '2025-01-02' WHERE rc_key = 2`);
    expect((await patch('keep')).body.assigned_dt).toBe('2025-01-02');
    expect((await patch('available')).body.assigned_dt).toBe(null);
    expect((await patch('lost')).status).toBe(400);
    expect((await api().patch('/api/rocks/999999/assign-status').set(A).send({ assign_status: 'keep' })).status).toBe(404);

    const put = (fields) => {
      let req = api().put('/api/rocks/2').set(A).field('artist_keys', '[2]').field('comment', 'Green rock');
      for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
      return req;
    };
    expect((await put({ assign_status: 'unknown', assigned_dt: '2025-03-04' })).status).toBe(200);
    expect(await listed()).toMatchObject({ assign_status: 'unknown', assigned_dt: '2025-03-04' });
    // a PUT without assign_status leaves both alone
    expect((await put({})).status).toBe(200);
    expect(await listed()).toMatchObject({ assign_status: 'unknown', assigned_dt: '2025-03-04' });
    expect((await put({ assign_status: 'available', assigned_dt: '' })).status).toBe(200);
    expect(await listed()).toMatchObject({ assign_status: 'available', assigned_dt: null });
    expect((await put({ assign_status: 'nope' })).status).toBe(400);
    expect((await put({ assign_status: 'keep', assigned_dt: 'March 4' })).status).toBe(400);
  });

  it('has_journey is true only for a rock with a public journey stop', async () => {
    const byNumber = Object.fromEntries((await api().get('/api/rocks').set(A)).body.map((r) => [r.rock_number, r]));
    expect(byNumber[101].has_journey).toBe(true); // visible stops
    expect(byNumber[103].has_journey).toBe(false); // only a hidden stop
    expect(byNumber[104].has_journey).toBe(false); // no stops
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

  it('[#11] reorder-all renumbers hidden albums too, with no collisions', async () => {
    await sql('UPDATE photoalbums SET order_num = 5 WHERE pa_key = 2'); // the hidden album, out at the end
    expect((await api().post('/api/albums/reorder-all').set(A)).status).toBe(200);
    const rows = await sql('SELECT pa_key, order_num FROM photoalbums ORDER BY order_num');
    expect(rows.map((r) => r.order_num)).toEqual(rows.map((_, i) => i));
    expect(rows.some((r) => r.pa_key === 2)).toBe(true);
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

  it('[#12] deleting one image removes its files and leaves the others', async () => {
    const [j] = await sql('SELECT rock_number, uuid FROM journey WHERE rps_key = 2');
    const dir = path.join(MEDIA_ROOT, 'rocks', String(j.rock_number), j.uuid);
    const extra = `2_${j.uuid}`;
    const extraFiles = [path.join(dir, 'o', `${extra}.png`), path.join(dir, 'webp', `${extra}.webp`), path.join(dir, 'sm', `${extra}.webp`)];
    for (const f of extraFiles) fs.writeFileSync(f, 'x');
    const [{ rpi_key }] = await sql(
      `INSERT INTO journey_image (rps_key, original_name, current_name, upload_order, show)
       VALUES (2, 'extra.png', $1, 2, true) RETURNING rpi_key`,
      [extra]
    );

    expect((await api().delete(`/api/journey-admin/images/${rpi_key}`).set(A)).status).toBe(200);
    for (const f of extraFiles) expect(fs.existsSync(f)).toBe(false);
    // the journey's other photo is untouched
    expect(fs.readdirSync(path.join(dir, 'webp'))).toEqual([`${j.uuid}_1.webp`]);
    expect(fs.readdirSync(path.join(dir, 'o'))).toEqual([`${j.uuid}_1.jpg`]);
    expect((await api().delete(`/api/journey-admin/images/${rpi_key}`).set(A)).status).toBe(404);
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
    // linking marks the rock assigned today
    expect(
      (await sql(`SELECT assign_status, assigned_dt = CURRENT_DATE AS today FROM catalog WHERE rock_number = 101`))[0]
    ).toEqual({ assign_status: 'assigned', today: true });
    const unknownRock = await api().put('/api/rock-requests/1').set(A).send({
      name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2, rock_numbers: '5555',
    });
    expect(unknownRock.status).toBe(400);
    // can't delete while rocks are assigned to it
    expect((await api().delete('/api/rock-requests/1').set(A)).status).toBe(400);
    await api().put('/api/rock-requests/1').set(A).send({
      name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2, rock_numbers: '',
    });
    // unlinking puts it back to available
    expect((await sql('SELECT rq_key, assign_status, assigned_dt FROM catalog WHERE rock_number = 101'))[0])
      .toEqual({ rq_key: null, assign_status: 'available', assigned_dt: null });
    expect((await api().delete('/api/rock-requests/1').set(A)).status).toBe(200);
    expect((await api().post('/api/rock-requests/1/undelete').set(A)).status).toBe(200);
  });

  it('ready to ship / priority: default, in-place PATCH, and edit dialog PUT', async () => {
    const listed = async () => (await api().get('/api/rock-requests').set(A)).body.find((r) => r.rq_key === 1);
    expect(await listed()).toMatchObject({ ready_to_ship: false, priority: 'normal', bereaved_parent: false });

    // PATCH changes only the fields sent
    expect((await api().patch('/api/rock-requests/1').set(A).send({ priority: 'high' })).body)
      .toEqual({ rq_key: 1, ready_to_ship: false, priority: 'high', bereaved_parent: false });
    expect((await api().patch('/api/rock-requests/1').set(A).send({ ready_to_ship: true })).status).toBe(200);
    expect(await listed()).toMatchObject({ ready_to_ship: true, priority: 'high' });
    expect((await api().patch('/api/rock-requests/1').set(A).send({ priority: 'urgent' })).status).toBe(400);
    expect((await api().patch('/api/rock-requests/1').set(A).send({ ready_to_ship: 'yes' })).status).toBe(400);
    expect((await api().patch('/api/rock-requests/1').set(A).send({ bereaved_parent: true })).status).toBe(200);
    expect(await listed()).toMatchObject({ ready_to_ship: true, priority: 'high', bereaved_parent: true });
    expect((await api().patch('/api/rock-requests/1').set(A).send({ bereaved_parent: 1 })).status).toBe(400);
    expect((await api().patch('/api/rock-requests/1').set(A).send({})).status).toBe(400);
    expect((await api().patch('/api/rock-requests/999999').set(A).send({ priority: 'low' })).status).toBe(404);

    const base = { name: 'Requester', email: 'requester@example.com', address: '1 Main St', rocks_requested: 2 };
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, ready_to_ship: false, priority: 'low' })).status).toBe(200);
    expect(await listed()).toMatchObject({ ready_to_ship: false, priority: 'low', bereaved_parent: false });
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, bereaved_parent: true })).status).toBe(200);
    expect(await listed()).toMatchObject({ bereaved_parent: true });
    expect((await api().put('/api/rock-requests/1').set(A).send({ ...base, priority: 'nope' })).status).toBe(400);

    const created = await api().post('/api/rock-requests/admin-create').set(A)
      .send({ name: 'Prio', rocks_requested: 1, priority: 'high', bereaved_parent: true });
    expect((await sql('SELECT ready_to_ship, priority, bereaved_parent FROM rock_requests WHERE rq_key = $1', [created.body.rq_key]))[0])
      .toEqual({ ready_to_ship: false, priority: 'high', bereaved_parent: true });

    await api().patch('/api/rock-requests/1').set(A).send({ priority: 'normal', bereaved_parent: false });
  });

  it('public requests start with a priority from their message and need-by date', async () => {
    const inDays = (days) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const submit = async (extra) => {
      const res = await api().post('/api/rock-requests')
        .send({ name: 'Prio', email: 'prio@example.com', address: '1 Road', rocksRequested: 1, ...extra });
      expect(res.status).toBe(201);
      return (await sql('SELECT priority FROM rock_requests WHERE rq_key = $1', [res.body.rq_key]))[0].priority;
    };
    const message = 'For his birthday trip';
    expect(await submit({ message, neededBy: inDays(30) })).toBe('high');
    expect(await submit({ message, neededBy: inDays(200) })).toBe('normal'); // more than 3 months out
    expect(await submit({ message, noRush: true })).toBe('normal');
    expect(await submit({ neededBy: inDays(30) })).toBe('normal');
    expect(await submit({ message: 'thanks', neededBy: inDays(30) })).toBe('normal'); // under 10 characters
    expect(await submit({ noRush: true })).toBe('low');
    expect(await submit({ message: 'hi', noRush: true })).toBe('low');
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

  it('admin US / non-US address parts, and a write-once original request', async () => {
    const create = (body) => api().post('/api/rock-requests/admin-create').set(A).send(body);
    const addrCols = 'address, us_address, street, city, state, postal_code, country';
    // Parts are optional for admin, but a given ZIP / state must be valid.
    expect((await create({ name: 'P', rocks_requested: 1, us_address: true, postal_code: '123' })).status).toBe(400);
    expect((await create({ name: 'P', rocks_requested: 1, us_address: true, state: 'ZZ' })).status).toBe(400);
    const partial = await create({ name: 'P', rocks_requested: 1, us_address: true, city: 'Boise', state: 'ID' });
    expect((await sql(`SELECT ${addrCols} FROM rock_requests WHERE rq_key = $1`, [partial.body.rq_key]))[0]).toEqual({
      address: 'Boise, ID\nUSA', us_address: true, street: null, city: 'Boise', state: 'ID', postal_code: null, country: 'USA',
    });

    const created = await create({
      name: 'Phone', email: 'phone@example.com', rocks_requested: 3, no_rush: true, message: 'Hi',
      us_address: true, street: '1 Elm St', city: 'Denver', state: 'CO', postal_code: '80202',
    });
    const key = created.body.rq_key;
    const original = (await sql('SELECT original_request FROM rock_requests WHERE rq_key = $1', [key]))[0].original_request;
    expect(original).toBe([
      'Source: Created by admin', 'Name: Phone', 'Email: phone@example.com', 'Address (US):',
      '  Street: 1 Elm St', '  City: Denver', '  State: CO', '  ZIP Code: 80202', '  Country: USA',
      '# Rocks: 3', 'Need Rocks By: No rush', 'Message:\n  Hi',
    ].join('\n'));

    // Switching to a non-US address clears the US parts; the original stays put.
    const put = await api().put(`/api/rock-requests/${key}`).set(A).send({
      name: 'Changed', rocks_requested: 3, us_address: false, address: '9 Rue X\nParis', country: 'France', street: 'stale',
    });
    expect(put.status).toBe(200);
    const row = (await sql(`SELECT ${addrCols}, original_request FROM rock_requests WHERE rq_key = $1`, [key]))[0];
    expect(row).toEqual({
      address: '9 Rue X\nParis\nFrance', us_address: false, street: null, city: null, state: null, postal_code: null,
      country: 'France', original_request: original,
    });
    const listed = (await api().get('/api/rock-requests').set(A)).body.find((r) => r.rq_key === key);
    expect(listed).toMatchObject({ country: 'France', original_request: original });
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

  it('each email has a seeded Sender / Reply-To, and admin emails a Send To', async () => {
    const render = async (slug) => (await api().post(`/api/admin/pages/${slug}/render`).set(A).send({ values: {} })).body;
    expect(await render('new-rock-request-email')).toMatchObject({
      from: "Aiden's Rocks – Requests <requests@aidensrocks.com>",
      replyTo: 'noreply@aidensrocks.com',
      to: 'requests@aidensrocks.com',
    });
    expect(await render('follow-rocks-email')).toMatchObject({
      from: "Aiden's Rocks <noreply@aidensrocks.com>",
      replyTo: 'aidensfamily@aidensrocks.com',
      to: null,
    });
    expect((await render('account-verify-email')).replyTo).toBe('noreply@aidensrocks.com');
    // {CONTACT_EMAIL} comes from the contact-email setting, as a mailto link.
    await sql(`UPDATE page_content SET draft_body = '<p>Write to {CONTACT_EMAIL}</p>' WHERE page_slug = 'send-email-default'`);
    expect((await render('send-email-default')).html).toBe(
      '<p>Write to <a href="mailto:aidensfamily@aidensrocks.com">aidensfamily@aidensrocks.com</a></p>'
    );
    const tpl = await api().get('/api/admin/pages/send-email-default/template').set(A);
    expect(tpl.body.contactEmail).toBe('aidensfamily@aidensrocks.com');
  });

  it('Sender / Reply-To / Send To are saved on the draft, validated, and go live on Publish', async () => {
    const slug = 'new-journey-email';
    const draft = (extra) => api().put(`/api/admin/pages/${slug}/draft`).set(A).send({ body: '<p>Journey {ROCK_NUMBER}</p>', ...extra });
    expect((await draft({ email_from: 'not an address' })).status).toBe(400);
    expect((await draft({ email_from: 'a@b.com, c@d.com' })).status).toBe(400);
    expect((await draft({ email_reply_to: 'nope' })).status).toBe(400);
    expect((await draft({ email_to: 'nope' })).status).toBe(400);
    // Send To only exists on the 4 admin emails; nothing at all on plain pages.
    expect((await api().put('/api/admin/pages/account-verify-email/draft').set(A).send({ body: 'x', email_to: 'a@b.com' })).status).toBe(400);
    expect((await api().put('/api/admin/pages/sudc/draft').set(A).send({ body: 'x', email_from: 'a@b.com' })).status).toBe(400);

    const saved = await draft({ email_from: 'Rock Watch <watch@example.com>', email_reply_to: 'family@example.com', email_to: 'inbox@example.com' });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ email_from: 'Rock Watch <watch@example.com>', email_reply_to: 'family@example.com', email_to: 'inbox@example.com' });

    // Draft is used by Preview / test Send; real sends stay on published until Publish.
    const rendered = (await api().post(`/api/admin/pages/${slug}/render`).set(A).send({ values: {} })).body;
    expect(rendered).toMatchObject({ from: 'Rock Watch <watch@example.com>', replyTo: 'family@example.com', to: 'inbox@example.com' });
    const live = await sql(`SELECT published_email_from, published_email_to FROM page_content WHERE page_slug = $1`, [slug]);
    expect(live[0]).toEqual({ published_email_from: "Aiden's Rocks – Journeys <journeys@aidensrocks.com>", published_email_to: 'journeys@aidensrocks.com' });

    await clearMail();
    expect((await api().post(`/api/admin/pages/${slug}/send`).set(A).send({ to: 'tester@example.com', values: { ROCK_NUMBER: '101' } })).status).toBe(200);
    const sent = await waitForMail('tester@example.com');
    expect(sent.From).toEqual({ Name: 'Rock Watch', Address: 'watch@example.com' });
    expect(sent.ReplyTo.map((r) => r.Address)).toEqual(['family@example.com']);

    const published = await api().post(`/api/admin/pages/${slug}/publish`).set(A);
    expect(published.body).toMatchObject({ published_email_from: 'Rock Watch <watch@example.com>', published_email_to: 'inbox@example.com' });

    // "" clears back to the default; blank Send To falls back to the Sender's address.
    await draft({ email_from: 'Rock Watch <watch@example.com>', email_reply_to: '', email_to: '' });
    const cleared = (await api().post(`/api/admin/pages/${slug}/render`).set(A).send({ values: {} })).body;
    expect(cleared).toMatchObject({ replyTo: null, to: 'watch@example.com' });

    // Put the seeded values back for the rest of the suite.
    await draft({
      email_from: "Aiden's Rocks – Journeys <journeys@aidensrocks.com>",
      email_reply_to: 'noreply@aidensrocks.com',
      email_to: 'journeys@aidensrocks.com',
    });
    await api().post(`/api/admin/pages/${slug}/publish`).set(A);
  });
});

describe('Dialogs (Request A Rock)', () => {
  const slug = 'request-a-rock';
  const draft = (settings) =>
    api().put(`/api/admin/pages/${slug}/draft`).set(A).send({ body: '<p>Send us a rock request!</p>', settings });
  const request = (rocksRequested) =>
    api().post('/api/rock-requests').send({ name: 'Lim', email: 'lim@example.com', address: '1 Road', rocksRequested, noRush: true });

  it('is always on, never in the nav, and validates its settings', async () => {
    expect((await api().patch(`/api/admin/pages/${slug}/visible`).set(A)).status).toBe(400);
    expect((await api().get('/api/pages')).body.map((p) => p.slug)).not.toContain(slug);
    for (const bad of [{ maxRocks: 0 }, { maxRocks: 101 }, { maxRocks: 2.5 }, { maxRocks: 'x' }, { rocksNote: 5 }, { rocksNote: 'x'.repeat(201) }, []]) {
      expect((await draft(bad)).status).toBe(400);
    }
    // Settings only exist on dialogs.
    expect((await api().put('/api/admin/pages/sudc/draft').set(A).send({ body: 'x', settings: {} })).status).toBe(400);
  });

  it('message, # Rocks note and limit are drafts until Publish, and the limit is enforced', async () => {
    const saved = await draft({ rocksNote: ' (up to 3) ', maxRocks: '3' });
    expect(saved.status).toBe(200);
    expect(saved.body.settings).toEqual({ rocksNote: '(up to 3)', maxRocks: 3 });

    // Preview shows the draft; the public dialog and the limit stay on published.
    const preview = (await api().get(`/api/admin/pages/${slug}/preview`).set(A)).body;
    expect(preview).toMatchObject({ body: '<p>Send us a rock request!</p>', settings: { rocksNote: '(up to 3)', maxRocks: 3 } });
    expect((await api().get(`/api/pages/${slug}/content`)).body.settings).toEqual({ rocksNote: '', maxRocks: null });
    expect((await request(4)).status).toBe(201);

    const published = await api().post(`/api/admin/pages/${slug}/publish`).set(A);
    expect(published.body.published_settings).toEqual({ rocksNote: '(up to 3)', maxRocks: 3 });
    expect((await api().get(`/api/pages/${slug}/content`)).body).toEqual({
      body: '<p>Send us a rock request!</p>',
      settings: { rocksNote: '(up to 3)', maxRocks: 3 },
    });
    const over = await request(4);
    expect(over.status).toBe(400);
    expect(over.body.error).toBe('Please request 3 rocks or fewer.');
    expect((await request(3)).status).toBe(201);

    // Blank = back to the 100 ceiling.
    expect((await draft({ rocksNote: '', maxRocks: '' })).body.settings).toEqual({ rocksNote: '', maxRocks: null });
    await api().post(`/api/admin/pages/${slug}/publish`).set(A);
    expect((await request(100)).status).toBe(201);
    expect((await request(101)).body.error).toBe('Please request 100 rocks or fewer.');
  });
});

describe('settings and path display names', () => {
  it('settings round-trip', async () => {
    expect((await api().put('/api/admin/settings/test-setting').set(A).send({ value: { a: 1 } })).status).toBe(200);
    expect((await api().get('/api/admin/settings/test-setting').set(A)).body.value).toEqual({ a: 1 });
  });

  it('contact email: validated, and only allow-listed settings are public', async () => {
    expect((await api().get('/api/site-settings')).body).toEqual({ contactEmail: 'aidensfamily@aidensrocks.com' });
    expect((await api().put('/api/admin/settings/contact-email').set(A).send({ value: 'nope' })).status).toBe(400);
    expect((await api().put('/api/admin/settings/contact-email').set(A).send({ value: 'hello@example.com' })).status).toBe(200);
    // test-setting (saved above) must never leak through the public endpoint.
    expect((await api().get('/api/site-settings')).body).toEqual({ contactEmail: 'hello@example.com' });
    await api().put('/api/admin/settings/contact-email').set(A).send({ value: 'aidensfamily@aidensrocks.com' });
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

describe('[#13] a non-numeric id in the URL is a 400, not a 500', () => {
  it('every admin router with a numeric id', async () => {
    const calls = [
      ['put', '/api/rocks/abc'],
      ['put', '/api/rock-requests/abc'],
      ['post', '/api/rock-requests/abc/undelete'],
      ['get', '/api/journey-admin/abc/images'],
      ['post', '/api/journey-admin/images/abc/toggle-show'],
      ['get', '/api/albums/abc/photos'],
      ['post', '/api/albums/photos/abc/toggle-show'],
      ['put', '/api/music/abc/toggle-show'],
      ['put', '/api/admin/honoring-aiden/entries/abc'],
      ['put', '/api/users/abc'],
      ['put', '/api/admin/accounts/abc'],
      ['delete', '/api/admin/path-display-names/abc'],
      ['delete', '/api/rock-requests/99999999999'], // too big for an integer
    ];
    for (const [method, url] of calls) {
      const res = await api()[method](url).set(A).send({});
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(400);
    }
  });
});
