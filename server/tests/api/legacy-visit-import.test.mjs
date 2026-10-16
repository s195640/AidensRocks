// data/sql/migrations/0.15-site-tracking/05_oneserver_import_legacy_visits.sql:
// old counter_tracking rows become visits + one page_view each, shown on the
// Activity page's Visitors panel; rows from after the new tracker started,
// bots, and re-runs add nothing.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, bearer, sql } from '../helpers/server.mjs';

const MIGRATION = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../data/sql/migrations/0.15-site-tracking/05_oneserver_import_legacy_visits.sql'
);
const runImport = () => sql(fs.readFileSync(MIGRATION, 'utf8'));

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1)';
const SCREEN = JSON.stringify({ width: 390, height: 844, colorDepth: 24 });

const daysAgo = (n, hour = 12) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

let A;
beforeAll(async () => {
  A = await bearer('admin');
  const [{ rcs_key }] = await sql(`INSERT INTO counter (rock_qr_number) VALUES ('import-test') RETURNING rcs_key`);
  const add = (ip, ua, at, extra = {}) =>
    sql(
      `INSERT INTO counter_tracking (rcs_key, ip_address, user_agent, create_dt, screen, page_url, referrer, language, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'en-US', 'America/New_York')`,
      [rcs_key, ip, ua, at, SCREEN, extra.url || 'https://aidensrocks.com/?r=12', extra.referrer ?? '']
    );
  await add('8.8.8.8', IPHONE, daysAgo(5), { referrer: 'https://www.facebook.com/x' });
  await add('8.8.8.8', IPHONE, daysAgo(4), { referrer: 'https://aidensrocks.com/map' });
  await add('9.9.9.9', WINDOWS, daysAgo(4));
  await add('192.168.1.20', WINDOWS, daysAgo(4), { url: 'http://192.168.1.50/' });
  await add('7.7.7.7', BOT, daysAgo(4));
  // The new tracker's first visit is 2 days ago; older rows are imported.
  await sql(
    `INSERT INTO visit (id, device_id, started_at, landing_path, platform)
     VALUES (gen_random_uuid(), gen_random_uuid(), $1, '/', 'Mac')`,
    [daysAgo(2)]
  );
  await add('6.6.6.6', WINDOWS, daysAgo(1));
  await runImport();
});

const imported = () =>
  sql(`SELECT * FROM visit WHERE client_version = 'legacy-import' ORDER BY started_at, ip_address`);

describe('legacy visit import', () => {
  it('copies rows from before the new tracker, skipping bots', async () => {
    const visits = await imported();
    expect(visits.map((v) => v.ip_address)).toEqual(['8.8.8.8', '192.168.1.20', '8.8.8.8', '9.9.9.9']);
  });

  it('maps each row like the new tracker would', async () => {
    const [first, internal, second] = await imported();
    expect(first).toMatchObject({
      landing_path: '/',
      referrer: 'https://www.facebook.com/x',
      platform: 'iPhone',
      screen: '390x844',
      language: 'en-US',
      timezone: 'America/New_York',
      is_returning: false,
      is_internal: false,
    });
    // Same IP + browser = the same device; a same-site referrer is dropped.
    expect(second).toMatchObject({ device_id: first.device_id, is_returning: true, referrer: null });
    expect(internal.is_internal).toBe(true);
  });

  it('adds one imported page view per visit', async () => {
    const events = await sql(
      `SELECT e.type, e.path, e.meta, e.created_at = v.started_at AS same_time
         FROM site_event e JOIN visit v ON v.id = e.visit_id
        WHERE v.client_version = 'legacy-import'`
    );
    expect(events).toHaveLength(4);
    for (const e of events) {
      expect(e).toMatchObject({ type: 'page_view', path: '/', same_time: true });
      expect(e.meta.imported).toBe(true);
    }
  });

  it('shows on the Visitors panel', async () => {
    const { status, body } = await api()
      .get('/api/admin/activity/visitors')
      .set(A)
      .query({ range: '7', tz: 'UTC' });
    expect(status).toBe(200);
    // External only by default: 2 devices, 3 visits, plus the new tracker's
    // visit has no events, so it isn't counted.
    expect(body.totals).toMatchObject({ visitors: 2, visits: 3, page_views: 3 });
  });

  it('adds nothing when run again', async () => {
    await runImport();
    expect(await imported()).toHaveLength(4);
    const [{ n }] = await sql(`SELECT COUNT(*)::int AS n FROM site_event WHERE meta->>'imported' = 'true'`);
    expect(n).toBe(4);
  });
});
