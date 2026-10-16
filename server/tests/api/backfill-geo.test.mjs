// scripts/backfillGeo.js (bug-sweep #15): fills only blank visitor
// locations, marks them, and never touches a real one.
import { describe, it, expect, beforeAll } from 'vitest';
import { require, pool, sql } from '../helpers/server.mjs';

const { backfillGeo } = require('../../scripts/backfillGeo.js');

const REAL = { country: 'CA', region: 'ON', city: 'Toronto', latitude: 43.6, longitude: -79.4 };
const geoOf = async (key) => (await sql('SELECT geo FROM counter_tracking WHERE rct_key = $1', [key]))[0].geo;

let keys;
beforeAll(async () => {
  const [{ rcs_key }] = await sql(`INSERT INTO counter (rock_qr_number) VALUES ('geo-test') RETURNING rcs_key`);
  const add = async (ip, geo) =>
    (await sql(
      'INSERT INTO counter_tracking (rcs_key, ip_address, geo) VALUES ($1, $2, $3::jsonb) RETURNING rct_key',
      [rcs_key, ip, geo === undefined ? null : JSON.stringify(geo)]
    ))[0].rct_key;
  keys = {
    nullGeo: await add('8.8.8.8'),
    emptyGeo: await add('8.8.8.8', { country: null, region: null, city: null, latitude: null, longitude: null }),
    emptyStrings: await add('::ffff:8.8.8.8', { country: '', region: '', city: '', latitude: null, longitude: null }),
    real: await add('8.8.8.8', REAL),
    unknownIp: await add('Unknown'),
    cloudflareIp: await add('162.159.114.9'),
  };
});

describe('backfill-geo [#15]', () => {
  it('preview writes nothing', async () => {
    const [visits] = await backfillGeo(pool);
    expect(visits.table).toBe('counter_tracking');
    expect(visits.fillable).toBeGreaterThanOrEqual(3);
    expect(visits.updated).toBe(0);
    expect(await geoOf(keys.nullGeo)).toBeNull();
  });

  it('--apply fills only blank rows, marks them, and leaves real or unplaceable ones alone', async () => {
    await backfillGeo(pool, { apply: true });
    for (const k of [keys.nullGeo, keys.emptyGeo, keys.emptyStrings]) {
      expect(await geoOf(k)).toMatchObject({ country: 'US', backfilled: true });
    }
    expect(await geoOf(keys.real)).toEqual(REAL);
    expect(await geoOf(keys.unknownIp)).toBeNull();
    expect(await geoOf(keys.cloudflareIp)).toBeNull();
  });

  it('is safe to re-run: nothing left to fill', async () => {
    const [visits] = await backfillGeo(pool, { apply: true });
    expect(visits.updated).toBe(0);
    expect(await geoOf(keys.real)).toEqual(REAL);
  });
});
