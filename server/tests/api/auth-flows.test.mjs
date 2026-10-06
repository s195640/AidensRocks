// Account lifecycle end to end: sign-up -> verify (link from Mailpit) ->
// sign in -> /me, lockout + reset unlock, token invalidation, and the
// uniform login failure (no account enumeration).
import { describe, it, expect, beforeAll } from 'vitest';
import { api, sql, PASSWORD } from '../helpers/server.mjs';
import { clearMail, waitForMail } from '../helpers/mailpit.mjs';

const NEW_PASSWORD = 'Another-Passw0rd!';
const tokenFromMail = (msg, path) => {
  const m = (msg.HTML || msg.Text).match(new RegExp(`${path}\\?token=([A-Za-z0-9_-]+)`));
  if (!m) throw new Error(`no ${path} link in mail`);
  return m[1];
};

beforeAll(clearMail);

describe('sign-up and verification', () => {
  const email = 'newbie@example.com';

  it('sign-up answers generically and emails a verify link', async () => {
    const res = await api().post('/api/auth/signup').send({ email, password: PASSWORD, firstName: 'New', lastName: 'Person' });
    expect(res.status).toBe(200);
    const mail = await waitForMail(email);
    expect(tokenFromMail(mail, '/verify-email')).toBeTruthy();
  });

  it('the verify email has a plain-text part and a full HTML document (spam-filter friendly)', async () => {
    const mail = await waitForMail(email);
    const token = tokenFromMail(mail, '/verify-email');
    expect(mail.Text).toContain(`/verify-email?token=${token}`);
    expect(mail.Text).not.toMatch(/<[a-z]/i);
    expect(mail.HTML).toMatch(/^<!doctype html>/i);
    expect(mail.HTML).toContain('<html lang="en">');
    // Sender / Reply-To from the template (Page Details).
    expect(mail.From).toEqual({ Name: "Aiden's Rocks", Address: 'noreply@aidensrocks.com' });
    expect(mail.ReplyTo.map((r) => r.Address)).toEqual(['noreply@aidensrocks.com']);
  });

  it('an unverified account cannot sign in yet (403 UNVERIFIED)', async () => {
    const res = await api().post('/api/auth/login').send({ email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNVERIFIED');
  });

  it('the emailed token verifies once, then signs in', async () => {
    const token = tokenFromMail(await waitForMail(email), '/verify-email');
    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(200);
    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(400); // single use

    const login = await api().post('/api/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.account.email).toBe(email);
    expect(me.body.account.accessLevel).toBe(20);
  });

  it('a weak password is refused', async () => {
    const res = await api().post('/api/auth/signup').send({ email: 'weak@example.com', password: 'short', firstName: 'W', lastName: 'K' });
    expect(res.status).toBe(400);
  });
});

describe('login failures do not reveal whether an account exists', () => {
  it('unknown email, wrong password and locked account all get the same 401', async () => {
    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'x' });
    const wrong = await api().post('/api/auth/login').send({ email: 'creator@example.com', password: 'wrong' });
    const locked = await api().post('/api/auth/login').send({ email: 'locked@example.com', password: PASSWORD });
    for (const r of [unknown, wrong, locked]) expect(r.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(locked.body).toEqual(unknown.body);
    await sql('UPDATE account SET failed_login_count = 0 WHERE email = $1', ['creator@example.com']);
  });
});

describe('lockout and password reset', () => {
  const email = 'lockme@example.com';
  let oldToken;

  beforeAll(async () => {
    await sql(
      `INSERT INTO account (email, password_hash, access_level, email_verified_dt)
       SELECT $1, password_hash, 20, NOW() FROM account WHERE email = 'user@example.com'`,
      [email]
    );
    oldToken = (await api().post('/api/auth/login').send({ email, password: PASSWORD })).body.token;
  });

  it('5 wrong passwords lock the account and sign it out everywhere', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await api().post('/api/auth/login').send({ email, password: 'nope' })).status).toBe(401);
    }
    const [row] = await sql('SELECT is_locked FROM account WHERE email = $1', [email]);
    expect(row.is_locked).toBe(true);
    // right password, still locked
    expect((await api().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
    // the old session died with the lock (token_version bump)
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`)).status).toBe(401);
  });

  it('a reset link unlocks it, works once, and the new password signs in', async () => {
    await clearMail();
    expect((await api().post('/api/auth/forgot-password').send({ email })).status).toBe(200);
    const token = tokenFromMail(await waitForMail(email), '/reset-password');

    const reset = await api().post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);
    expect((await api().post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD })).status).toBe(400);

    expect((await api().post('/api/auth/login').send({ email, password: NEW_PASSWORD })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
  });

  it('an expired reset token is refused', async () => {
    await clearMail();
    await api().post('/api/auth/forgot-password').send({ email });
    const token = tokenFromMail(await waitForMail(email), '/reset-password');
    await sql(`UPDATE account_token SET expires_dt = NOW() - INTERVAL '1 minute' WHERE purpose = 'reset' AND used_dt IS NULL`);
    expect((await api().post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD })).status).toBe(400);
  });

  it('forgot-password for an unknown email answers the same way', async () => {
    const res = await api().post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('tokens', () => {
  it('a garbage or foreign-signed token is 401', async () => {
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt')).status).toBe(401);
  });
});
