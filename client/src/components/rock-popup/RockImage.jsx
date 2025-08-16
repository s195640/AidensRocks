import { useState } from "react";
import RockPopup from "./RockPopup";
import "./RockImage.css";

const RockImage = ({ rockNumber, totalTrips, startDate, latestDate, artists = [] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleImageClick = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const rockImagePath = `/media/catalog/${rockNumber}/a.webp`;

  return (
    <>
      <div className="rock-image-container" onClick={handleImageClick}>
        <img src={rockImagePath} alt="Rock" className="rock-image" />
      </div>

      {isDialogOpen && (
        <RockPopup
          rockNumber={rockNumber}
          totalTrips={totalTrips}
          startDate={startDate}
          latestDate={latestDate}
          artists={artists}
          onClose={closeDialog}
        />
      )}
    </>
  );
};

export default RockImage;
