import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "react-photo-album/rows.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";
import styles from "./AlbumsMultiLightbox.module.css";

export default function AlbumsMultiLightbox({ open, onClose, imageSrc, index = 0 }) {
  if (!imageSrc) return null;

  return (
    <Lightbox
      slides={imageSrc}
      open={open}
      close={onClose}
      index={index}
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
  );
}
