// The one rule for "is this journey stop public?", shared by every public
// rock query (track-the-rocks list + its count, a rock's own journey, map
// pins, totals and the All Rocks stats) so they can't disagree. They used
// to: the count included stops whose images were all hidden but the list
// didn't, so Track the Rocks kept paging forever, and a map pin could open
// a rock that then said "not found".
//
// Public = journey.show AND at least one visible image (a stop with no
// photo has nothing to render).
const visibleJourneySql = (alias = 'journey') => `(
  ${alias}.show = TRUE
  AND EXISTS (
    SELECT 1 FROM journey_image vji
    WHERE vji.rps_key = ${alias}.rps_key AND vji.show = TRUE
  )
)`;

module.exports = visibleJourneySql;
