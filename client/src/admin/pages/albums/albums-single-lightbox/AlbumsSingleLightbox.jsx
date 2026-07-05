import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import styles from "./AlbumsSingleLightbox.module.css";

export default function AlbumsSingleLightbox({ open, onClose, imageSrc, isVideo = false }) {
  if (!imageSrc) return null;

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={[
        isVideo
          ? { type: "video", sources: [{ src: imageSrc, type: "video/mp4" }] }
          : { src: imageSrc },
      ]}
      plugins={[Video]}
      video={{ controls: true, autoPlay: true }}
      carousel={{ finite: true }}
      render={{
        slide: ({ slide }) =>
          slide.type === "video" ? undefined : (
            <div className={styles.slideContainer}>
              <img
                src={slide.src}
                alt=""
                className={styles.image}
              />
            </div>
          ),
        buttonPrev: () => null,
        buttonNext: () => null
      }}
    />
  );
}
