// MusicCreateEditDlg.jsx
import { useEffect, useState } from "react";
import styles from "./MusicCreateEditDlg.module.css";
import Dialog from "../../../../components/simple-components/dialog/Dialog";

const MusicCreateEditDlg = ({ isOpen, onClose, onSave, selectedSong }) => {
  const [title, setTitle] = useState("");
  const [writer, setWriter] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [musicFile, setMusicFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedSong) {
      setTitle(selectedSong.name || "");
      setWriter(selectedSong.writer || "");
      setLyrics(selectedSong.lyrics || "");
      setMusicFile(null);
      setImageFile(null);
    } else {
      setTitle("");
      setWriter("");
      setLyrics("");
      setMusicFile(null);
      setImageFile(null);
    }
    setError("");
  }, [selectedSong, isOpen]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!title || !writer || !lyrics || (!selectedSong && (!musicFile || !imageFile))) {
      setError("All fields and both files are required.");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("writer", writer);
      formData.append("lyrics", lyrics);
      if (musicFile) formData.append("music_file", musicFile);
      if (imageFile) formData.append("image_file", imageFile);

      await onSave({ m_key: selectedSong?.m_key, data: formData });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error saving song. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={selectedSong ? "Edit Song" : "Create Song"}
      buttonPanel={
        <>
          <button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.dialogForm}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <label>Song Title*</label>
        <div className={styles.titleRow}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          {selectedSong && (
            <img
              src={`/media/music/${selectedSong.m_key}/sm.webp`}
              alt="current song"
              className={styles.existingImage}
            />
          )}
        </div>

        <label>Writer*</label>
        <input type="text" value={writer} onChange={(e) => setWriter(e.target.value)} required />

        <label>Lyrics*</label>
        <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} required />

        <label>{selectedSong ? "Replace Music File" : "Music File*"}</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setMusicFile(e.target.files[0])}
          required={!selectedSong}
        />
        {musicFile && (
          <div className={styles.previewContainer}>
            <p>{musicFile.name}</p>
          </div>
        )}

        <label>{selectedSong ? "Replace Image" : "Image File*"}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          required={!selectedSong}
        />
        {imageFile && (
          <div className={styles.previewContainer}>
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className={styles.imagePreview}
            />
          </div>
        )}
      </form>
    </Dialog>
  );
};

export default MusicCreateEditDlg;
