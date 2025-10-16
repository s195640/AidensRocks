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
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import styles from "./AllRocks.module.css";
import ContentBody from "../../components/content-body/ContentBody";
import LabelValueDialog from "../../components/simple-components/label-value-dialog/LabelValueDialog";

export default function AllRocks() {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState("All Artists");
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rocksRes, detailsRes] = await Promise.all([
          axios.get("/api/rock-posts/allrocks"),
          axios.get("/api/ar-details"),
        ]);

        const rocks = rocksRes.data.map((r) => ({
          key: r.rock_number,
          src: `/media/catalog/${r.rock_number}/a.webp`,
          width: 512,
          height: 512,
          title: `Rock: ${r.rock_number} (${r.artists || "UNKNOWN"})`,
          artists: r.artists || "UNKNOWN",
        }));

        const uniqueArtists = [
          "All Artists",
          ...Array.from(
            new Set(
              rocks
                .map((r) => r.artists.split(",").map((a) => a.trim()))
                .flat()
            )
          ).sort((a, b) => {
            if (a === "UNKNOWN") return -1;
            if (b === "UNKNOWN") return 1;
            return a.localeCompare(b);
          }),
        ];

        setPhotos(rocks);
        setFilteredPhotos(rocks);
        setArtists(uniqueArtists);
        setDetails(detailsRes.data);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleArtistChange = (e) => {
    const artist = e.target.value;
    setSelectedArtist(artist);
    if (artist === "All Artists") {
      setFilteredPhotos(photos);
    } else {
      setFilteredPhotos(
        photos.filter((p) =>
          p.artists.split(",").map((a) => a.trim()).includes(artist)
        )
      );
    }
  };

  if (loading || !details) return null;

  return (
    <ContentBody>
      <div className={styles.galleryContainer}>
        {/* Header */}
        <div className={styles.headerContainer}>
          {/* Top row: centered Rocks count */}
          <div className={styles.centerTitle}>
            Rocks ({filteredPhotos.length})
          </div>

          {/* Second row: LabelValueDialog left, dropdown right */}
          <div className={styles.controlsRow}>
            <LabelValueDialog
              name="Artists"
              value={details.artistsTable?.length || 0}
              title="All Artists"
              items={details.artistsTable?.map((a) => ({
                ...a,
                name: `${a.name} ... (${a.relation})`,
              }))}
            />

            <select
              className={styles.dropdown}
              value={selectedArtist}
              onChange={handleArtistChange}
            >
              {artists.map((artist) => (
                <option key={artist} value={artist}>
                  {artist}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo grid */}
        <RowsPhotoAlbum
          photos={filteredPhotos}
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
                  alt={photo.title}
                  className={styles.photoImage}
                  onClick={onClick}
                />
                <div className={styles.photoTitle}>{photo.title}</div>
              </div>
            ),
          }}
        />

        {/* Lightbox */}
        <Lightbox
          slides={filteredPhotos.map((p) => ({
            src: p.src,
            width: p.width,
            height: p.height,
            description: p.title,
          }))}
          open={index >= 0}
          index={index}
          close={() => setIndex(-1)}
          plugins={[Thumbnails, Fullscreen, Zoom, Counter, Slideshow, Captions]}
          thumbnails={{ position: "bottom", width: 100, height: 60, borderRadius: 4 }}
          slideshow={{ autoplay: false, delay: 3000 }}
          captions={{ descriptionTextAlign: "center", descriptionMaxLines: 2 }}
          styles={{
            container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
            slide: { padding: "10px" },
            description: { textAlign: "center" },
          }}
        />
      </div>
    </ContentBody>
  );
}
