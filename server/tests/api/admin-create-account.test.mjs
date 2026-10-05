// Admin "Add Account" (data/ai-build-docs/admin-create-account/): created
// locked with no usable password; the emailed reset link sets a password,
// unlocks and verifies it.
import { describe, it, expect, beforeAll } from 'vitest';
import { api, bearer, sql, PASSWORD } from '../helpers/server.mjs';
import { clearMail, listMail, waitForMail } from '../helpers/mailpit.mjs';

let A;
beforeAll(async () => {
  A = await bearer('admin');
  await clearMail();
});

const resetToken = (mail) => (mail.HTML || mail.Text).match(/\/reset-password\?token=([A-Za-z0-9_-]+)/)[1];
const NEW_PASSWORD = 'Fresh-Passw0rd!';

describe('create', () => {
  let created;

  it('creates a locked, unverified account and emails a set-password link', async () => {
    const res = await api().post('/api/admin/accounts').set(A).send({
      email: '  New.Person@Example.com ', first_name: 'New', last_name: 'Person',
    });
    expect(res.status).toBe(201);
    created = res.body;
    expect(created).toMatchObject({
      email: 'new.person@example.com', first_name: 'New', last_name: 'Person',
      access_level: 20, is_locked: true, email_verified_dt: null, notify_rock_moves: true,
      setupEmailSent: true,
    });
    expect(created.password_hash).toBeUndefined();
    await waitForMail('new.person@example.com', { subject: /password/i });
  });

  it('cannot be signed into: same generic failure as everything else', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'new.person@example.com', password: '' });
    expect(res.status).toBe(401);
    const guess = await api().post('/api/auth/login').send({ email: 'new.person@example.com', password: PASSWORD });
    expect(guess.status).toBe(401);
  });

  it('the emailed link sets a password, unlocks and verifies it', async () => {
    const token = resetToken(await waitForMail('new.person@example.com'));
    expect((await api().post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD })).status).toBe(200);

    const login = await api().post('/api/auth/login').send({ email: 'new.person@example.com', password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    const [row] = await sql('SELECT is_locked, email_verified_dt, access_level FROM account WHERE id = $1', [created.id]);
    expect(row.is_locked).toBe(false);
    expect(row.email_verified_dt).not.toBeNull();
    expect(row.access_level).toBe(20);
  });
});

describe('options', () => {
  it('a Creator keeps their level and linked artist through the reset', async () => {
    await clearMail();
    const res = await api().post('/api/admin/accounts').set(A).send({
      email: 'artist.kid@example.com', access_level: 30, ra_key: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ access_level: 30, ra_key: 2, artist_name: 'Grandpa Joe' });

    const token = resetToken(await waitForMail('artist.kid@example.com'));
    await api().post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    const [row] = await sql('SELECT access_level, ra_key FROM account WHERE id = $1', [res.body.id]);
    expect(row).toEqual({ access_level: 30, ra_key: 2 });
  });

  it('a User level drops any artist link', async () => {
    const res = await api().post('/api/admin/accounts').set(A).send({ email: 'plain@example.com', ra_key: 1, send_setup_email: false });
    expect(res.status).toBe(201);
    expect(res.body.ra_key).toBeNull();
  });

  it('send_setup_email: false creates it without sending anything', async () => {
    await clearMail();
    const res = await api().post('/api/admin/accounts').set(A).send({ email: 'quiet@example.com', send_setup_email: false });
    expect(res.status).toBe(201);
    expect(res.body.setupEmailSent).toBe(false);
    await new Promise((r) => setTimeout(r, 500));
    expect(await listMail('quiet@example.com')).toEqual([]);
    // ...and the admin can still send it later
    expect((await api().post(`/api/admin/accounts/${res.body.id}/send-reset`).set(A)).status).toBe(200);
    await waitForMail('quiet@example.com');
  });

  it('"Forgot your password?" also works for a created account', async () => {
    await clearMail();
    expect((await api().post('/api/auth/forgot-password').send({ email: 'plain@example.com' })).status).toBe(200);
    await waitForMail('plain@example.com');
  });
});

describe('validation', () => {
  const create = (body) => api().post('/api/admin/accounts').set(A).send({ send_setup_email: false, ...body });

  it('rejects a bad email or level', async () => {
    expect((await create({ email: 'nope' })).status).toBe(400);
    expect((await create({})).status).toBe(400);
    expect((await create({ email: 'lvl@example.com', access_level: 10 })).status).toBe(400);
    expect((await create({ email: 'lvl@example.com', access_level: 99 })).status).toBe(400);
  });

  it('rejects an artist that does not exist', async () => {
    expect((await create({ email: 'ghost.artist@example.com', access_level: 30, ra_key: 9999 })).status).toBe(400);
  });

  it('409s a duplicate email (any case) and an artist already linked', async () => {
    expect((await create({ email: 'USER@example.com' })).status).toBe(409);
    expect((await create({ email: 'second.link@example.com', access_level: 30, ra_key: 2 })).status).toBe(409);
  });

  it('is admin only', async () => {
    expect((await api().post('/api/admin/accounts').send({ email: 'x@example.com' })).status).toBe(401);
    const u = await bearer('user');
    expect((await api().post('/api/admin/accounts').set(u).send({ email: 'x@example.com' })).status).toBe(403);
  });
});
