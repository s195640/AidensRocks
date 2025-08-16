import RockImage from "../../rock-popup/RockImage";
import "./RockBanner.css";

const RockBanner = ({ rockNumber, totalTrips, startDate, latestDate, artists }) => {
  return (
    <div className="rock-banner">
      <RockImage
        rockNumber={rockNumber}
        totalTrips={totalTrips}
        startDate={startDate}
        latestDate={latestDate}
        artists={artists}
      />

      <div className="rock-info">
        <div>Aiden's Rock: {rockNumber}</div>
        <div>
          Total Trips: {totalTrips}&nbsp;&nbsp;&nbsp;&nbsp;
          <span className="date-text">{startDate}</span> -{" "}
          <span className="date-text">{latestDate}</span>
        </div>
      </div>
    </div>
  );
};

export default RockBanner;
