// Turns a minified browser stack ("index-a1b2c3.js:1:48213") into real file
// names, functions and lines, using the build's private source maps.
//
// The client build makes hidden source maps (vite.config.js); the deploy
// copies them to SOURCEMAP_DIR/<version>/assets/*.js.map (see
// data/docker/docker-client-prod and the plan's "Readable stack traces").
// They're never served to the public. If a map is missing (local dev, an
// old release) the stack is returned unchanged.
const fs = require('fs/promises');
const path = require('path');
const { SourceMapConsumer } = require('source-map');
const { logError } = require('./log');

// A parsed map of the main bundle holds ~50 MB, so only a few are kept, and
// all are released after 10 minutes without anyone opening an error.
const CACHE_LIMIT = 3;
const IDLE_MS = 10 * 60 * 1000;
let idleTimer = null;

function releaseAll() {
  for (const promise of cache.values()) promise.then((c) => c?.destroy()).catch(() => {});
  cache.clear();
}
const cache = new Map(); // "<version>/<file>" -> Promise<SourceMapConsumer|null>

const mapDir = () => process.env.SOURCEMAP_DIR || path.resolve(process.cwd(), 'sourcemaps');

function loadConsumer(version, file) {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(releaseAll, IDLE_MS);
  idleTimer.unref();
  const key = `${version}/${file}`;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    // Only plain build file names, never a path: the name comes from a stack
    // the browser sent.
    // A version is digits and dots ("0.15.16"), never "..".
    if (!/^[\w-]+(\.[\w-]+)*\.js$/.test(file) || !/^\d+(\.\d+)*$/.test(version)) return null;
    try {
      const raw = await fs.readFile(path.join(mapDir(), version, 'assets', `${file}.map`), 'utf8');
      return await new SourceMapConsumer(JSON.parse(raw));
    } catch {
      return null;
    }
  })();
  cache.set(key, promise);
  if (cache.size > CACHE_LIMIT) {
    const [oldestKey, oldest] = cache.entries().next().value;
    cache.delete(oldestKey);
    // Freed later, not now: a stack being resolved may still be using it.
    setTimeout(() => oldest.then((c) => c?.destroy()).catch(() => {}), 60 * 1000).unref();
  }
  return promise;
}

// Chrome: "    at fn (https://site/assets/index-abc.js:1:2345)"
// Firefox/Safari: "fn@https://site/assets/index-abc.js:1:2345"
const FRAME_RE = /^(\s*at\s+(?:(.+?)\s+\()?|(.*?)@)(?:https?:\/\/[^/]+)?\/assets\/([\w.-]+\.js):(\d+):(\d+)\)?\s*$/;

async function resolveStack(stack, version) {
  if (!stack || !version || version === 'unknown') return stack;
  try {
    const lines = String(stack).split('\n');
    const out = await Promise.all(
      lines.map(async (line) => {
        const m = line.match(FRAME_RE);
        if (!m) return line;
        const consumer = await loadConsumer(version, m[4]);
        if (!consumer) return line;
        const pos = consumer.originalPositionFor({ line: Number(m[5]), column: Number(m[6]) });
        if (!pos.source) return line;
        const source = pos.source.replace(/^(\.\.\/)+/, '').replace(/^webpack:\/\/\//, '');
        return `    at ${pos.name || m[2] || m[3] || '<anonymous>'} (${source}:${pos.line}:${pos.column})`;
      })
    );
    return out.join('\n');
  } catch (err) {
    logError('Could not resolve a stack trace:', err.message);
    return stack;
  }
}

module.exports = resolveStack;
