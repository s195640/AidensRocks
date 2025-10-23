import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "./MusicSingleLightbox.module.css";

export default function MusicSingleLightbox({ open, onClose, imageSrc }) {
  if (!imageSrc) return null;

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={[{
        src: imageSrc,
      }]}
      carousel={{ finite: true }}
      render={{
        slide: ({ slide }) => (
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
