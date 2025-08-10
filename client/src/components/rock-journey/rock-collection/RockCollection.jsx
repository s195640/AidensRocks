import { useCallback, useEffect, useState } from "react";
import "./RockCollection.css";

const RockCollection = ({
  path,
  imageNames,
  date,
  location,
  comment,
  journeyNumber,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const openDialog = (index) => {
    setCurrentIndex(index);
    setIsDialogOpen(true);
  };

  const closeDialog = () => setIsDialogOpen(false);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % imageNames.length);
  }, [imageNames.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex(
      (prev) => (prev - 1 + imageNames.length) % imageNames.length
    );
  }, [imageNames.length]);

  useEffect(() => {
    if (!isDialogOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeDialog();
      } else if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "ArrowLeft") {
        prevImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, nextImage, prevImage]);

  return (
    <div className="rock-collection">
      <div className="collection-box">
        <div className="info-top">
          <div className="info-top-row">
            <div className="journey-number">Journey: {journeyNumber}</div>
            <div className="date-text">{date}</div>
          </div>
        </div>

        <div
          className="location-text"
          onClick={() => setIsLocationOpen(true)}
          title="Click to view full location"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsLocationOpen(true);
            }
          }}
        >
          {location}
        </div>
        <div
          className={`image-grid ${
            imageNames.length === 1 ? "single-image" : ""
          }`}
        >
          {imageNames.slice(0, 2).map((img, index) => (
            <div className="thumbnail-wrapper" key={img}>
              <img
                src={`${path}/sm/${img}.webp`}
                alt={`Rock image ${index + 1}`}
                className="thumbnail"
                onClick={() => openDialog(index)}
                aria-label={`Open full image ${index + 1}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    openDialog(index);
                  }
                }}
              />
            </div>
          ))}
        </div>

        <div
          className="comment-section"
          onClick={() => setIsCommentOpen(true)}
          title="Click to view full comment"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsCommentOpen(true);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          {comment}
        </div>
      </div>

      {/* Image dialog */}
      {isDialogOpen && (
        <div
          className="dialog-overlay"
          onClick={closeDialog}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer dialog"
        >
          <div
            className="dialog-content"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="image-counter top">
              Image {currentIndex + 1} of {imageNames.length}
            </div>

            <button
              className="nav-button left"
              onClick={prevImage}
              aria-label="Previous image"
            >
              ‹
            </button>

            <div className="dialog-inner">
              <img
                src={`${path}/webp/${imageNames[currentIndex]}.webp`}
                alt={`Full rock image ${currentIndex + 1}`}
                className="full-image"
              />
            </div>

            <button
              className="nav-button right"
              onClick={nextImage}
              aria-label="Next image"
            >
              ›
            </button>

            <button className="dialog-close-button" onClick={closeDialog}>
              Close
            </button>
          </div>
        </div>
      )}

      {isCommentOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setIsCommentOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full comment dialog"
        >
          <div
            className="dialog-content comment-popup"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="dialog-inner">
              <h3>Comment</h3>
              <p>{comment}</p>
            </div>
            <button
              className="dialog-close-button"
              onClick={() => setIsCommentOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isLocationOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setIsLocationOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full location dialog"
        >
          <div
            className="dialog-content comment-popup"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="dialog-inner">
              <h3>Location</h3>
              <p>{location}</p>
            </div>
            <button
              className="dialog-close-button"
              onClick={() => setIsLocationOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RockCollection;
