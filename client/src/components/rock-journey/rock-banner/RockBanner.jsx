// src/components/RockBanner.jsx
import { useState } from "react";
import "./RockBanner.css";

const RockBanner = ({ rockNumber, totalTrips, startDate, latestDate }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleImageClick = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const rockImagePath = `/media/catalog/${rockNumber}/a.webp`;

  return (
    <div className="rock-banner">
      <img
        src={rockImagePath}
        alt="Rock"
        className="rock-image"
        onClick={handleImageClick}
      />
      <div className="rock-info">
        <div>Aiden's Rock: {rockNumber}</div>
        <div>
          Total Trips: {totalTrips}&nbsp;&nbsp;&nbsp;&nbsp;
          <span className="date-text">{startDate}</span> -{" "}
          <span className="date-text">{latestDate}</span>
        </div>
      </div>

      {isDialogOpen && (
        <div className="dialog-backdrop" onClick={closeDialog}>
          <div className="rock-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">Rock: {rockNumber}</div>
            <img
              src={rockImagePath}
              alt="Full Rock"
              className="dialog-rock-image"
            />
            <div className="dialog-details">
              <p>
                <strong>Total Trips:</strong> {totalTrips}
              </p>
              <p>
                <strong>Start Date:</strong> {startDate}
              </p>
              <p>
                <strong>Latest Date:</strong> {latestDate}
              </p>
              <button onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RockBanner;
