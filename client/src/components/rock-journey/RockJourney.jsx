// src/components/RockJourney.jsx
import RockBanner from "./rock-banner/RockBanner";
import RockCollection from "./rock-collection/RockCollection";
import "./RockJourney.css";
import { journeyStats } from '../../utils/journeyStats.js';

// `collections`: this rock's stops, newest first (as the API returns them).
const RockJourney = ({ rockNumber, collections }) => {
  const { totalTrips, startDate, latestDate, artists, distance } = journeyStats(collections);

  return (
    <div className="rock-journey-outer">
      <div className="rock-banner-wrapper">
        <RockBanner
          rockNumber={rockNumber}
          totalTrips={totalTrips}
          startDate={startDate}
          latestDate={latestDate}
          artists={artists}
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
