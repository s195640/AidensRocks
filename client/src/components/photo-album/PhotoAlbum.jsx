import axios from "axios";
import { useEffect, useState } from "react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";
import styles from "./PhotoAlbum.module.css";

const PhotoAlbum = ({ onAlbumClick }) => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const fetchAlbums = async () => {
      const res = await axios.get("/api/albums/");
      const albums = res.data;

      const formattedPhotos = albums
        .filter((album) => album.show && album.first_image_name)
        .map((album) => ({
          src: `/media/albums/${album.name}/webp300x300/${album.first_image_name}`,
          width: 300,
          height: 300,
          title: album.display_name || album.name,
          album, // attach original album info
        }));

      setPhotos(formattedPhotos);
    };

    fetchAlbums();
  }, []);

  return (
    <div className={styles.galleryContainer}>
      <h1 className={styles.galleryTitle}>Photo Albums</h1>
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={300}
        spacing={20}
        render={{
          photo: ({}, { photo, width, height }) => (
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
