// Tiny generated images/files standing in for real media, so the API and
// the E2E browser runs have something to serve.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

// A solid-colour 64x48 image in the given format ('jpeg' | 'png' | 'webp').
export function makeImage(format = 'jpeg', color = { r: 120, g: 160, b: 200 }) {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: color } })
    [format]()
    .toBuffer();
}

async function writeImage(file, format = 'webp') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await makeImage(format));
}

// Files matching the rows in tests/fixtures/seed.sql.
export async function writeSeedMedia(mediaRoot) {
  const journeys = [
    [101, '11111111-1111-4111-8111-111111111111'],
    [101, '22222222-2222-4222-8222-222222222222'],
    [102, '33333333-3333-4333-8333-333333333333'],
    [103, '44444444-4444-4444-8444-444444444444'],
    [104, '55555555-5555-4555-8555-555555555555'],
  ];
  for (const [rock, uuid] of journeys) {
    const dir = path.join(mediaRoot, 'rocks', String(rock), uuid);
    const name = `${uuid}_1`;
    await writeImage(path.join(dir, 'o', `${name}.jpg`), 'jpeg');
    await writeImage(path.join(dir, 'webp', `${name}.webp`));
    await writeImage(path.join(dir, 'sm', `${name}.webp`));
    fs.writeFileSync(path.join(dir, 'metadata.txt'), 'Email: private@example.com\n');
  }
  for (const rock of [101, 102, 103, 104]) {
    await writeImage(path.join(mediaRoot, 'catalog', String(rock), 'a.webp'));
    await writeImage(path.join(mediaRoot, 'catalog', String(rock), 'a_sm.webp'));
  }
  for (const [album, photo] of [['visible-album', 'p1.webp'], ['visible-album', 'p2.webp']]) {
    for (const sub of ['o', 'webp', 'webp300x300']) {
      await writeImage(path.join(mediaRoot, 'albums', album, sub, photo));
    }
  }
  fs.mkdirSync(path.join(mediaRoot, 'albums', 'hidden-album', 'o'), { recursive: true });
  for (const m of [1, 2]) {
    await writeImage(path.join(mediaRoot, 'music', String(m), 'sm.webp'));
    await writeImage(path.join(mediaRoot, 'music', String(m), 'full.webp'));
  }
}
