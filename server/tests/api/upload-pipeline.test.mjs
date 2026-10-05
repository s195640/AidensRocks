// [S3 S9 + P2 upload hardening] The public rock upload: accepted hidden,
// processed in the background, then published; a bad file doesn't sink
// the rest; private files are never served.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { api, sql, waitFor, require } from '../helpers/server.mjs';
import { clearMail, listMail } from '../helpers/mailpit.mjs';
import { makeImage } from '../helpers/media.mjs';
import { MEDIA_ROOT } from '../setup/testEnv.mjs';

const ADMIN_INBOX = 'AidensRocks.AAA@gmail.com';

const upload = (fields, files = []) => {
  const req = api().post('/api/upload-rock');
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  for (const f of files) req.attach('images', f.buffer, f.name);
  return req;
};

const baseFields = {
  rockNumber: '102',
  rockNumberQr: '102',
  location: 'Test Falls',
  date: '2025-09-01',
  comment: 'Found it!',
  name: 'Tester',
  email: 'Tester@Example.com',
};

beforeAll(clearMail);

describe('happy path', () => {
  let res;
  beforeAll(async () => {
    res = await upload(baseFields, [
      { name: 'one.jpg', buffer: await makeImage('jpeg') },
      { name: 'two.png', buffer: await makeImage('png') },
    ]);
  });

  it('is accepted hidden, with originals and metadata saved', async () => {
    expect(res.status).toBe(200);
    const [j] = await sql('SELECT show, email FROM journey WHERE rps_key = $1', [res.body.rpsKey]);
    expect(j.email).toBe('tester@example.com');
    const dir = path.join(MEDIA_ROOT, 'rocks', '102', res.body.uuid);
    expect(fs.readdirSync(path.join(dir, 'o'))).toHaveLength(2);
    expect(fs.existsSync(path.join(dir, 'metadata.txt'))).toBe(true);
  });

  it('the background job converts everything and publishes the stop', async () => {
    await waitFor(async () => (await sql('SELECT show FROM journey WHERE rps_key = $1', [res.body.rpsKey]))[0].show, {
      label: 'journey to be shown',
    });
    const imgs = await sql('SELECT show FROM journey_image WHERE rps_key = $1', [res.body.rpsKey]);
    expect(imgs.every((i) => i.show)).toBe(true);
    const dir = path.join(MEDIA_ROOT, 'rocks', '102', res.body.uuid);
    expect(fs.readdirSync(path.join(dir, 'webp'))).toHaveLength(2);
    expect(fs.readdirSync(path.join(dir, 'sm'))).toHaveLength(2);

    const pub = await api().get('/api/rock-posts/102');
    expect(pub.body.some((r) => r.uuid === res.body.uuid)).toBe(true);
  });

  it('emails the admin', async () => {
    await waitFor(async () => (await listMail(ADMIN_INBOX)).some((m) => /Rock 102/.test(m.Subject)), {
      label: 'admin new-journey email',
    });
  });

  it('[S3] never serves metadata.txt or the originals, but serves the webp copies', async () => {
    const base = `/media/rocks/102/${res.body.uuid}`;
    expect((await api().get(`${base}/metadata.txt`)).status).toBe(404);
    expect((await api().get(`${base}/METADATA.TXT`)).status).toBe(404);
    const original = fs.readdirSync(path.join(MEDIA_ROOT, 'rocks', '102', res.body.uuid, 'o'))[0];
    expect((await api().get(`${base}/o/${original}`)).status).toBe(404);
    expect((await api().get(`${base}/o%2F${original}`)).status).toBe(404);
    const webp = fs.readdirSync(path.join(MEDIA_ROOT, 'rocks', '102', res.body.uuid, 'webp'))[0];
    expect((await api().get(`${base}/webp/${webp}`)).status).toBe(200);
  });
});

