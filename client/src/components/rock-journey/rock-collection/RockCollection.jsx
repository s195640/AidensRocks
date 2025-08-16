import { useState } from "react";

import "./RockCollection.css";

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";


import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

const RockCollection = ({ path, imagenames, date, location, comment, journeyNumber }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Prepare images for Lightbox
  // Lightbox expects array of objects with `src` property (full image URL)
  const images = imagenames.map((name) => ({
    src: `${path}/webp/${name}.webp`,
    alt: `Rock image`,
  }));

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
  };

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
            if (e.key === "Enter" || e.key === " ") setIsLocationOpen(true);
          }}
        >
          {location}
        </div>

        <div className={`image-grid ${imagenames.length === 1 ? "single-image" : ""}`}>
          {imagenames.slice(0, 2).map((img, index) => (
            <div className="thumbnail-wrapper" key={img}>
              <img
                src={`${path}/sm/${img}.webp`}
                alt={`Rock image ${index + 1}`}
                className="thumbnail"
                onClick={() => openLightbox(index)}
                aria-label={`Open full image ${index + 1}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openLightbox(index);
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
            if (e.key === "Enter" || e.key === " ") setIsCommentOpen(true);
          }}
          style={{ cursor: "pointer" }}
        >
          {comment}
        </div>
      </div>

      {/* Lightbox for images */}
      {isLightboxOpen && (
        <Lightbox
          slides={images}
          open={isLightboxOpen}
          index={currentIndex}
          close={() => setIsLightboxOpen(false)}
          plugins={[Thumbnails, Fullscreen, Zoom, Counter, Slideshow, Captions]}
          thumbnails={{
            position: "bottom",
            width: 100,
            height: 60,
            borderRadius: 4,
          }}
          slideshow={{ autoplay: false, delay: 3000 }}
          captions={{
            descriptionTextAlign: "center",
            descriptionMaxLines: 2,
          }}
          styles={{
            container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
            slide: { padding: "10px" },
          }}
        />
      )}

      {/* Comment dialog */}
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
            <button className="dialog-close-button" onClick={() => setIsCommentOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Location dialog */}
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
            <button className="dialog-close-button" onClick={() => setIsLocationOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RockCollection;
