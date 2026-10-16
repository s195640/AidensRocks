import { useContext, useEffect, useRef, useState } from "react";
import JourneyActivityContext from "../JourneyActivityContext";
import { createSlideTracker, track } from "../../../utils/activity";
import { Play } from "lucide-react";

import "./RockCollection.css";

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";


import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

const RockCollection = ({ path, imagenames, date, location, comment, journeyNumber, rockNumber, rpsKey }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Site Tracking: what's opened inside a rock's journey, linked to the
  // dialog's rock_view (open_id) when there is one.
  const journey = useContext(JourneyActivityContext);
  const journeyRef = useRef(journey);
  journeyRef.current = journey;
  const trackStop = (type) =>
    track(type, {
      targetId: rockNumber != null ? String(rockNumber) : null,
      meta: { open_id: journey.openId, source: journey.source, rps_key: rpsKey ?? null },
    });
  const slides = useRef(null);
  if (!slides.current) {
    slides.current = createSlideTracker("journey_photo_view", () => ({
      open_id: journeyRef.current.openId,
      rock_number: rockNumber != null ? String(rockNumber) : null,
    }));
  }
  useEffect(() => () => slides.current.end(), []);

  const openLocation = () => {
    setIsLocationOpen(true);
    trackStop("journey_location");
  };
  const openComment = () => {
    setIsCommentOpen(true);
    trackStop("journey_comment");
  };

  // Prepare images for Lightbox
  // Lightbox expects array of objects with `src` property (full image URL)
  const images = imagenames.map((img) =>
    img.media_type === "video"
      ? {
          type: "video",
          poster: `${path}/webp/${img.name}.webp`,
          sources: [{ src: `${path}/video/${img.name}.mp4`, type: "video/mp4" }],
        }
      : {
          src: `${path}/webp/${img.name}.webp`,
          alt: `Rock image`,
        }
  );

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
          onClick={openLocation}
          title="Click to view full location"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openLocation();
          }}
        >
          {location}
        </div>

        <div className={`image-grid ${imagenames.length === 1 ? "single-image" : ""}`}>
          {imagenames.slice(0, 2).map((img, index) => (
            <div className="thumbnail-wrapper" key={img.name}>
              <img
                src={`${path}/sm/${img.name}.webp`}
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
              {img.media_type === "video" && (
                <div className="play-icon-overlay">
                  <Play size={32} fill="white" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="comment-section"
          onClick={openComment}
          title="Click to view full comment"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openComment();
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
          close={() => {
            slides.current.end();
            setIsLightboxOpen(false);
          }}
          on={{
            view: ({ index }) => {
              const img = imagenames[index];
              if (img) {
                slides.current.show(String(img.rpi_key ?? img.name), { is_video: img.media_type === "video" });
              }
            },
          }}
          plugins={[Thumbnails, Fullscreen, Zoom, Counter, Slideshow, Captions, Video]}
          thumbnails={{
            position: "bottom",
            width: 100,
            height: 60,
            borderRadius: 4,
          }}
          slideshow={{ autoplay: false, delay: 3000 }}
          video={{ controls: true, autoPlay: true }}
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
          className="rock-collection-overlay"
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
          className="rock-collection-overlay"
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
