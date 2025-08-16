// src/components/RockJourney.jsx
import RockBanner from "./rock-banner/RockBanner";
import RockCollection from "./rock-collection/RockCollection";
import "./RockJourney.css";

const RockJourney = ({ rockNumber, collections }) => {
  const totalTrips = collections.length;
  const startDate = collections[0].date;
  const latestDate = collections[collections.length - 1].date;

  return (
    <div className="rock-journey-outer">
      <div className="rock-banner-wrapper">
        <RockBanner
          rockNumber={rockNumber}
          totalTrips={totalTrips}
          startDate={startDate}
          latestDate={latestDate}
          artists={collections[0].artists}
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
