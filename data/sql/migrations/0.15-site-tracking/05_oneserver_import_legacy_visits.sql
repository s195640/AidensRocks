-- STEP 05 of 05 -- run on ONE server only (Node A), after the new code is
-- deployed (so the new tracker has started recording). Do NOT run it on
-- Node B: visit and site_event replicate, so Node B gets these rows from
-- Node A. Running it on both would conflict.
--
-- Copies the old Home-page visit log (counter_tracking) into the new
-- tables, so the Activity page's Visitors chart has history from before
-- site tracking. Each old row becomes:
--   visit       client_version = 'legacy-import'
--   site_event  one page_view, meta {"imported": true}
-- Nothing else is copied (no QR scans, bad URLs, song or entry counts).
--
-- What the old data can and can't say:
--   - The old counter ran only on the Home page, once per browser tab, so
--     only Home-page visits exist, and each has just its landing page view
--     (no visit length; the averages leave one-event visits out).
--   - The old ID only lasted one tab, so a "device" here is the same IP +
--     browser (user agent). Unique visitors are an estimate.
--   - Like the new tracker: bots are skipped, same-site referrers are
--     dropped, and private IPs / dev hosts are flagged internal.
--
-- Only rows from before the new tracker's first visit are copied, so the
-- two never count the same visit twice. IDs are derived from the old row,
-- so re-running it adds nothing new.
--
-- To undo (also on ONE server only):
--   DELETE FROM public.site_event WHERE visit_id IN
--     (SELECT id FROM public.visit WHERE client_version = 'legacy-import');
--   DELETE FROM public.visit WHERE client_version = 'legacy-import';

BEGIN;

CREATE TEMP TABLE legacy_visit ON COMMIT DROP AS
WITH cutoff AS (
  SELECT COALESCE(MIN(started_at), 'infinity'::timestamptz) AS at
    FROM public.visit
   WHERE client_version IS DISTINCT FROM 'legacy-import'
),
src AS (
  SELECT ct.rct_key,
         ct.create_dt AS at,
         NULLIF(regexp_replace(COALESCE(ct.ip_address, ''), '^::ffff:', ''), '') AS ip,
         ct.user_agent AS ua,
         ct.geo,
         left(ct.language, 50) AS language,
         left(ct.timezone, 100) AS timezone,
         substring(ct.screen FROM '"width":\s*(\d+)') || 'x' ||
           substring(ct.screen FROM '"height":\s*(\d+)') AS screen,
         left(COALESCE(substring(ct.page_url FROM '^https?://[^/?#]+(/[^?#]*)'), '/'), 2048) AS path,
         lower(substring(ct.page_url FROM '^https?://([^/:?#]+)')) AS page_host,
         NULLIF(ct.referrer, '') AS referrer
    FROM public.counter_tracking ct, cutoff
   WHERE ct.create_dt < cutoff.at
     AND ct.user_agent IS NOT NULL
     AND ct.user_agent !~* 'bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|python-requests|curl/|wget'
),
dev AS (
  SELECT s.*,
         md5('legacy-device|' || COALESCE(s.ip, '') || '|' || s.ua)::uuid AS device_id,
         md5('legacy-visit|' || s.rct_key)::uuid AS visit_id,
         md5('legacy-page-view|' || s.rct_key)::uuid AS event_id
    FROM src s
)
SELECT d.*,
       ROW_NUMBER() OVER (PARTITION BY d.device_id ORDER BY d.at, d.rct_key) > 1 AS is_returning,
       COALESCE(d.ip ~* '^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)', false)
         OR d.page_host = 'localhost'
         OR d.page_host ~ '^[0-9.]+$' AS is_internal
  FROM dev d;

INSERT INTO public.visit
  (id, device_id, started_at, landing_path, referrer, ip_address, geo, user_agent,
   platform, screen, language, timezone, client_version, is_returning, is_internal)
SELECT visit_id, device_id, at, path,
       -- Same-site referrers (a reload, another tab) aren't where they came from.
       CASE WHEN lower(substring(referrer FROM '^https?://([^/:?#]+)')) = page_host THEN NULL
            ELSE left(referrer, 2048) END,
       left(ip, 45), geo, ua,
       -- Same order as server/src/utils/platformFromUserAgent.js.
       CASE WHEN ua ~* 'android' THEN 'Android'
            WHEN ua ~ 'iPhone|iPod' THEN 'iPhone'
            WHEN ua ~ 'iPad' THEN 'iPad'
            WHEN ua ~ 'Macintosh|MacIntel' THEN 'Mac'
            WHEN ua ~ 'Windows|Win32|Win64' THEN 'Windows'
            WHEN ua ~ 'Linux' THEN 'Linux'
            ELSE 'Other' END,
       left(screen, 50), language, timezone, 'legacy-import', is_returning, is_internal
  FROM legacy_visit
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_event (id, visit_id, device_id, created_at, type, path, meta, is_admin)
SELECT event_id, visit_id, device_id, at, 'page_view', path,
       '{"imported": true, "source": "counter_tracking"}'::jsonb, false
  FROM legacy_visit
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Check (Node A, then Node B once replicated): the same numbers on both.
-- SELECT COUNT(*) AS visits, MIN(started_at) AS first, MAX(started_at) AS last
--   FROM public.visit WHERE client_version = 'legacy-import';
