import axios from "axios";
import { useEffect, useState } from "react";

import { RowsPhotoAlbum } from "react-photo-album";
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

import styles from "./AllRocks.module.css";
import ContentBody from "../../components/content-body/ContentBody";

export default function AllRocks() {
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const loadRocks = async () => {
      try {
        const res = await axios.get("/api/rock-posts/allrocks");
        const rocks = res.data;

        // Build photo objects
        const photoList = rocks.map((rock) => ({
          key: rock.rock_number,
          src: `/media/catalog/${rock.rock_number}/a.webp`,
          width: 512,
          height: 512,
          title: `Rock: ${rock.rock_number} (${rock.artists || "UNKNOWN"})`,
        }));

        setPhotos(photoList);
      } catch (err) {
        console.error("Failed to load rocks", err);
      }
    };

    loadRocks();
  }, []);

  return (
    <div>
      <ContentBody>


        <div className={styles.galleryContainer}>
          <h1 className={styles.galleryTitle}>All Rocks</h1>

          <RowsPhotoAlbum
            photos={photos}
            targetRowHeight={300}
            spacing={20}
            onClick={({ index }) => setIndex(index)}
            render={{
              photo: ({ onClick }, { photo, width, height }) => (
                <div
                  key={photo.key}
                  className={styles.photoContainer}
                  style={{ width, height }}
                >
                  <img
                    src={photo.src}
                    alt={photo.title || "Rock"}
                    className={styles.photoImage}
                    onClick={onClick}
                  />
                  {photo.title && (
                    <div className={styles.photoTitle}>{photo.title}</div>
                  )}
                </div>
              ),
            }}
          />

          <Lightbox
            slides={photos.map(p => ({
              src: p.src,
              width: p.width,
              height: p.height,
              description: `Rock: ${p.key} (${p.artists || "UNKNOWN"})`, // bottom-centered
              // remove `title` field entirely so nothing appears at the top
            }))}
            open={index >= 0}
            index={index}
            close={() => setIndex(-1)}
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
              description: { textAlign: "center" }, // center bottom
            }}
          />


        </div>
      </ContentBody>
    </div>
  );
}
