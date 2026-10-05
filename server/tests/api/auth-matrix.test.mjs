// [S1 S2 S4 S10 S18] Every API route and who may call it. One table, so a
// route mounted later without the right guard -- or a guard removed --
// fails here. Add new routes to ROUTES when you add them.
//
//   public -- anyone (no 401/403 when signed out)
//   user   -- signed in, level >= 20 (401 signed out)
//   admin  -- level 50 (401 signed out, 403 for a level-20 user)
//   gone   -- deliberately removed; must stay 404
//
// Mutations go to ids that don't exist (999999) with no body, so this file
// only exercises the gate and never changes seed data.
import { describe, it, expect } from 'vitest';
import { api, bearer } from '../helpers/server.mjs';

const X = 999999;

const ROUTES = [
  // auth
  ['POST', '/api/auth/signup', 'public'],
  ['POST', '/api/auth/verify-email', 'public'],
  ['POST', '/api/auth/resend-verification', 'public'],
  ['POST', '/api/auth/login', 'public', { allow401: true }], // 401 = bad credentials, not a gate
  ['POST', '/api/auth/forgot-password', 'public'],
  ['POST', '/api/auth/reset-password', 'public'],
  ['GET', '/api/auth/me', 'user'],

  // public site
  ['POST', '/api/upload-rock/stage-chunk', 'public'],
  ['POST', '/api/upload-rock', 'public'],
  ['GET', '/api/ip', 'public'],
  ['GET', '/api/location', 'public'],
  ['POST', '/api/rock-count', 'public'],
  ['GET', '/api/rock-posts/totals', 'public'],
  ['GET', '/api/rock-posts/allrocks', 'public'],
  ['GET', '/api/rock-posts', 'public'],
  ['GET', '/api/rock-posts/101', 'public'],
  ['GET', '/api/rock-posts/locations/all', 'public'],
  ['POST', '/api/rock-requests', 'public'],
  ['GET', '/api/albums', 'public'],
  ['GET', '/api/albums/1/photos', 'public'],
  ['GET', '/api/ar-details', 'public'],
  ['GET', '/api/music', 'public'],
  ['PUT', `/api/music/${X}/increment-play`, 'public'],
  ['POST', '/api/unmatched-path', 'public'],
  ['GET', '/api/pages', 'public'],
  ['GET', '/api/pages/home/content', 'public'],
  ['GET', '/api/honoring-aiden/entries', 'public'],
  ['GET', '/api/honoring-aiden/entries/about-aiden', 'public'],
  ['POST', '/api/honoring-aiden/entries/nope/view', 'public'],

  // signed-in users
  ['GET', '/api/follows', 'user'],
  ['GET', '/api/follows/ids', 'user'],
  ['POST', '/api/follows', 'user'],
  ['DELETE', `/api/follows/${X}`, 'user'],
  ['PUT', '/api/follows/settings', 'user'],

  // admin: dashboard data that used to be public [S4 S18]
  ['GET', '/api/server-health', 'admin', { skipAdminCall: true }], // admin call does real network lookups
  ['GET', '/api/statistics', 'admin'],
  ['GET', '/api/unmatched-path', 'admin'],

  // admin
  ['GET', '/api/users', 'admin'],
  ['POST', '/api/users', 'admin'],
  ['PUT', `/api/users/${X}`, 'admin'],
  ['DELETE', `/api/users/${X}`, 'admin'],
  ['GET', '/api/rocks', 'admin'],
  ['POST', '/api/rocks', 'admin'],
  ['PUT', `/api/rocks/${X}`, 'admin'],
  ['DELETE', `/api/rocks/${X}`, 'admin'],
  ['GET', '/api/rock-requests', 'admin'],
  ['POST', '/api/rock-requests/admin-create', 'admin'],
  ['PUT', `/api/rock-requests/${X}`, 'admin'],
  ['DELETE', `/api/rock-requests/${X}`, 'admin'],
  ['POST', `/api/rock-requests/${X}/undelete`, 'admin'],
  ['POST', `/api/rock-requests/${X}/send-email`, 'admin'],
  ['POST', '/api/albums/sync', 'admin', { skipAdminCall: true }],
  ['PATCH', `/api/albums/${X}/show`, 'admin'],
  ['DELETE', `/api/albums/${X}`, 'admin'],
  ['POST', '/api/albums/reorder-all', 'admin', { skipAdminCall: true }],
  ['PUT', `/api/albums/${X}`, 'admin'],
  ['GET', `/api/albums/${X}`, 'admin'],
  ['POST', '/api/albums', 'admin'],
  ['POST', '/api/albums/nope/init-folder', 'admin', { skipAdminCall: true }],
  ['POST', '/api/albums/reorder', 'admin'],
  ['POST', '/api/albums/photos/reorder', 'admin'],
  ['POST', `/api/albums/photos/${X}/toggle-show`, 'admin'],
  ['DELETE', `/api/albums/photos/${X}`, 'admin'],
  ['PUT', `/api/albums/photos/${X}`, 'admin'],
  ['POST', '/api/albums/nope/upload-images', 'admin', { skipAdminCall: true }],
  ['POST', '/api/albums/nope/upload-chunk', 'admin', { skipAdminCall: true }],
  ['GET', '/api/journey-admin', 'admin'],
  ['POST', `/api/journey-admin/${X}/toggle-show`, 'admin'],
  ['DELETE', `/api/journey-admin/${X}`, 'admin'],
  ['GET', `/api/journey-admin/${X}/images`, 'admin'],
  ['POST', `/api/journey-admin/${X}/images`, 'admin'],
  ['POST', `/api/journey-admin/images/${X}/toggle-show`, 'admin'],
  ['DELETE', `/api/journey-admin/images/${X}`, 'admin'],
  ['PUT', `/api/journey-admin/${X}`, 'admin'],
  ['POST', '/api/music', 'admin'],
  ['PUT', `/api/music/${X}`, 'admin'],
  ['PUT', `/api/music/${X}/toggle-show`, 'admin'],
  ['DELETE', `/api/music/${X}`, 'admin'],
  ['GET', '/api/admin/path-display-names', 'admin'],
  ['POST', '/api/admin/path-display-names', 'admin'],
  ['PUT', `/api/admin/path-display-names/${X}`, 'admin'],
  ['DELETE', `/api/admin/path-display-names/${X}`, 'admin'],
  ['GET', '/api/admin/pages', 'admin'],
  ['POST', '/api/admin/pages/reorder', 'admin'],
  ['PATCH', '/api/admin/pages/nope/visible', 'admin'],
  ['PUT', '/api/admin/pages/nope/draft', 'admin'],
  ['GET', '/api/admin/pages/home/preview', 'admin'],
  ['POST', '/api/admin/pages/nope/render', 'admin'],
  ['GET', '/api/admin/pages/nope/template', 'admin'],
  ['POST', '/api/admin/pages/nope/send', 'admin'],
  ['POST', '/api/admin/pages/nope/publish', 'admin'],
  ['GET', '/api/admin/jobs/send-emails-catchup', 'admin'],
  ['POST', '/api/admin/jobs/send-emails-catchup/send', 'admin', { skipAdminCall: true }],
  ['POST', '/api/admin/jobs/send-email', 'admin'],
  ['GET', '/api/admin/settings/nope', 'admin'],
  ['PUT', '/api/admin/settings/nope', 'admin'],
  ['GET', '/api/admin/honoring-aiden/entries', 'admin'],
  ['GET', '/api/admin/honoring-aiden/entries/slug/about-aiden', 'admin'],
  ['POST', '/api/admin/honoring-aiden/entries', 'admin'],
  ['PUT', `/api/admin/honoring-aiden/entries/${X}`, 'admin'],
  ['PATCH', `/api/admin/honoring-aiden/entries/${X}/move`, 'admin'],
  ['PATCH', `/api/admin/honoring-aiden/entries/${X}/archive`, 'admin'],
  ['PATCH', '/api/admin/honoring-aiden/entries/reorder', 'admin'],
  ['POST', '/api/admin/honoring-aiden/media', 'admin'],
  ['POST', '/api/admin/honoring-aiden/media/stage-chunk', 'admin'],
  ['GET', `/api/admin/honoring-aiden/entries/${X}/media`, 'admin'],
  ['DELETE', `/api/admin/honoring-aiden/entries/${X}/media`, 'admin'],
  ['GET', '/api/admin/accounts', 'admin'],
  ['POST', '/api/admin/accounts', 'admin'],
  ['PUT', `/api/admin/accounts/${X}`, 'admin'],
  ['POST', `/api/admin/accounts/${X}/send-reset`, 'admin'],
  ['DELETE', `/api/admin/accounts/${X}`, 'admin'],

  // removed: unauthenticated server-file / test endpoints [S1 S2 S10]
  ['POST', '/api/create-images', 'gone'],
  ['POST', '/api/write-file', 'gone'],
  ['GET', '/api/read-file/x.txt', 'gone'],
  ['GET', '/api/testdata/count', 'gone'],
  ['POST', '/api/testdata', 'gone'],
  ['GET', '/api/test', 'gone'],
];

