import axios from "axios";
import { useEffect, useRef, useState } from "react";
import styles from "./AlbumCreate.module.css";
import PhotoEditDialog from "./PhotoEditDialog";

const AlbumCreate = ({
  albumData,
  photoData,
  onClose,
  onSubmit,
  isEdit = false,
}) => {
  const [album, setAlbum] = useState(albumData);
  const [photos, setPhotos] = useState(photoData);
  const [isValid, setIsValid] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [fullImage, setFullImage] = useState(null);

  const openFullImageDialog = (photo) => {
    setFullImage(photo);
  };

  const closeFullImageDialog = () => {
    setFullImage(null);
  };

  useEffect(() => {
    setIsValid(album.name.trim() !== "");
  }, [album.name]);

  const handleFullRefresh = async () => {
    try {
      const albumRes = await axios.get(`/api/albums/${album.pa_key}`);
      const photosRes = await axios.get(`/api/albums/${album.pa_key}/photos`);

      setAlbum(albumRes.data);
      setPhotos(photosRes.data);
    } catch (err) {
      console.error("Full refresh failed:", err);
      alert("Failed to refresh album data.");
    }
  };

  const togglePhotoShow = async (idx) => {
    const photo = photos[idx];
    try {
      const res = await axios.post(
        `/api/albums/photos/${photo.p_key}/toggle-show`
      );
      const newShowValue = res.data.show;

      setPhotos((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, show: newShowValue } : p))
      );
    } catch (err) {
      console.error("Toggle show failed:", err);
    }
  };

  const editPhoto = (idx) => {
    setEditingPhoto(photos[idx]);
  };

  const deletePhoto = async (idx) => {
    const photo = photos[idx];
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    try {
      await axios.delete(`/api/albums/photos/${photo.p_key}`);
      await handleFullRefresh();
    } catch (err) {
      console.error("Delete photo failed:", err);
      alert("Failed to delete photo.");
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    if (!isEdit) {
      try {
        await axios.post("/api/albums", album);
        await axios.post(`/api/albums/${album.name}/init-folder`);
      } catch (err) {
        console.error("Create failed:", err);
        return;
      }
    } else {
      try {
        await axios.put(`/api/albums/${album.pa_key}`, album);
      } catch (err) {
        console.error("Update failed:", err);
        return;
      }
    }
    onSubmit();
  };

  const movePhoto = async (idx, direction) => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= photos.length) return;

    const photo1 = photos[idx];
    const photo2 = photos[targetIdx];

    try {
      await axios.post(`/api/albums/${album.pa_key}/photos/swap`, {
        photo1: { p_key: photo1.p_key, order_num: photo2.order_num },
        photo2: { p_key: photo2.p_key, order_num: photo1.order_num },
      });

      setPhotos((prev) => {
        const newPhotos = [...prev];
        [newPhotos[idx], newPhotos[targetIdx]] = [
          { ...photo2, order_num: photo1.order_num },
          { ...photo1, order_num: photo2.order_num },
        ];
        return newPhotos;
      });
    } catch (err) {
      console.error("Photo order swap failed:", err);
    }
  };

  // Add Images: open file dialog
  const handleAddImagesClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";

    // ✅ The file picker is triggered directly on click
    input.onchange = async () => {
      const files = input.files;
      if (!files.length) return;

      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file); // field name must match multer config
      }

      try {
        await axios.post(
          `/api/albums/${albumData.name}/upload-images`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        alert("Upload complete. Please run the SYNC tool.");
        onClose();
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Check console for details.");
      }
    };

    input.click(); // ✅ Must be called in this synchronous user event
  };

  // Add Images: upload handler
  const handleAddImages = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";

    input.onchange = async () => {
      const files = input.files;
      if (!files.length) return;

      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file); // ✅ field name must be 'files'
      }

      try {
        await axios.post(
          `/api/albums/${albumData.name}/upload-images`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        alert("Upload complete. Please run the SYNC tool.");
        onClose();
      } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed. Check console for details.");
      }
    };

    input.click();
  };

  const handlePhotoUpdate = async (updatedPhoto) => {
    try {
      await axios.put(`/api/albums/photos/${updatedPhoto.p_key}`, updatedPhoto);
      await handleFullRefresh();
      setEditingPhoto(null);
    } catch (err) {
      console.error("Update photo failed:", err);
      alert("Failed to update photo.");
    }
  };

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>{isEdit ? "Edit Album" : "Create Album"}</h3>
          <div className={styles.actions}>
            {isEdit && (
              <>
                <button onClick={handleAddImagesClick}>Add Images</button>
                <button onClick={handleFullRefresh}>Refresh</button>
              </>
            )}
            <button onClick={handleSubmit} disabled={!isValid}>
              {isEdit ? "Update" : "Create"}
            </button>
            <button onClick={onClose} className="cancel">
              Cancel
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept="image/*"
          onChange={handleAddImages}
        />

        <div className={styles.formFields}>
          <label>
            Name:
            <input
              value={album.name}
              onChange={(e) => setAlbum({ ...album, name: e.target.value })}
              readOnly={isEdit}
              className={isEdit ? styles.readOnly : ""}
            />
          </label>

          <label>
            Display Name:
            <input
              value={album.display_name}
              onChange={(e) =>
                setAlbum({ ...album, display_name: e.target.value })
              }
            />
          </label>

          <label>
            Description:
            <textarea
              value={album.desc}
              onChange={(e) => setAlbum({ ...album, desc: e.target.value })}
            />
          </label>

          <label className={styles.checkboxLabel}>
            Show:
            <input
              type="checkbox"
              checked={album.show}
              onChange={(e) => setAlbum({ ...album, show: e.target.checked })}
            />
          </label>
        </div>

        <table className={styles.albumTable}>
          <thead>
            <tr>
              <th>Image</th> {/* new image header */}
              <th>Name</th>
              <th>Display Name</th>
              <th>Description</th>
              <th>Date</th>
              <th>Order</th>
              <th>Show</th>
              <th>Width</th>
              <th>Height</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {photos.map((photo, idx) => {
              return (
                <tr key={photo.p_key || idx}>
                  <td>
                    <img
                      src={`/media/albums/${album.name}/webp300x300/${photo.name}`}
                      alt={photo.display_name || photo.name}
                      style={{
                        width: 50,
                        height: 50,
                        objectFit: "cover",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                      onClick={() => openFullImageDialog(photo)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/media/placeholder.png";
                      }}
                    />
                  </td>
                  <td>{photo.name}</td>
                  <td>{photo.display_name}</td>
                  <td>{photo.desc}</td>
                  <td>{photo.date}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div>{photo.order_num}</div>
                      <div>
                        <button
                          onClick={() => movePhoto(idx, "up")}
                          disabled={idx === 0}
                          style={{ fontSize: "10px", marginBottom: "2px" }}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => movePhoto(idx, "down")}
                          disabled={idx === photos.length - 1}
                          style={{ fontSize: "10px" }}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>{photo.show ? "Yes" : "No"}</td>
                  <td>{photo.width}</td>
                  <td>{photo.height}</td>
                  <td className={styles.actionsCol}>
                    <button onClick={() => togglePhotoShow(idx)}>
                      {photo.show ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => editPhoto(idx)}>Edit</button>
                    <button onClick={() => deletePhoto(idx)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingPhoto && (
        <PhotoEditDialog
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onUpdate={handlePhotoUpdate}
          onRefresh={handleFullRefresh}
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
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
          >
            <img
              src={`/media/albums/${album.name}/webp/${fullImage.name}`}
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

export default AlbumCreate;
