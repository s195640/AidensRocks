import { totalDistance } from "./calcDistance.js";

// Where every rock's journey starts (Aiden's home area).
const STARTING_POINT = [40.15040899572542, -83.2360525268589];

const hasCoords = (stop) =>
  stop.latitude != null && stop.longitude != null &&
  Number.isFinite(parseFloat(stop.latitude)) && Number.isFinite(parseFloat(stop.longitude));

// Stats for one rock's stops as GET /api/rock-posts(/:rockNumber) returns
// them: NEWEST FIRST (ORDER BY date DESC). Shared by RockJourney and
// RockPopupByNumber so they can't drift -- both used to read element 0 as
// the start date, showing start/latest swapped, and measured the distance
// from home to the newest stop first. Stops with no coordinates yet (an
// upload isn't geocoded until an admin edits it) are skipped rather than
// turning the whole distance into NaN.
export function journeyStats(stopsNewestFirst = []) {
  const stops = stopsNewestFirst;
  const chronological = [...stops].reverse();
  const points = [
    STARTING_POINT,
    ...chronological.filter(hasCoords).map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)]),
  ];
  return {
    totalTrips: stops.length,
    startDate: stops[stops.length - 1]?.date,
    latestDate: stops[0]?.date,
    artists: stops[0]?.artists || [],
    distance: totalDistance(points),
  };
}
