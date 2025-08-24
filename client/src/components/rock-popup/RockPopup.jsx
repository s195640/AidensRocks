// RockPopup.jsx
import "./RockPopup.css";

const RockPopup = ({ rockNumber, totalTrips, startDate, latestDate, artists = [], onClose }) => {
  const rockImagePath = `/media/catalog/${rockNumber}/a.webp`;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="rock-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          Rock: {rockNumber}
        </div>

        {/* Render artist info */}
        {artists.length > 0 && (
          <div className="dialog-artists">
            {artists.map((artist, index) => (
              <p key={index}>
                Artist: {artist}
              </p>
            ))}
          </div>
        )}

        <div className="rock-image-wrapper">
          <img
            src={rockImagePath}
            alt="Full Rock"
            className="dialog-rock-image"
          />
        </div>

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
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default RockPopup;
