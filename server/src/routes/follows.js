// routes/follows.js — the signed-in account's followed rocks (Follow Rocks
// page, orange map pins, Track the Rocks "only rocks I follow") and its
// "email me when rocks I follow move" preference.
const express = require('express');
const db = require('../db/pool');
const { requireAuth, LEVELS } = require('../middleware/requireAuth');
const { ownRockNumbersSql, followedRockNumbersSql } = require('../utils/followedRocks');

const router = express.Router();

router.use(requireAuth(LEVELS.USER));

const parseRockNumber = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// GET /api/follows - followed rocks with catalog details. `artists` uses the
// same [{ra_key, display_name}] shape as GET /api/rocks so LightboxRock can
// render it as-is. `own` = one of the Creator's own rocks (see
// utils/followedRocks.js) — always listed, can't be removed.
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `WITH followed AS (
         SELECT rock_number, MIN(create_dt) AS followed_dt, bool_or(own) AS own
         FROM (
           SELECT rock_number, create_dt, false AS own
           FROM account_follow WHERE account_id = $1
           UNION ALL
           SELECT rock_number, NULL, true FROM (${ownRockNumbersSql('$1')}) o
         ) x
         GROUP BY rock_number
       )
       SELECT rc.rock_number, rc.create_dt, f.followed_dt, f.own,
              COALESCE(
                json_agg(json_build_object('ra_key', ra.ra_key, 'display_name', ra.display_name)
                         ORDER BY ra.display_name)
                  FILTER (WHERE ra.ra_key IS NOT NULL),
                '[]'
              ) AS artists,
              last_stop.location AS last_location,
              TO_CHAR(last_stop.date, 'YYYY-MM-DD') AS last_post_date
       FROM followed f
       JOIN catalog rc ON rc.rock_number = f.rock_number
       LEFT JOIN artist_link ral ON ral.rc_key = rc.rc_key
       LEFT JOIN artist ra ON ra.ra_key = ral.ra_key
       -- Latest visible journey stop, same ordering as Track the Rocks
       -- (routes/rockPosts.js): by journey date, then post time.
       LEFT JOIN LATERAL (
         SELECT j.location, j.date
         FROM journey j
         WHERE j.rock_number = rc.rock_number AND j.show = TRUE
         ORDER BY j.date DESC NULLS LAST, j.create_dt DESC
         LIMIT 1
       ) last_stop ON TRUE
       GROUP BY rc.rc_key, f.followed_dt, f.own, last_stop.location, last_stop.date
       ORDER BY rc.rock_number ASC`,
      [req.account.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/follows/ids - just the followed rock numbers (map pins/filters).
router.get('/ids', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT rock_number FROM (${followedRockNumbersSql('$1')}) f ORDER BY rock_number`,
      [req.account.id]
    );
    res.json(rows.map((r) => r.rock_number));
  } catch (err) {
    next(err);
  }
});

// POST /api/follows { rockNumber }
router.post('/', async (req, res, next) => {
  try {
    const rockNumber = parseRockNumber(req.body?.rockNumber);
    if (!rockNumber) return res.status(400).json({ error: 'Invalid rock number.' });

    const { rows } = await db.query('SELECT 1 FROM catalog WHERE rock_number = $1', [rockNumber]);
    if (!rows[0]) return res.status(404).json({ error: `Rock ${rockNumber} doesn't exist.` });

    await db.query(
      `INSERT INTO account_follow (account_id, rock_number) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.account.id, rockNumber]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/follows/:rockNumber
router.delete('/:rockNumber', async (req, res, next) => {
  try {
    const rockNumber = parseRockNumber(req.params.rockNumber);
    if (!rockNumber) return res.status(400).json({ error: 'Invalid rock number.' });

    // A Creator's own rocks always stay on their list.
    const { rows: own } = await db.query(
      `SELECT 1 FROM (${ownRockNumbersSql('$1')}) o WHERE o.rock_number = $2`,
      [req.account.id, rockNumber]
    );
    if (own[0]) {
      return res.status(400).json({ error: 'This is one of your rocks, so it always stays on your list.' });
    }

    await db.query(
      'DELETE FROM account_follow WHERE account_id = $1 AND rock_number = $2',
      [req.account.id, rockNumber]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/follows/settings { notifyRockMoves }
router.put('/settings', async (req, res, next) => {
  try {
    const notify = req.body?.notifyRockMoves;
    if (typeof notify !== 'boolean') {
      return res.status(400).json({ error: 'notifyRockMoves must be true or false.' });
    }
    await db.query(
      'UPDATE account SET notify_rock_moves = $2, update_dt = NOW() WHERE id = $1',
      [req.account.id, notify]
    );
    res.json({ notifyRockMoves: notify });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
