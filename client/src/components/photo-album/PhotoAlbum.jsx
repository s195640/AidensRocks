import axios from "axios";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";
import styles from "./PhotoAlbum.module.css";

const PhotoAlbum = ({ onAlbumClick, tag = "main", title = "Photo Albums" }) => {
  const [photos, setPhotos] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAlbums = async () => {
      let albums;
      try {
        const res = await axios.get("/api/albums/", { params: { tag } });
        albums = res.data;
      } catch (err) {
        // Used to be an unhandled rejection that left just the title.
        console.error("Failed to load photo albums:", err);
        if (!cancelled) setLoadFailed(true);
        return;
      }
      if (cancelled) return;
      setLoadFailed(false);

      const formattedPhotos = albums
        .filter((album) => album.show && album.first_image_name)
        .map((album) => ({
          src: `/media/albums/${album.name}/webp300x300/${album.first_image_name}`,
          width: 300,
          height: 300,
          title: album.display_name || album.name,
          isVideo: album.first_image_media_type === "video",
          album, // attach original album info
        }));

      setPhotos(formattedPhotos);
    };

    fetchAlbums();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  return (
    <div className={styles.galleryContainer}>
      <h1 className={styles.galleryTitle}>{title}</h1>
      {loadFailed && <p>The photo albums couldn&apos;t be loaded right now. Please try again later.</p>}
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={300}
        spacing={20}
        render={{
          photo: (_props, { photo, width, height }) => (
            <div
              key={photo.src}
              className={styles.photoContainer}
              style={{ width, height }}
              onClick={() => onAlbumClick?.(photo.album)}
            >
              <img
                src={photo.src}
                alt={photo.title || "Photo"}
                className={styles.photoImage}
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
    </div>
  );
};

export default PhotoAlbum;
