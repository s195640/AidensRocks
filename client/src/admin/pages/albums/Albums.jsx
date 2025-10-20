// Albums.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import AlbumsCreateDlg from "./albums-create-dlg/AlbumsCreateDlg";
import styles from "./Albums.module.css";
import AlbumsTable from "./albums-table/AlbumsTable";
import AlbumsSingleLightbox from "./albums-single-lightbox/AlbumsSingleLightbox";
import AlbumsMultiLightbox from "./albums-multi-lightbox/AlbumsMultiLightbox";

const Albums = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [editingPhotos, setEditingPhotos] = useState([]);
  const [fullImage, setFullImage] = useState(null);
  const [imagesIndex, setImagesIndex] = useState(-1);
  const [imagesLightbox, setImagesLightbox] = useState(null);

  const openFullImageDialog = (album) => {
    setFullImage(`/media/albums/${album.name}/webp/${album.first_image_name}`);
  };

  const closeFullImageDialog = () => {
    setFullImage(null);
  };

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/albums");
      setAlbums(res.data);
    } catch (err) {
      console.error("Failed to fetch albums:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = () => {
    setEditingAlbum({
      name: "",
      display_name: "",
      desc: "",
      show: true,
    });
    setEditingPhotos([]);
  };

  const handleEdit = async (album) => {
    try {
      const res = await axios.get(`/api/albums/${album.pa_key}/photos`);
      setEditingAlbum(album);
      setEditingPhotos(res.data);
    } catch (err) {
      console.error("Failed to load album photos:", err);
      setEditingPhotos([]);
      setEditingAlbum(album);
    }
  };

  const handleToggleShow = async (pa_key) => {
    try {
      const res = await axios.patch(`/api/albums/${pa_key}/show`);
      const updatedShow = res.data.show;
      setAlbums((prev) =>
        prev.map((album) =>
          album.pa_key === pa_key ? { ...album, show: updatedShow } : album
        )
      );
    } catch (err) {
      console.error("Failed to toggle show:", err);
    }
  };

  const handleDelete = async (pa_key) => {
    if (!window.confirm("Are you sure you want to delete this album?")) return;

    try {
      // Delete the album
      await axios.delete(`/api/albums/${pa_key}`);
      console.log(`Album ${pa_key} deleted`);

      // Reorder remaining albums
      await axios.post(`/api/albums/reorder-all`);
      console.log("Albums reordered");

      // Refresh the list
      await fetchAlbums();
    } catch (err) {
      console.error("Failed to delete or reorder albums:", err);
      alert("An error occurred while deleting the album.");
    }
  };

  const handleReorder = async (order) => {
    setLoading(true);
    try {
      await axios.post(`/api/albums/reorder`, {
        order
      });
      await fetchAlbums();
    } catch (err) {
      console.error("Failed to reorder albums:", err);
    } finally {
      setLoading(false);
    }
  };

  const openImagesLightbox = async (album, index = 0) => {
    const res = await axios.get(`/api/albums/${album.pa_key}/photos`);
    setImagesLightbox(res.data.map(i => ({ src: `/media/albums/${album.name}/webp/${i.name}` })));
    setImagesIndex(index);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Albums</h2>
        <div className={styles.actions}>
          <button onClick={fetchAlbums}>Refresh</button>
          <button
            onClick={() => axios.post("/api/albums/sync").then(fetchAlbums)}
          >
            Sync
          </button>
          <button onClick={handleCreate}>Create</button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <AlbumsTable
          albums={albums}
          handleToggleShow={handleToggleShow}
          handleDelete={handleDelete}
          handleEdit={handleEdit}
          handleReorder={handleReorder}
          openFullImageDialog={openFullImageDialog}
          loading={loading}
          openImagesLightbox={openImagesLightbox}
        />
      )}

      {editingAlbum && (
        <AlbumsCreateDlg
          albumData={editingAlbum}
          photoData={editingPhotos}
          onClose={() => {
            setEditingAlbum(null);
            setEditingPhotos([]);
          }}
          onSubmit={() => {
            fetchAlbums();
            setEditingAlbum(null);
            setEditingPhotos([]);
          }}
          isEdit={!!editingAlbum.pa_key}
          openImagesLightbox={openImagesLightbox}
        />
      )}
      <AlbumsSingleLightbox open={fullImage} onClose={closeFullImageDialog} imageSrc={fullImage} />
      <AlbumsMultiLightbox open={imagesIndex >= 0} onClose={() => { setImagesIndex(-1); setImagesLightbox(null); }} imageSrc={imagesLightbox} index={imagesIndex} />
    </div>
  );
};

export default Albums;
