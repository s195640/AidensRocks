// What an account "follows" = the rocks it chose to follow (account_follow)
// PLUS, for a Creator or Admin linked to an artist (account.ra_key), every rock that
// artist painted ("own" rocks). Own rocks are computed, never stored, so new
// rocks for the artist show up automatically and unlinking the artist drops
// them. They can't be removed from the list.
//
// These return SQL fragments; `param` is the placeholder holding the
// account id — a bind parameter ('$1') or an outer query's column
// ('a.id', see routes/accountsAdmin.js). The aliases inside are
// deliberately unusual (own_acct/own_al/own_rc) so an outer column like
// `a.id` can't be captured by an inner alias of the same name — that once
// turned `WHERE a.id = a.id` into "always true" and inflated the admin
// Following counts.
const { ARTIST_LINK_LEVELS } = require('../middleware/requireAuth');

const ownRockNumbersSql = (param) => `
  SELECT own_rc.rock_number
  FROM account own_acct
  JOIN artist_link own_al ON own_al.ra_key = own_acct.ra_key
  JOIN catalog own_rc ON own_rc.rc_key = own_al.rc_key
  WHERE own_acct.id = ${param}
    AND own_acct.access_level IN (${ARTIST_LINK_LEVELS.join(', ')})`;

const followedRockNumbersSql = (param) => `
  SELECT rock_number FROM account_follow WHERE account_id = ${param}
  UNION
  ${ownRockNumbersSql(param)}`;

module.exports = { ownRockNumbersSql, followedRockNumbersSql };
