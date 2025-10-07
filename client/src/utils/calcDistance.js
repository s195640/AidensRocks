// calcDistance.js

// Convert degrees to radians
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate the Haversine distance between two points [lat, lon]
export function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total distance for an array of points
export function totalDistance(points) {
  if (points.length <= 1) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }
  return Math.round(total);
}