describe('[S9] one file that fails to process', () => {
  // Uploads already reject files sharp can't even read the header of, so
  // the per-file failure is set up directly: a journey whose second
  // original is garbage, run through the real background job.
  it('publishes the rest, hides the bad one, and tells the admin', async () => {
    await clearMail();
    const uuid = '66666666-6666-4666-8666-666666666666';
    const dir = path.join(MEDIA_ROOT, 'rocks', '101', uuid);
    fs.mkdirSync(path.join(dir, 'o'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'o', `1_${uuid}.jpg`), await makeImage('jpeg'));
    fs.writeFileSync(path.join(dir, 'o', `2_${uuid}.jpg`), Buffer.from('definitely not a jpeg'));
    const [{ rps_key: rpsKey }] = await sql(
      `INSERT INTO journey (rock_qr_number, rock_number, location, date, uuid, show)
       VALUES (101, 101, 'Partial', '2025-09-02', $1, false) RETURNING rps_key`,
      [uuid]
    );
    await sql(
      `INSERT INTO journey_image (rps_key, original_name, current_name, upload_order) VALUES
       ($1, 'good.jpg', $2, 1), ($1, 'broken.jpg', $3, 2)`,
      [rpsKey, `1_${uuid}`, `2_${uuid}`]
    );

    const processImagesInBackground = require('../../src/utils/rock-upload/processImagesInBackground');
    await processImagesInBackground(dir, 'Tester', '101', 'c', 'Partial', '2025-09-02', '', rpsKey);

    expect((await sql('SELECT show FROM journey WHERE rps_key = $1', [rpsKey]))[0].show).toBe(true);
    const imgs = await sql('SELECT original_name, show FROM journey_image WHERE rps_key = $1 ORDER BY upload_order', [
      rpsKey,
    ]);
    expect(imgs).toEqual([
      { original_name: 'good.jpg', show: true },
      { original_name: 'broken.jpg', show: false },
    ]);
    await waitFor(async () => (await listMail(ADMIN_INBOX)).some((m) => /FAILED/.test(m.Subject)), {
      label: 'failure email',
    });
  });

  it('nothing processed: stays hidden, admin still told', async () => {
    await clearMail();
    const uuid = '77777777-7777-4777-8777-777777777777';
    const dir = path.join(MEDIA_ROOT, 'rocks', '101', uuid);
    fs.mkdirSync(path.join(dir, 'o'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'o', `1_${uuid}.jpg`), Buffer.from('junk'));
    const [{ rps_key: rpsKey }] = await sql(
      `INSERT INTO journey (rock_qr_number, rock_number, location, date, uuid, show)
       VALUES (101, 101, 'AllBad', '2025-09-03', $1, false) RETURNING rps_key`,
      [uuid]
    );
    await sql(`INSERT INTO journey_image (rps_key, original_name, current_name, upload_order) VALUES ($1, 'bad.jpg', $2, 1)`, [
      rpsKey,
      `1_${uuid}`,
    ]);
    const processImagesInBackground = require('../../src/utils/rock-upload/processImagesInBackground');
    await processImagesInBackground(dir, 'Tester', '101', 'c', 'AllBad', '2025-09-03', '', rpsKey);
    expect((await sql('SELECT show FROM journey WHERE rps_key = $1', [rpsKey]))[0].show).toBe(false);
    await waitFor(async () => (await listMail(ADMIN_INBOX)).some((m) => /FAILED/.test(m.Subject)), {
      label: 'failure email',
    });
  });
});

describe('input validation', () => {
  it('rejects a bad date and a bad email with 400', async () => {
    expect((await upload({ ...baseFields, date: 'yesterday' })).status).toBe(400);
    expect((await upload({ ...baseFields, email: 'not-an-email' })).status).toBe(400);
    expect((await upload({ ...baseFields, location: 'x'.repeat(300) })).status).toBe(400);
  });

  it('rejects staging ids that could escape the staging folder', async () => {
    const chunk = (stagingId) =>
      api()
        .post('/api/upload-rock/stage-chunk')
        .field('stagingId', stagingId)
        .field('originalName', 'v.mp4')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .attach('chunk', Buffer.from('abc'), 'blob');
    for (const id of ['.', '..', '../x', 'a/b']) expect((await chunk(id)).status).toBe(400);
    expect((await chunk('1728144000000-k3j9x2a1b')).status).toBe(200);

    const manifest = JSON.stringify([{ type: 'staged', stagingId: '.', originalName: 'v.mp4' }]);
    expect((await upload({ ...baseFields, fileManifest: manifest })).status).toBe(400);
  });

  it('an upload that fails mid-way leaves no row and no folder behind', async () => {
    const before = await sql('SELECT count(*)::int AS n FROM journey');
    const res = await upload(baseFields, [{ name: 'junk.jpg', buffer: Buffer.from('not an image') }]);
    expect(res.status).toBe(500);
    expect((await sql('SELECT count(*)::int AS n FROM journey'))[0].n).toBe(before[0].n);
  });
});

describe('rock requests (public form)', () => {
  const ok = { name: 'Req', email: 'req@example.com', address: '1 Road', rocksRequested: 2 };
  it('accepts a valid request', async () => {
    expect((await api().post('/api/rock-requests').send(ok)).status).toBe(201);
  });
  it('400s bad input instead of 500', async () => {
    for (const bad of [
      { ...ok, email: 'nope' },
      { ...ok, name: 'n'.repeat(300) },
      { ...ok, rocksRequested: 0 },
      { ...ok, rocksRequested: 1000 },
      { ...ok, name: 12345, email: ['x'] },
    ]) {
      expect((await api().post('/api/rock-requests').send(bad)).status).toBe(400);
    }
  });
});
