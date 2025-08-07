// Albums.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import AlbumCreate from "../../components/album-create/AlbumCreate";
import styles from "./Albums.module.css";

const Albums = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [editingPhotos, setEditingPhotos] = useState([]);
  const [fullImage, setFullImage] = useState(null); // will hold the album object or just image info

  const openFullImageDialog = (album) => {
    setFullImage(album);
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

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= albums.length) return;

    const albumA = albums[index];
    const albumB = albums[targetIndex];

    setLoading(true);
    try {
      await axios.post(`/api/albums/reorder`, {
        a_key: albumA.pa_key,
        a_order: albumB.order_num,
        b_key: albumB.pa_key,
        b_order: albumA.order_num,
      });
      await fetchAlbums();
    } catch (err) {
      console.error("Failed to reorder albums:", err);
    } finally {
      setLoading(false);
    }
  };

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
        <table className={styles.albumTable}>
          <thead>
            <tr>
              <th>Image</th> {/* New column */}
              <th>Name</th>
              <th>Display Name</th>
              <th>Description</th>
              <th>Order</th>
              <th>Show</th>
              <th>Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((album, index) => {
              const imageUrl = album.first_image_name
                ? `/media/albums/${album.name}/webp300x300/${album.first_image_name}`
                : null;

              return (
                <tr key={album.pa_key}>
                  <td>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={album.display_name || album.name}
                        style={{
                          width: 50,
                          height: 50,
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        onClick={() => openFullImageDialog(album)}
                      />
                    ) : (
                      <div
                        style={{ width: 50, height: 50, background: "#ccc" }}
                      />
                    )}
                  </td>
                  <td>{album.name}</td>
                  <td>{album.display_name}</td>
                  <td>{album.desc}</td>
                  <td>
                    {album.order_num} <br />
                    <button
                      disabled={index === 0}
                      onClick={() => handleReorder(index, "up")}
                    >
                      ▲
                    </button>
                    <button
                      disabled={index === albums.length - 1}
                      onClick={() => handleReorder(index, "down")}
                    >
                      ▼
                    </button>
                  </td>
                  <td>{album.show ? "Yes" : "No"}</td>
                  <td>{album.count}</td>
                  <td className={styles.actionsCol}>
                    <button onClick={() => handleToggleShow(album.pa_key)}>
                      {album.show ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => handleEdit(album)}>Edit</button>
                    <button
                      onClick={() => handleDelete(album.pa_key, album.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editingAlbum && (
        <AlbumCreate
          isEdit={!!editingAlbum.pa_key}
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
        />
      )}
      {fullImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={closeFullImageDialog}
        >
          <div
            style={{
              position: "relative",
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 6,
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()} // prevent modal close on inner click
          >
            <img
              src={`/media/albums/${fullImage.name}/webp/${fullImage.first_image_name}`}
              alt={fullImage.display_name || fullImage.name}
              style={{
                maxWidth: "80vw",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
            <button
              onClick={closeFullImageDialog}
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                background: "transparent",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                lineHeight: 1,
              }}
              aria-label="Close full image"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Albums;
