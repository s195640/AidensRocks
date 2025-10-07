// src/components/RockJourney.jsx
import RockBanner from "./rock-banner/RockBanner";
import RockCollection from "./rock-collection/RockCollection";
import "./RockJourney.css";

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function totalDistance(points) {
  if (points.length <= 1) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }
  return Math.round(total);
}



const RockJourney = ({ rockNumber, collections }) => {
  const totalTrips = collections.length;
  const startDate = collections[0].date;
  const latestDate = collections[collections.length - 1].date;
  const startingPoint = [40.15040899572542, -83.2360525268589];
  const points = [startingPoint, ...collections.map(item => [parseFloat(item.latitude), parseFloat(item.longitude)])];
  const distance = totalDistance(points);

  return (
    <div className="rock-journey-outer">
      <div className="rock-banner-wrapper">
        <RockBanner
          rockNumber={rockNumber}
          totalTrips={totalTrips}
          startDate={startDate}
          latestDate={latestDate}
          artists={collections[0].artists}
          distance={distance}
        />
      </div>

      <div className="rock-journey-container">
        <div className="scrolling-row">
          {collections.map((collection, index) => (
            <div className="scroll-item" key={index}>
              <RockCollection
                path={collection.path}
                imagenames={collection.imagenames}
                date={collection.date}
                location={collection.location}
                comment={collection.comment}
                journeyNumber={collections.length - index}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RockJourney;