const call = (method, url, headers = {}) =>
  api()[method.toLowerCase()](url).set(headers);

describe('auth gate matrix', () => {
  for (const [method, url, gate, opts = {}] of ROUTES) {
    describe(`${method} ${url} [${gate}]`, () => {
      if (gate === 'gone') {
        it('is removed (404 even for an admin)', async () => {
          expect((await call(method, url)).status).toBe(404);
          expect((await call(method, url, await bearer('admin'))).status).toBe(404);
        });
        return;
      }

      it('signed out', async () => {
        const { status } = await call(method, url);
        if (gate === 'public') expect(opts.allow401 ? [403] : [401, 403]).not.toContain(status);
        else expect(status).toBe(401);
      });

      if (gate === 'admin') {
        it('level-20 user is forbidden', async () => {
          expect((await call(method, url, await bearer('user'))).status).toBe(403);
        });
      }
      if (gate === 'user') {
        it('level-20 user is allowed', async () => {
          expect([401, 403]).not.toContain((await call(method, url, await bearer('user'))).status);
        });
      }
      if (gate === 'admin' && !opts.skipAdminCall) {
        it('admin is allowed', async () => {
          const { status } = await call(method, url, await bearer('admin'));
          expect([401, 403]).not.toContain(status);
        });
      }
    });
  }
});
