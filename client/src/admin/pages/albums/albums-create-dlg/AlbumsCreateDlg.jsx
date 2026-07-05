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

// Cloudflare (prod host) hard-caps request bodies at 100MB, so anything
// bigger has to be split client-side and reassembled on the server.
const CHUNK_SIZE = 80 * 1024 * 1024;

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
  const [uploadQueue, setUploadQueue] = useState([]);
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

  const isUploading = uploadQueue.some(
    (f) => f.status === "pending" || f.status === "uploading"
  );

  const uploadWhole = async (file, onProgress) => {
    const formData = new FormData();
    formData.append("files", file);
    await axios.post(`/api/albums/${albumData.name}/upload-images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        onProgress(evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0);
      },
    });
  };

  const uploadInChunks = async (file, onProgress) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const chunk = file.slice(start, start + CHUNK_SIZE);

      const chunkData = new FormData();
      chunkData.append("chunk", chunk);
      chunkData.append("uploadId", uploadId);
      chunkData.append("chunkIndex", chunkIndex);
      chunkData.append("totalChunks", totalChunks);
      chunkData.append("originalName", file.name);

      await axios.post(`/api/albums/${albumData.name}/upload-chunk`, chunkData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          const chunkFraction = evt.total ? evt.loaded / evt.total : 0;
          onProgress(Math.round(((chunkIndex + chunkFraction) / totalChunks) * 100));
        },
      });
    }
  };

  const handleAddImagesClick = () => {
    if (isUploading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,video/*";

    input.onchange = async () => {
      const files = Array.from(input.files);
      if (!files.length) return;

      setUploadQueue(
        files.map((file) => ({ name: file.name, progress: 0, status: "pending" }))
      );

      let hadError = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadQueue((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
        );

        const onProgress = (progress) =>
          setUploadQueue((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          );

        try {
          if (file.size > CHUNK_SIZE) {
            await uploadInChunks(file, onProgress);
          } else {
            await uploadWhole(file, onProgress);
          }
          setUploadQueue((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress: 100, status: "done" } : f
            )
          );
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          hadError = true;
          setUploadQueue((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: "error" } : f))
          );
        }
      }

      if (hadError) {
        alert("Some files failed to upload. Check the list for details.");
      } else {
        alert("Upload complete. Please run the SYNC tool.");
        setUploadQueue([]);
        onClose();
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
            className={`${styles.iconBtn} ${isUploading ? styles.disabled : ""}`}
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

      {uploadQueue.length > 0 && (
        <div className={styles.uploadQueue}>
          {uploadQueue.map((f) => (
            <div key={f.name} className={styles.uploadRow}>
              <div className={styles.uploadName}>{f.name}</div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${
                    f.status === "error" ? styles.progressError : ""
                  }`}
                  style={{ width: `${f.progress}%` }}
                />
              </div>
              <div className={styles.uploadStatus}>
                {f.status === "error" ? "Failed" : `${f.progress}%`}
              </div>
            </div>
          ))}
        </div>
      )}

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
