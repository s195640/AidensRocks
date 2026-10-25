// Admin → Activity page (Site Tracking, phase 4): one endpoint per panel,
// all read from visit / site_event. Every one takes the same range / tz /
// includeAdmins / includeInternal (utils/activityFilters.js) and counts in
// SQL, returning only summary rows -- never raw events into Node (the
// plan's visitor-experience review, finding 6).
const express = require('express');
const db = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const { activityFilters, EVENTS, dayOf, metaNum, metaBool } = require('../utils/activityFilters');
const { addDays, dayIn } = require('../utils/statsRange');
const { NEW_ERRORS_SQL, occurrencesSql } = require('../utils/errors/occurrences');

const router = express.Router();
router.use(requireAdminAuth);

// Runs `sql` with as many of the filter params as it uses ($1..$n): pg
// rejects unused extra parameters.
function run(sql, params) {
  const used = Math.max(0, ...[...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
  return db.query(sql, params.slice(0, used));
}

// Wraps a panel handler: parses the filters, sends a 500 on failure.
const panel = (name, handler) => async (req, res) => {
  try {
    const filters = await activityFilters(req, res);
    if (!filters) return;
    res.json(await handler(filters, req));
  } catch (err) {
    console.error(`Activity ${name} failed:`, err);
    res.status(500).json({ error: `Could not load ${name}` });
  }
};

// Every day from the range start (or the first row, for "all") through
// today, with zeros for days that have no rows.
function fillDays(rows, { startDay, today }, empty) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  let day = startDay || rows.reduce((min, r) => (r.day < min ? r.day : min), today);
  const out = [];
  for (; day <= today; day = addDays(day, 1)) {
    const { day: _ignored, ...values } = byDay.get(day) || {};
    out.push({ date: day, ...empty, ...values });
  }
  return out;
}

const num = (v) => (v == null ? null : Number(v));

// ------------------------------------------------------------------ visitors
// Per day: visitors (devices), visits, page views, average visit length and
// on-screen time, and visitors/visits per device ({ iPhone: { visitors,
// visits } }); totals; visitors by device. Visit length = last event -
// visit start; one-event visits (length 0) are left out of the averages.
//
// One query, one pass over the events: they're first collapsed to one row
// per visit, and everything is counted from those (a year of traffic,
// ~500k events, took 2.2 s as four separate COUNT(DISTINCT) scans; this is
// a fraction of that). A visit and its page views count on the day it
// started, so a visit that runs past midnight counts on its first day.
router.get(
  '/visitors',
  panel('visitors', async (f) => {
    const { rows } = await run(
      `WITH ${EVENTS},
       per_visit AS MATERIALIZED (
         SELECT visit_id, device_id, started_at, platform, is_returning,
                (COUNT(*) FILTER (WHERE type = 'page_view'))::int AS page_views,
                EXTRACT(EPOCH FROM MAX(created_at) - started_at) * 1000 AS length_ms,
                SUM(${metaNum('engaged_ms')}) FILTER (WHERE type = 'page_leave') AS engaged_ms
           FROM ev
          GROUP BY visit_id, device_id, started_at, platform, is_returning),
       days AS (
         SELECT ${dayOf('started_at')} AS day,
                COUNT(DISTINCT device_id)::int AS visitors,
                COUNT(*)::int AS visits,
                SUM(page_views)::int AS page_views,
                ROUND(AVG(length_ms) FILTER (WHERE length_ms > 0)) AS avg_visit_ms,
                ROUND(AVG(engaged_ms) FILTER (WHERE engaged_ms > 0)) AS avg_engaged_ms
           FROM per_visit GROUP BY 1),
       day_platforms AS (
         SELECT day, json_object_agg(platform, json_build_object('visitors', visitors, 'visits', visits)) AS platforms
           FROM (SELECT ${dayOf('started_at')} AS day, COALESCE(platform, 'Other') AS platform,
                        COUNT(DISTINCT device_id)::int AS visitors, COUNT(*)::int AS visits
                   FROM per_visit GROUP BY 1, 2) x
          GROUP BY day)
       SELECT
         (SELECT COALESCE(json_agg(d), '[]') FROM (
            SELECT days.*, dp.platforms FROM days JOIN day_platforms dp USING (day)) d) AS days,
         (SELECT row_to_json(t) FROM (
            SELECT COUNT(DISTINCT device_id)::int AS visitors,
                   COUNT(*)::int AS visits,
                   COALESCE(SUM(page_views), 0)::int AS page_views,
                   (COUNT(*) FILTER (WHERE is_returning))::int AS returning_visits,
                   (COUNT(*) FILTER (WHERE NOT is_returning))::int AS new_visits,
                   ROUND(AVG(length_ms) FILTER (WHERE length_ms > 0)) AS avg_visit_ms,
                   ROUND(AVG(engaged_ms) FILTER (WHERE engaged_ms > 0)) AS avg_engaged_ms
              FROM per_visit) t) AS totals,
         (SELECT COALESCE(json_agg(p ORDER BY p.visitors DESC), '[]') FROM (
            SELECT COALESCE(platform, 'Other') AS platform, COUNT(DISTINCT device_id)::int AS visitors
              FROM per_visit GROUP BY 1) p) AS platforms`,
      f.params
    );
    const { days, totals, platforms } = rows[0];
    return {
      days: fillDays(
        days.map((d) => ({ ...d, avg_visit_ms: num(d.avg_visit_ms), avg_engaged_ms: num(d.avg_engaged_ms) })),
        f,
        { visitors: 0, visits: 0, page_views: 0, avg_visit_ms: null, avg_engaged_ms: null, platforms: {} }
      ),
      totals: { ...totals, avg_visit_ms: num(totals.avg_visit_ms), avg_engaged_ms: num(totals.avg_engaged_ms) },
      platforms,
    };
  })
);

// Most rows a panel's table returns. The Activity page pages, sorts and
// searches them in the browser, so this is a safety cap, not a "top N".
const TABLE_LIMIT = 500;

// ------------------------------------------------------------------ activity
// The chart that started this: song plays, Honoring Aiden entry views, QR
// scans and bad links per day, plus page views of the Map, Track the Rocks,
// Photos (albums) and Birthdays pages.
const ACTIVITY_TYPES = ['song_play', 'entry_view', 'qr_scan', 'not_found'];
const PAGE_COUNTS = { map_view: '/map', track_view: '/track-the-rocks', albums_view: '/photos', birthdays_view: '/birthdays' };
const ACTIVITY_KEYS = [...ACTIVITY_TYPES, ...Object.keys(PAGE_COUNTS)];

router.get(
  '/activity',
  panel('activity', async (f) => {
    const { rows } = await run(
      `WITH ${EVENTS}
       SELECT ${dayOf('created_at')} AS day,
              ${[
                ...ACTIVITY_TYPES.map((t) => `(COUNT(*) FILTER (WHERE type = '${t}'))::int AS ${t}`),
                ...Object.entries(PAGE_COUNTS).map(
                  ([key, path]) => `(COUNT(*) FILTER (WHERE type = 'page_view' AND path = '${path}'))::int AS ${key}`
                ),
              ].join(',\n              ')}
         FROM ev WHERE type IN (${[...ACTIVITY_TYPES, 'page_view'].map((t) => `'${t}'`).join(', ')})
        GROUP BY 1`,
      f.params
    );
    const days = fillDays(rows, f, Object.fromEntries(ACTIVITY_KEYS.map((t) => [t, 0])));
    const totals = Object.fromEntries(ACTIVITY_KEYS.map((t) => [t, days.reduce((s, d) => s + d[t], 0)]));
    return { days, totals };
  })
);

// --------------------------------------------------------------------- forms
// One row per form open (linked by open_id), then per form: opened,
// started, submitted, abandoned (opened, never submitted) and the submit
// rate; per day submitted vs abandoned; where it was opened from; and why
// submits were rejected.
const FORM_OPENS = `${EVENTS},
  opens AS (
    SELECT target_id AS form, meta->>'open_id' AS open_id,
           MIN(created_at) FILTER (WHERE type = 'form_open') AS opened_at,
           MAX(meta->>'source') FILTER (WHERE type = 'form_open') AS source,
           BOOL_OR(type = 'form_start') AS started,
           BOOL_OR(type = 'form_submit') AS submitted
      FROM ev
     WHERE type LIKE 'form\\_%' AND meta ? 'open_id'
     GROUP BY 1, 2
    HAVING BOOL_OR(type = 'form_open'))`;

router.get(
  '/forms',
  panel('forms', async (f) => {
    const [forms, daily, sources, errors] = (
      await Promise.all([
        run(
          `WITH ${FORM_OPENS}
           SELECT form, COUNT(*)::int AS opened,
                  (COUNT(*) FILTER (WHERE started))::int AS started,
                  (COUNT(*) FILTER (WHERE submitted))::int AS submitted,
                  (COUNT(*) FILTER (WHERE NOT submitted))::int AS abandoned,
                  (COUNT(*) FILTER (WHERE started AND NOT submitted))::int AS abandoned_after_start
             FROM opens GROUP BY form ORDER BY form`,
          f.params
        ),
        run(
          `WITH ${FORM_OPENS}
           SELECT ${dayOf('opened_at')} AS day,
                  (COUNT(*) FILTER (WHERE submitted))::int AS submitted,
                  (COUNT(*) FILTER (WHERE NOT submitted))::int AS abandoned
             FROM opens GROUP BY 1`,
          f.params
        ),
        run(
          `WITH ${FORM_OPENS}
           SELECT form, COALESCE(source, 'unknown') AS source, COUNT(*)::int AS opened,
                  (COUNT(*) FILTER (WHERE submitted))::int AS submitted
             FROM opens GROUP BY 1, 2 ORDER BY 1, 3 DESC`,
          f.params
        ),
        run(
          `WITH ${EVENTS}
           SELECT target_id AS form, meta->>'reason' AS reason, COUNT(*)::int AS count
             FROM ev WHERE type = 'form_error'
            GROUP BY 1, 2 ORDER BY 3 DESC LIMIT ${TABLE_LIMIT}`,
          f.params
        ),
      ])
    ).map((r) => r.rows);
    return { forms, days: fillDays(daily, f, { submitted: 0, abandoned: 0 }), sources, errors };
  })
);

// -------------------------------------------------------------------- albums
router.get(
  '/albums',
  panel('albums', async (f) => {
    const albums = (
      await run(
        `WITH ${EVENTS},
         a AS (
           SELECT target_id AS album_id,
                  MAX(meta->>'album_name') AS name,
                  (COUNT(*) FILTER (WHERE type = 'album_open'))::int AS opens,
                  (COUNT(DISTINCT device_id) FILTER (WHERE type = 'album_open'))::int AS visitors,
                  SUM(${metaNum('engaged_ms')}) FILTER (WHERE type = 'album_close') AS total_ms,
                  ROUND(AVG(${metaNum('engaged_ms')}) FILTER (WHERE type = 'album_close')) AS avg_ms,
                  (SUM(${metaNum('photos_viewed')}) FILTER (WHERE type = 'album_close'))::int AS photos_opened
             FROM ev WHERE type IN ('album_open', 'album_close')
            GROUP BY 1)
         SELECT a.*, COALESCE(pa.display_name, a.name) AS display_name
           FROM a LEFT JOIN photoalbums pa ON pa.pa_key::text = a.album_id
          ORDER BY a.opens DESC LIMIT ${TABLE_LIMIT}`,
        f.params
      )
    ).rows.map((r) => ({ ...r, total_ms: num(r.total_ms), avg_ms: num(r.avg_ms) }));
    const photos = (
      await run(
        `WITH ${EVENTS},
         p AS (
           SELECT target_id AS photo_id, COUNT(*)::int AS views, COUNT(DISTINCT device_id)::int AS visitors,
                  ROUND(AVG(${metaNum('engaged_ms')})) AS avg_ms, BOOL_OR(${metaBool('is_video')}) AS is_video
             FROM ev WHERE type = 'photo_view'
            GROUP BY 1)
         SELECT p.*, ph.display_name, ph.name AS file, pa.display_name AS album, pa.name AS album_name
           FROM p
           LEFT JOIN photos ph ON ph.p_key::text = p.photo_id
           LEFT JOIN photoalbums pa ON pa.pa_key = ph.pa_key
          ORDER BY p.views DESC LIMIT ${TABLE_LIMIT}`,
        f.params
      )
    ).rows.map((r) => ({ ...r, avg_ms: num(r.avg_ms) }));
    return { albums, photos };
  })
);

// ------------------------------------------------------------------ searches
// Rock numbers searched for (Track the Rocks, the map's two boxes) and
// opened from shared ?rock= links; and the ones that found nothing.
router.get(
  '/searches',
  panel('searches', async (f) => {
    const rocks = (
      await run(
        `WITH ${EVENTS}
         SELECT target_id AS rock,
                (COUNT(*) FILTER (WHERE type = 'rock_search'))::int AS searches,
                COUNT(DISTINCT device_id)::int AS visitors,
                (COUNT(*) FILTER (WHERE type = 'rock_search' AND meta->>'input' = 'search'))::int AS from_search,
                (COUNT(*) FILTER (WHERE type = 'rock_search' AND meta->>'input' = 'highlight'))::int AS from_map_box,
                (COUNT(*) FILTER (WHERE type = 'rock_search' AND meta->>'input' = 'filter'))::int AS from_map_filter,
                (COUNT(*) FILTER (WHERE type = 'rock_link'))::int AS links,
                (COUNT(*) FILTER (WHERE type = 'rock_link' AND meta->>'from' LIKE 'email%'))::int AS email_links,
                BOOL_OR(${metaBool('found')}) AS found
           FROM ev WHERE type IN ('rock_search', 'rock_link')
          GROUP BY 1
          ORDER BY COUNT(*) DESC LIMIT ${TABLE_LIMIT}`,
        f.params
      )
    ).rows;
    const notFound = (
      await run(
        `WITH ${EVENTS}
         SELECT target_id AS rock, COUNT(*)::int AS count, COUNT(DISTINCT device_id)::int AS visitors,
                MAX(created_at) AS last_seen,
                (ARRAY_AGG(DISTINCT CASE WHEN type = 'rock_link' THEN 'link' ELSE meta->>'input' END))
                  AS ways
           FROM ev
          WHERE type IN ('rock_search', 'rock_link') AND ${metaBool('found')} IS FALSE
          GROUP BY 1
          ORDER BY MAX(created_at) DESC LIMIT ${TABLE_LIMIT}`,
        f.params
      )
    ).rows;
    return { rocks, notFound };
  })
);

// ------------------------------------------------------------------ journeys
// A journey_photo_view's target is the photo; its rock is meta.rock_number.
router.get(
  '/journeys',
  panel('journeys', async (f) => {
    const { rows } = await run(
      `WITH ${EVENTS}
       SELECT CASE WHEN type = 'journey_photo_view' THEN meta->>'rock_number' ELSE target_id END AS rock,
              (COUNT(*) FILTER (WHERE type = 'rock_view'))::int AS opens,
              (COUNT(DISTINCT device_id) FILTER (WHERE type = 'rock_view'))::int AS visitors,
              ROUND(AVG(${metaNum('engaged_ms')}) FILTER (WHERE type = 'rock_close')) AS avg_ms,
              (COUNT(*) FILTER (WHERE type = 'journey_location'))::int AS locations,
              (COUNT(*) FILTER (WHERE type = 'journey_comment'))::int AS comments,
              (COUNT(*) FILTER (WHERE type = 'journey_photo_view'))::int AS photos,
              (COUNT(*) FILTER (WHERE type = 'rock_view' AND meta->>'source' = 'search'))::int AS from_search,
              (COUNT(*) FILTER (WHERE type = 'rock_view' AND meta->>'source' = 'link'))::int AS from_link,
              (COUNT(*) FILTER (WHERE type = 'rock_view' AND meta->>'source' = 'map_pin'))::int AS from_map,
              (COUNT(*) FILTER (WHERE type = 'rock_view' AND meta->>'source' = 'my_rocks'))::int AS from_my_rocks
         FROM ev
        WHERE type IN ('rock_view', 'rock_close', 'journey_location', 'journey_comment', 'journey_photo_view')
          AND CASE WHEN type = 'journey_photo_view' THEN meta->>'rock_number' ELSE target_id END IS NOT NULL
        GROUP BY 1
        ORDER BY COUNT(*) FILTER (WHERE type = 'rock_view') DESC, COUNT(*) DESC
        LIMIT ${TABLE_LIMIT}`,
      f.params
    );
    return rows.map((r) => ({ ...r, avg_ms: num(r.avg_ms) }));
  })
);

// --------------------------------------------------------------------- music
// Per song: plays, listeners, average time listened, listen-through (time
// listened / song length, for plays whose length is known), finished %, and
// skips.
router.get(
  '/music',
  panel('music', async (f) => {
    const { rows } = await run(
      `WITH ${EVENTS},
       s AS (
         SELECT target_id AS m_key,
                (COUNT(*) FILTER (WHERE type = 'song_play'))::int AS plays,
                (COUNT(DISTINCT device_id) FILTER (WHERE type = 'song_play'))::int AS listeners,
                ROUND(AVG(${metaNum('listened_ms')}) FILTER (WHERE type = 'song_stop')) AS avg_listened_ms,
                ROUND(100 * AVG(LEAST(${metaNum('listened_ms')} / NULLIF(${metaNum('duration_ms')}, 0), 1))
                  FILTER (WHERE type = 'song_stop' AND ${metaNum('duration_ms')} > 0)) AS listen_through_pct,
                ROUND(100 * AVG((${metaBool('completed')})::int) FILTER (WHERE type = 'song_stop')) AS completed_pct,
                (COUNT(*) FILTER (WHERE type = 'song_stop' AND meta->>'reason' = 'skip'))::int AS skips
           FROM ev WHERE type IN ('song_play', 'song_stop')
          GROUP BY 1)
       SELECT s.*, m.name FROM s LEFT JOIN music m ON m.m_key::text = s.m_key
        ORDER BY s.plays DESC`,
      f.params
    );
    return rows.map((r) => ({
      ...r,
      avg_listened_ms: num(r.avg_listened_ms),
      listen_through_pct: num(r.listen_through_pct),
      completed_pct: num(r.completed_pct),
    }));
  })
);

// ------------------------------------------------------------------ outbound
router.get(
  '/outbound',
  panel('outbound', async (f) => {
    const links = (
      await run(
        `WITH ${EVENTS}
         SELECT target_id AS target, COUNT(*)::int AS clicks, COUNT(DISTINCT device_id)::int AS visitors,
                (ARRAY_AGG(DISTINCT meta->>'where'))[1:5] AS places
           FROM ev WHERE type = 'outbound_click'
          GROUP BY 1 ORDER BY 2 DESC LIMIT ${TABLE_LIMIT}`,
        f.params
      )
    ).rows;
    const contact = (
      await run(
        `WITH ${EVENTS}
         SELECT COUNT(*)::int AS opens, COUNT(DISTINCT device_id)::int AS visitors
           FROM ev WHERE type = 'contact_open'`,
        f.params
      )
    ).rows[0];
    return { links, contact };
  })
);

// -------------------------------------------------------------------- scroll
// Per page: views, the average furthest scroll, the % of views that reached
// the bottom (90%+), and the average time on screen. A page view can have
// several page_leave events (one each time the tab was hidden), so they're
// combined per view first.
router.get(
  '/scroll',
  panel('scroll', async (f) => {
    const { rows } = await run(
      `WITH ${EVENTS},
       views AS (
         SELECT path, meta->>'view_id' AS view_id,
                MAX(${metaNum('max_scroll_pct')}) AS scroll,
                SUM(${metaNum('engaged_ms')}) AS engaged
           FROM ev WHERE type = 'page_leave' AND meta ? 'view_id'
          GROUP BY 1, 2)
       SELECT path, COUNT(*)::int AS views,
              ROUND(AVG(scroll)) AS avg_scroll_pct,
              ROUND(100 * AVG((scroll >= 90)::int)) AS reached_bottom_pct,
              ROUND(AVG(engaged)) AS avg_engaged_ms
         FROM views GROUP BY path ORDER BY COUNT(*) DESC LIMIT ${TABLE_LIMIT}`,
      f.params
    );
    return rows.map((r) => ({
      ...r,
      avg_scroll_pct: num(r.avg_scroll_pct),
      reached_bottom_pct: num(r.reached_bottom_pct),
      avg_engaged_ms: num(r.avg_engaged_ms),
    }));
  })
);

// ------------------------------------------------------------------ top lists
router.get(
  '/top',
  panel('top lists', async (f) => {
    const q = (sql) => run(`WITH ${EVENTS} ${sql}`, f.params).then((r) => r.rows);
    const [pages, entries, qr, follows, referrers] = await Promise.all([
      q(`SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT device_id)::int AS visitors
           FROM ev WHERE type = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT ${TABLE_LIMIT}`),
      q(`SELECT ev.target_id AS slug, MAX(en.title) AS title, COUNT(*)::int AS views,
                COUNT(DISTINCT ev.device_id)::int AS visitors
           FROM ev LEFT JOIN entry en ON en.slug = ev.target_id
          WHERE ev.type = 'entry_view' GROUP BY 1 ORDER BY 3 DESC LIMIT ${TABLE_LIMIT}`),
      q(`SELECT target_id AS rock, COUNT(*)::int AS scans, COUNT(DISTINCT device_id)::int AS visitors
           FROM ev WHERE type = 'qr_scan' GROUP BY 1 ORDER BY 2 DESC LIMIT ${TABLE_LIMIT}`),
      q(`SELECT target_id AS rock,
                (COUNT(*) FILTER (WHERE type = 'follow'))::int AS follows,
                (COUNT(*) FILTER (WHERE type = 'unfollow'))::int AS unfollows
           FROM ev WHERE type IN ('follow', 'unfollow') GROUP BY 1 ORDER BY 2 DESC, 3 DESC LIMIT ${TABLE_LIMIT}`),
      // Where visits came from: the referrer's site, "Direct" when none.
      q(`SELECT COALESCE(SUBSTRING(v.referrer FROM '^https?://(?:www\\.)?([^/:]+)'), 'Direct') AS source,
                COUNT(*)::int AS visits
           FROM visit v
          WHERE v.id IN (SELECT DISTINCT visit_id FROM ev)
          GROUP BY 1 ORDER BY 2 DESC LIMIT ${TABLE_LIMIT}`),
    ]);
    return { pages, entries, qr, follows, referrers };
  })
);

// --------------------------------------------------------------------- rocks
// Rocks added to the catalog per day (catalog.create_dt), and per artist
// (through artist_link; a rock by two artists counts once for each, so the
// artists can add up to more than the day's rocks). Not site activity, so
// includeAdmins / includeInternal don't apply -- only range and tz.
router.get(
  '/rocks',
  panel('rocks created', async (f) => {
    const { rows } = await db.query(
      `WITH r AS (
         SELECT rc_key, to_char((create_dt AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS day
           FROM catalog
          WHERE $1::timestamptz IS NULL OR create_dt >= $1),
       ra AS (
         SELECT r.day, r.rc_key, a.display_name AS artist
           FROM r LEFT JOIN artist_link l ON l.rc_key = r.rc_key
                  LEFT JOIN artist a ON a.ra_key = l.ra_key)
       SELECT
         (SELECT COALESCE(json_agg(d), '[]') FROM (
            SELECT day, COUNT(*)::int AS rocks FROM r GROUP BY day) d) AS days,
         (SELECT COALESCE(json_agg(x), '[]') FROM (
            SELECT day, artist, COUNT(DISTINCT rc_key)::int AS rocks FROM ra GROUP BY 1, 2) x) AS day_artists,
         (SELECT COALESCE(json_agg(t ORDER BY t.rocks DESC, t.artist NULLS LAST), '[]') FROM (
            SELECT artist, COUNT(DISTINCT rc_key)::int AS rocks FROM ra GROUP BY 1) t) AS artists,
         (SELECT COUNT(*)::int FROM r) AS rocks`,
      [f.params[0], f.tz]
    );
    const { days, day_artists: dayArtists, artists, rocks } = rows[0];
    // Per day { date, rocks, artists: { "<name>": n } }; null artist = none.
    const byDay = new Map(days.map((d) => [d.day, { ...d, artists: {} }]));
    for (const { day, artist, rocks: n } of dayArtists) {
      byDay.get(day).artists[artist ?? ''] = n;
    }
    return {
      days: fillDays([...byDay.values()], f, { rocks: 0, artists: {} }),
      artists: artists.map((a) => ({ artist: a.artist, rocks: a.rocks })),
      totals: { rocks, artists: artists.filter((a) => a.artist != null).length },
    };
  })
);

// -------------------------------------------------------------------- glance
// The Dashboard's "Today" row: today (in the viewer's timezone) so far and
// all of yesterday -- visitors (admins and internal traffic left out),
// journey posts submitted (any upload, shown yet or not), rock requests
// (not deleted) and errors (occurrences, browser + server, admins and
// internal left out, as Site Health shows by default) -- plus error kinds
// still marked New. Today's counts are
// top-level; yesterday's are under `yesterday`.
router.get('/glance', async (req, res) => {
  try {
    const tz = String(req.query.tz || 'UTC');
    let today;
    try {
      today = dayIn(new Date(), tz);
    } catch {
      return res.status(400).json({ error: 'Invalid timezone' });
    }
    const { rows } = await db.query(
      `WITH b AS (SELECT $1::date::timestamp AT TIME ZONE $3 AS today, $2::date::timestamp AT TIME ZONE $3 AS yesterday),
       ev AS (
         SELECT e.device_id, e.created_at >= b.today AS is_today
           FROM site_event e JOIN visit v ON v.id = e.visit_id, b
          WHERE e.created_at >= b.yesterday
            AND NOT e.is_admin AND NOT v.is_internal),
       posts AS (SELECT j.create_dt >= b.today AS is_today FROM journey j, b WHERE j.create_dt >= b.yesterday),
       requests AS (
         SELECT r.create_dt >= b.today AS is_today FROM rock_requests r, b
          WHERE r.create_dt >= b.yesterday AND NOT r.deleted),
       errs AS (
         SELECT o.created_at >= b.today AS is_today
           FROM (${occurrencesSql({ start: '($2::date::timestamp AT TIME ZONE $3)', admins: 'FALSE', internal: 'FALSE' })}) o, b)
       SELECT (SELECT COUNT(DISTINCT device_id) FILTER (WHERE is_today) FROM ev)::int AS visitors,
              (SELECT COUNT(*) FILTER (WHERE is_today) FROM posts)::int AS journey_posts,
              (SELECT COUNT(*) FILTER (WHERE is_today) FROM requests)::int AS rock_requests,
              (SELECT COUNT(*) FILTER (WHERE is_today) FROM errs)::int AS errors,
              (SELECT COUNT(DISTINCT device_id) FILTER (WHERE NOT is_today) FROM ev)::int AS y_visitors,
              (SELECT COUNT(*) FILTER (WHERE NOT is_today) FROM posts)::int AS y_journey_posts,
              (SELECT COUNT(*) FILTER (WHERE NOT is_today) FROM requests)::int AS y_rock_requests,
              (SELECT COUNT(*) FILTER (WHERE NOT is_today) FROM errs)::int AS y_errors,
              (${NEW_ERRORS_SQL}) AS new_errors`,
      [today, addDays(today, -1), tz]
    );
    const { y_visitors: visitors, y_journey_posts: posts, y_rock_requests: requests, y_errors: errors, ...todayRow } = rows[0];
    res.json({ ...todayRow, yesterday: { visitors, journey_posts: posts, rock_requests: requests, errors } });
  } catch (err) {
    console.error('Activity glance failed:', err);
    res.status(500).json({ error: 'Could not load today' });
  }
});

module.exports = router;
