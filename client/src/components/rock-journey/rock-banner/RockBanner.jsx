import RockImage from "../../rock-popup/RockImage";
import "./RockBanner.css";

const formatDate = (d) => {
  const date = new Date(d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const RockBanner = ({ rockNumber, totalTrips, startDate, latestDate, artists, distance }) => {
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

        <div className="date-line">
          <span>Trips: {totalTrips}</span>&nbsp;&nbsp;&nbsp;
          <span className="date-text">
            {formatDate(startDate)}&nbsp;-&nbsp;
            {formatDate(latestDate)}
          </span>
        </div>
        <div>Distance: <span className="date-text">{distance} miles</span></div>
      </div>
    </div >
  );
};

export default RockBanner;
