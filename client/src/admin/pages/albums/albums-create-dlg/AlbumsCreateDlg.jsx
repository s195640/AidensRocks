import axios from "axios";
import { useEffect, useRef, useState } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import AlbumsCreateTable from "./albums-create-table/AlbumsCreateTable";
import {
  FaPlus,
  FaSync,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import styles from "./AlbumsCreateDlg.module.css";

const AlbumsCreateDlg = ({
  albumData,
  photoData,
  onClose,
  onSubmit,
  isEdit = false,
  openImagesLightbox,
}) => {
  const [album, setAlbum] = useState(albumData);
  const [photos, setPhotos] = useState(photoData);
  const [isValid, setIsValid] = useState(false);
  const [nameError, setNameError] = useState("");
  const fileInputRef = useRef(null);

  // Validate album name
  useEffect(() => {
    const valid = /^[a-z0-9]+$/.test(album.name) && album.name.trim() !== "";
    setIsValid(valid);
    setNameError(
      valid
        ? ""
        : "Name can only contain lowercase letters and numbers, no spaces or special characters."
    );
  }, [album.name]);

  const handleFullRefresh = async () => {
    try {
      const [albumRes, photosRes] = await Promise.all([
        axios.get(`/api/albums/${album.pa_key}`),
        axios.get(`/api/albums/${album.pa_key}/photos`),
      ]);
      setAlbum(albumRes.data);
      setPhotos(photosRes.data);
    } catch (err) {
      console.error("Full refresh failed:", err);
      alert("Failed to refresh album data.");
    }
  };

  const handleAddImagesClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";

    input.onchange = async () => {
      const files = input.files;
      if (!files.length) return;
      const formData = new FormData();
      for (const file of files) formData.append("files", file);

      try {
        await axios.post(`/api/albums/${albumData.name}/upload-images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Upload complete. Please run the SYNC tool.");
        onClose();
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Check console for details.");
      }
    };

    input.click();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      if (!isEdit) {
        await axios.post("/api/albums", album);
        await axios.post(`/api/albums/${album.name}/init-folder`);
      } else {
        await axios.put(`/api/albums/${album.pa_key}`, album);
      }
      onSubmit();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  // --- Top right icon buttons ---
  const buttonPanel = (
    <div className={styles.iconPanel}>
      {isEdit && (
        <>
          <FaPlus
            className={styles.iconBtn}
            title="Add Images"
            onClick={handleAddImagesClick}
          />
          <FaSync
            className={styles.iconBtn}
            title="Refresh"
            onClick={handleFullRefresh}
          />
        </>
      )}
      <FaSave
        className={`${styles.iconBtn} ${!isValid ? styles.disabled : ""}`}
        title={isEdit ? "Save" : "Create"}
        onClick={handleSubmit}
      />
      <FaTimes
        className={styles.iconBtn}
        title="Cancel"
        onClick={onClose}
      />
    </div>
  );

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={isEdit ? "Edit Album" : "Create Album"}
      buttonPanel={buttonPanel}
      closeOnOutsideClick={false}
    >
      <div className={styles.formFields}>
        <label>
          Name:
          <input
            value={album.name}
            onChange={(e) =>
              setAlbum({
                ...album,
                name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
              })
            }
            readOnly={isEdit}
            className={isEdit ? styles.readOnly : ""}
          />
        </label>
        {nameError && <div className={styles.error}>{nameError}</div>}

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
            onChange={(e) =>
              setAlbum({ ...album, desc: e.target.value })
            }
          />
        </label>

        <label className={styles.checkboxLabel}>
          Show:
          <input
            type="checkbox"
            checked={album.show}
            onChange={(e) =>
              setAlbum({ ...album, show: e.target.checked })
            }
          />
        </label>
      </div>

      <AlbumsCreateTable
        album={album}
        photos={photos}
        setPhotos={setPhotos}
        onRefresh={handleFullRefresh}
        openImagesLightbox={openImagesLightbox}
      />
    </Dialog>
  );
};

export default AlbumsCreateDlg;
