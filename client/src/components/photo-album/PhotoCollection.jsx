import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createSlideTracker, openView } from "../../utils/activity";

import { RowsPhotoAlbum } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "react-photo-album/rows.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

import { Play, X } from "lucide-react";
import styles from "./PhotoCollection.module.css";

const PhotoCollection = ({ album, onBack }) => {
  const [thumbPhotos, setThumbPhotos] = useState([]);
  const [fullPhotos, setFullPhotos] = useState([]);
  const [index, setIndex] = useState(-1);

  // Site Tracking: album_open / album_close (time viewing, photos opened)
  // and photo_view per photo shown full-screen. Used on Photos and
  // Birthdays, so `page` says which.
  const { pathname } = useLocation();
  const viewRef = useRef(null);
  const photosViewed = useRef(new Set());
  const slides = useRef(null);
  if (!slides.current) {
    slides.current = createSlideTracker("photo_view", () => ({
      open_id: viewRef.current?.openId ?? null,
      album_id: album.pa_key,
    }));
  }
  useEffect(() => {
    photosViewed.current = new Set();
    const view = openView("album_open", "album_close", {
      targetId: String(album.pa_key),
      meta: { album_name: album.name, page: pathname.startsWith("/birthdays") ? "birthdays" : "photos" },
      closeMeta: () => ({ photos_viewed: photosViewed.current.size }),
    });
    viewRef.current = view;
    return () => {
      slides.current.end();
      view.close();
    };
  }, [album.pa_key]);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const res = await axios.get(`/api/albums/${album.pa_key}/photos`);
        const visible = res.data.filter((p) => p.show);

        const thumb = visible.map((photo) => ({
          key: photo.p_key,
          src: `/media/albums/${album.name}/webp300x300/${photo.name}`,
          width: 300,
          height: 300,
          title: photo.display_name,
          isVideo: photo.media_type === "video",
        }));

        const full = visible.map((photo) => {
          if (photo.media_type === "video") {
            const basename = photo.name.replace(/\.webp$/i, "");
            return {
              type: "video",
              poster: `/media/albums/${album.name}/webp/${photo.name}`,
              width: photo.width,
              height: photo.height,
              description: photo.display_name || "",
              sources: [
                {
                  src: `/media/albums/${album.name}/video/${basename}.mp4`,
                  type: "video/mp4",
                },
              ],
            };
          }

          return {
            src: `/media/albums/${album.name}/webp/${photo.name}`,
            width: photo.width,
            height: photo.height,
            alt: photo.display_name || "Photo",
            description: photo.display_name || "",
          };
        });

        setThumbPhotos(thumb);
        setFullPhotos(full);
      } catch (err) {
        console.error("Failed to load album photos", err);
      }
    };

    loadPhotos();
  }, [album]);

  return (
    <div className={styles.galleryContainer}>
      <X className={styles.closeButton} onClick={onBack} />

      <div className={styles.albumHeader}>
        <h1 className={styles.galleryTitle}>
          {album.display_name || album.name}
        </h1>
        {album.desc && <p className={styles.galleryDesc}>{album.desc}</p>}
      </div>

      <RowsPhotoAlbum
        photos={thumbPhotos}
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
                alt={photo.title || "Photo"}
                className={styles.photoImage}
                onClick={onClick}
              />
              {photo.isVideo && (
                <div className={styles.playIconOverlay}>
                  <Play size={40} fill="white" />
                </div>
              )}
              {photo.title && (
                <div className={styles.photoTitle}>{photo.title}</div>
              )}
            </div>
          ),
        }}
      />

      <Lightbox
        slides={fullPhotos}
        open={index >= 0}
        index={index}
        close={() => {
          slides.current.end();
          setIndex(-1);
        }}
        on={{
          view: ({ index: shown }) => {
            const photo = thumbPhotos[shown];
            if (!photo) return;
            photosViewed.current.add(photo.key);
            slides.current.show(String(photo.key), { is_video: photo.isVideo });
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
    </div>
  );
};

export default PhotoCollection;
