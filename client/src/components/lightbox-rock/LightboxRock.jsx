import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "./LightboxRock.module.css";

export default function LightboxRock({ open, onClose, imageSrc }) {
  if (!imageSrc) return null;

  const artistNames = imageSrc.artists?.map(a => a.display_name).join(", ");

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={[{
        src: `/media/catalog/${imageSrc.rock_number}/a.webp`,
        artist: artistNames,
        rockNumber: imageSrc.rock_number
      }]}
      carousel={{ finite: true }}
      render={{
        slide: ({ slide }) => (
          <div className={styles.slideContainer}>
            <div className={styles.topText}>{slide.artist ? `Artist: ${slide.artist}` : ''}</div>
            <img
              src={slide.src}
              alt=""
              className={styles.image}
            />
            <div className={styles.bottomText}>Rock: {slide.rockNumber}</div>
          </div>
        ),
        buttonPrev: () => null,
        buttonNext: () => null
      }}
    />
  );
}
