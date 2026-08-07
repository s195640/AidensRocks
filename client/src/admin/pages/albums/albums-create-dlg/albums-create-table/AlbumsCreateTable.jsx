import { useState } from "react";
import axios from "axios";
import authFetch from "../../../../utils/authFetch";
import Table from "../../../../../components/simple-components/table/Table";
import PhotoEditDialog from "../photo-edit-dlg/PhotoEditDialog";
import { FaEdit, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import { Play } from "lucide-react";
import styles from "./AlbumsCreateTable.module.css";

export default function AlbumsCreateTable({ album, photos, setPhotos, onRefresh, openImagesLightbox }) {
  const [loading, setLoading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);

  const handleReorder = async (order) => {
    setLoading(true);
    try {
      await axios.post(`/api/albums/photos/reorder`, {
        pa_key: album.pa_key,
        order
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to reorder albums:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoShow = async (photo) => {
    try {
      const res = await authFetch(`/api/albums/photos/${photo.p_key}/toggle-show`, {
        method: "POST",
      });
      const data = await res.json();
      setPhotos((prev) =>
        prev.map((p) => (p.p_key === photo.p_key ? { ...p, show: data.show } : p))
      );
    } catch (err) {
      console.error("Toggle show failed:", err);
    }
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    try {
      await authFetch(`/api/albums/photos/${photo.p_key}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error("Delete photo failed:", err);
    }
  };

  const handlePhotoUpdate = async (updatedPhoto) => {
    try {
      await authFetch(`/api/albums/photos/${updatedPhoto.p_key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPhoto),
      });
      onRefresh();
      setEditingPhoto(null);
    } catch (err) {
      console.error("Update photo failed:", err);
    }
  };

  const columns = [
    { key: "image", label: "Image", sortable: false, defaultWidth: 60 },
    { key: "name", label: "Name", sortable: false, defaultWidth: 120 },
    { key: "display_name", label: "Display Name", sortable: false, defaultWidth: 150 },
    { key: "desc", label: "Description", sortable: false, defaultWidth: 200 },
    { key: "date", label: "Date", sortable: false, defaultWidth: 80 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 100 },
  ];

  const renderCell = (photo, key) => {
    switch (key) {
      case "image":
        return photo.name ? (
          <div className={styles.thumbWrapper}>
            <img
              src={`/media/albums/${album.name}/webp300x300/${photo.name}`}
              alt={photo.display_name || photo.name}
              className={styles.thumb}
              onClick={() => openImagesLightbox(album, photo.order_num)}
              onError={(e) => (e.target.style.display = "none")}
            />
            {photo.media_type === "video" && (
              <Play className={styles.playIconOverlay} size={20} fill="white" />
            )}
          </div>
        ) : (
          <div className={styles.thumbPlaceholder} />
        );
      case "actions":
        return (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            {photo.show ? (
              <FaEye
                size={20}
                className={styles.actionIcon}
                style={{ color: "gray" }}
                onClick={() => togglePhotoShow(photo)}
                title="Disable"
              />
            ) : (
              <FaEyeSlash
                size={20}
                className={styles.actionIcon}
                style={{ color: "#5cb85c" }}
                onClick={() => togglePhotoShow(photo)}
                title="Enable"
              />
            )}
            <FaEdit
              size={20}
              className={styles.actionIcon}
              style={{ color: "#5bc0de" }}
              onClick={() => setEditingPhoto(photo)}
              title="Edit"
            />
            <FaTrash
              size={20}
              className={styles.actionIcon}
              style={{ color: "red" }}
              onClick={() => deletePhoto(photo)}
              title="Delete"
            />
          </div>
        );
      case "date":
        return photo.date ? new Date(photo.date).toLocaleDateString() : "";
      default:
        return photo[key];
    }
  };

  return (
    <>
      <Table
        columns={columns}
        data={photos}
        renderCell={renderCell}
        enableRowDrag
        onRowReorder={(newData) => handleReorder(newData.map(i => i.p_key))}
        loading={loading}
        fontSize="0.75rem"
      />

      {editingPhoto && (
        <PhotoEditDialog
          isOpen={editingPhoto}
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onUpdate={handlePhotoUpdate}
        />
      )}

    </>
  );
}
