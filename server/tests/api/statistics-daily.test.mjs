// GET /api/statistics/daily (admin Visitors by Day panel): continuous days,
// totals + unique IPs per day and per platform, bucketed in the viewer's tz.
// Visits are planted 3-4 days back so other suites' "now" rows don't touch them.
import { describe, it, expect, beforeAll } from 'vitest';
import { api, bearer, sql } from '../helpers/server.mjs';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14)';

const utcDay = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const D3 = utcDay(-3);
const D4 = utcDay(-4);

let A;
beforeAll(async () => {
  A = await bearer('admin');
  const [{ rcs_key }] = await sql(`INSERT INTO counter (rock_qr_number) VALUES ('daily-test') RETURNING rcs_key`);
  const add = (ip, ua, at) =>
    sql('INSERT INTO counter_tracking (rcs_key, ip_address, user_agent, create_dt) VALUES ($1, $2, $3, $4)', [rcs_key, ip, ua, at]);
  await add('10.0.0.1', IPHONE, `${D3}T12:00:00Z`);
  await add('10.0.0.1', IPHONE, `${D3}T13:00:00Z`);
  await add('10.0.0.2', WINDOWS, `${D3}T14:00:00Z`);
  // 02:00 UTC on D3 is still D4 in New York.
  await add('10.0.0.3', ANDROID, `${D3}T02:00:00Z`);
});

const daily = (query) => api().get('/api/statistics/daily').set(A).query(query);

describe('visitors by day', () => {
  it('returns one row per day through today, zero-filled', async () => {
    const { status, body } = await daily({ range: '7', tz: 'UTC' });
    expect(status).toBe(200);
    expect(body.days).toHaveLength(7);
    expect(body.days[6].date).toBe(utcDay(0));
    expect(body.platforms).toContain('Other');
  });

  it('counts total and unique visitors, overall and per platform', async () => {
    const { body } = await daily({ range: '7', tz: 'UTC' });
    const day = body.days.find((d) => d.date === D3);
    expect(day).toMatchObject({ total: 4, unique: 3 });
    expect(day.platforms.iPhone).toEqual({ total: 2, unique: 1 });
    expect(day.platforms.Windows).toEqual({ total: 1, unique: 1 });
    expect(day.platforms.Android).toEqual({ total: 1, unique: 1 });
  });

  it('buckets days in the requested timezone', async () => {
    const { body } = await daily({ range: '7', tz: 'America/New_York' });
    expect(body.days.find((d) => d.date === D3)).toMatchObject({ total: 3, unique: 2 });
    expect(body.days.find((d) => d.date === D4).platforms.Android.total).toBe(1);
  });

  it('this year starts Jan 1 and all starts at the first visit', async () => {
    const year = (await daily({ range: 'year', tz: 'UTC' })).body.days;
    expect(year[0].date).toBe(`${utcDay(0).slice(0, 4)}-01-01`);
    const all = (await daily({ range: 'all', tz: 'UTC' })).body.days;
    expect(all[0].date <= D3).toBe(true);
    expect(all.at(-1).date).toBe(utcDay(0));
  });

  it('rejects an unknown range or timezone', async () => {
    expect((await daily({ range: '14' })).status).toBe(400);
    expect((await daily({ range: '7', tz: 'Not/AZone' })).status).toBe(400);
  });
});
