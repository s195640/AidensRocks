import { useState } from "react";
import "./ImageItem.css";

const ImageItem = ({ name, desc, path }) => {
  const [showDialog, setShowDialog] = useState(false);

  if (!path) return null;

  const smallImageUrl = `/media/albums/${path}/sm.webp`;
  const largeImageUrl = `/media/albums/${path}/lg.webp`;

  return (
    <div className="image-item-container">
      {name && <div className="image-title">{name}</div>}

      <div className="image-wrapper" onClick={() => setShowDialog(true)}>
        <img
          className="image-content"
          src={smallImageUrl}
          alt={name || "Image"}
        />
      </div>

      {desc && <div className="image-description">{desc}</div>}

      {showDialog && (
        <div
          className="image-dialog-overlay"
          onClick={() => setShowDialog(false)}
        >
          <div
            className="image-dialog-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="image-dialog-close"
              onClick={() => setShowDialog(false)}
            >
              ✕
            </button>

            {name && <div className="image-dialog-title">{name}</div>}

            <img
              className="image-dialog-image"
              src={largeImageUrl}
              alt={name || "Large Image"}
            />

            {desc && <div className="image-dialog-description">{desc}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageItem;
