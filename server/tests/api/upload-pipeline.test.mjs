// [S3 S9 + P2 upload hardening] The public rock upload: accepted hidden,
// processed in the background, then published; a bad file doesn't sink
// the rest; private files are never served.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { api, sql, waitFor, require } from '../helpers/server.mjs';
import { clearMail, listMail, getMail } from '../helpers/mailpit.mjs';
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
    // Rendered from the "Upload Files Failed" template, in a red box on top
    // of the (Active) New Rock Journey email.
    const hit = (await listMail(ADMIN_INBOX)).find((m) => /FAILED/.test(m.Subject));
    const mail = await getMail(hit.ID);
    expect(mail.Subject).toMatch(/^\[1 FILE\(S\) FAILED\] /);
    expect(mail.HTML).toContain('border:2px solid #c0392b');
    expect(mail.HTML).toMatch(/<li>broken\.jpg: [^<]+<\/li>/);
    expect(mail.HTML).toContain(`journey #${rpsKey}`);
    expect(mail.HTML).toContain('The other 1 file(s) are published.');
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
    const hit = (await listMail(ADMIN_INBOX)).find((m) => /FAILED/.test(m.Subject));
    expect((await getMail(hit.ID)).HTML).toContain('Nothing processed, so the journey is still hidden.');
  });

  it('the files-failed email still goes out on its own when New Rock Journey is inactive, using the edited template', async () => {
    await clearMail();
    await sql(`UPDATE page_content SET visible = false WHERE page_slug = 'new-journey-email'`);
    await sql(
      `UPDATE page_content SET published_email_subject = 'Edited: {FAILED_COUNT} bad on rock {ROCK_NUMBER}',
              published_body = '<p>Edited body</p>{FAILED_FILES}'
       WHERE page_slug = 'upload-files-failed-email'`
    );
    try {
      const uuid = '88888888-8888-4888-8888-888888888888';
      const dir = path.join(MEDIA_ROOT, 'rocks', '101', uuid);
      fs.mkdirSync(path.join(dir, 'o'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'o', `1_${uuid}.jpg`), Buffer.from('junk'));
      const [{ rps_key: rpsKey }] = await sql(
        `INSERT INTO journey (rock_qr_number, rock_number, location, date, uuid, show)
         VALUES (101, 101, 'Edited', '2025-09-04', $1, false) RETURNING rps_key`,
        [uuid]
      );
      await sql(
        `INSERT INTO journey_image (rps_key, original_name, current_name, upload_order) VALUES ($1, 'junk.jpg', $2, 1)`,
        [rpsKey, `1_${uuid}`]
      );
      const processImagesInBackground = require('../../src/utils/rock-upload/processImagesInBackground');
      await processImagesInBackground(dir, 'Tester', '101', 'c', 'Edited', '2025-09-04', '', rpsKey);
      await waitFor(async () => (await listMail(ADMIN_INBOX)).some((m) => /^Edited: 1 bad on rock 101$/.test(m.Subject)), {
        label: 'edited failure email',
      });
      const hit = (await listMail(ADMIN_INBOX)).find((m) => /^Edited:/.test(m.Subject));
      const mail = await getMail(hit.ID);
      expect(mail.HTML).toContain('<p>Edited body</p><ul><li>junk.jpg: ');
      expect(mail.HTML).not.toContain('border:2px solid #c0392b');
    } finally {
      await sql(`UPDATE page_content SET visible = true WHERE page_slug = 'new-journey-email'`);
    }
  });

  it('a processing crash sends the "Upload Processing Failed" email', async () => {
    await clearMail();
    const processImagesInBackground = require('../../src/utils/rock-upload/processImagesInBackground');
    const dir = path.join(MEDIA_ROOT, 'rocks', '101', 'does-not-exist');
    // ensureDir creates webp/ etc, but o/ is missing, so readdir throws.
    await processImagesInBackground(dir, 'Tester', '101', 'c', 'Crash', '2025-09-05', '', 999999);
    await waitFor(async () => (await listMail(ADMIN_INBOX)).some((m) => /processing FAILED: Rock 101/.test(m.Subject)), {
      label: 'processing-failed email',
    });
    const hit = (await listMail(ADMIN_INBOX)).find((m) => /processing FAILED/.test(m.Subject));
    const mail = await getMail(hit.ID);
    expect(mail.HTML).toContain('journey #999999');
    expect(mail.HTML).toContain('does-not-exist');
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
  const ok = { name: 'Req', email: 'req@example.com', address: '1 Road', rocksRequested: 2, noRush: true };
  const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
  it('accepts a valid request', async () => {
    expect((await api().post('/api/rock-requests').send(ok)).status).toBe(201);
  });
  it('stores a need-by date, or no rush (which drops any date)', async () => {
    const dated = await api().post('/api/rock-requests').send({ ...ok, noRush: false, neededBy: isoDay(30) });
    expect(dated.status).toBe(201);
    const rush = await api().post('/api/rock-requests').send({ ...ok, neededBy: isoDay(30) });
    const rows = await sql(
      `SELECT rq_key, to_char(needed_by, 'YYYY-MM-DD') AS needed_by, no_rush FROM rock_requests WHERE rq_key = ANY($1::int[]) ORDER BY rq_key`,
      [[dated.body.rq_key, rush.body.rq_key]]
    );
    expect(rows).toEqual([
      { rq_key: dated.body.rq_key, needed_by: isoDay(30), no_rush: false },
      { rq_key: rush.body.rq_key, needed_by: null, no_rush: true },
    ]);
  });
  it('ignores admin comments sent to the public form', async () => {
    const res = await api().post('/api/rock-requests').send({ ...ok, comments: 'sneaky' });
    expect(res.status).toBe(201);
    expect((await sql('SELECT comments FROM rock_requests WHERE rq_key = $1', [res.body.rq_key]))[0].comments).toBeNull();
  });
  it('400s bad input instead of 500', async () => {
    for (const bad of [
      { ...ok, email: 'nope' },
      { ...ok, name: 'n'.repeat(300) },
      { ...ok, rocksRequested: 0 },
      { ...ok, rocksRequested: 1000 },
      { ...ok, name: 12345, email: ['x'] },
      { ...ok, noRush: false },
      { ...ok, noRush: false, neededBy: isoDay(-5) },
      { ...ok, noRush: false, neededBy: '2026-02-30' },
      { ...ok, noRush: false, neededBy: 'soon' },
    ]) {
      expect((await api().post('/api/rock-requests').send(bad)).status).toBe(400);
    }
  });
});
