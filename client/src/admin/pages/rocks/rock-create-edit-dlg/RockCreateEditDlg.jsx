import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./RockCreateEditDlg.module.css";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import LightboxRock from "../../../../components/lightbox-rock/LightboxRock";

const RockCreateEditDlg = ({ isOpen, onClose, onSave, artists, selectedRock, rocks }) => {
  const [rockNumber, setRockNumber] = useState("");
  const [selectedArtistKeys, setSelectedArtistKeys] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (selectedRock) {
      setRockNumber(selectedRock.rock_number || "");
      setSelectedArtistKeys(selectedRock.artists.map((a) => a.ra_key) || []);
      setComment(selectedRock.comment || "");
      setImageFile(null);
    } else {
      setRockNumber("");
      setSelectedArtistKeys([]);
      setComment("");
      setImageFile(null);
    }
    setError("");
  }, [selectedRock, isOpen]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!rockNumber || selectedArtistKeys.length === 0 || (!selectedRock && !imageFile)) {
      setError("All fields are required except comment.");
      return;
    }

    if (!selectedRock) {
      const duplicate = rocks.some((r) => String(r.rock_number) === String(rockNumber));
      if (duplicate) {
        setError(`Rock number ${rockNumber} already exists.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("rock_number", rockNumber);
      formData.append("artist_keys", JSON.stringify(selectedArtistKeys));
      formData.append("comment", comment);
      if (imageFile) formData.append("image", imageFile);

      if (selectedRock) {
        await axios.put(`/api/rocks/${selectedRock.rc_key}`, formData);
      } else {
        await axios.post("/api/rocks", formData);
      }

      onSave(rockNumber);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error saving rock. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openImageDialog = () => {
    if (!selectedRock) return;
    setImageSrc({
      rock_number: selectedRock.rock_number,
      artists: selectedRock.artists || [],
    });
    setImageDialogOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={selectedRock ? "Edit Rock" : "Create Rock"}
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

          <label>Rock Number*</label>
          <div className={styles.rockNumberRow}>
            <input
              type="number"
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
              required
              disabled={!!selectedRock}
            />
            {selectedRock && (
              <img
                src={`/media/catalog/${selectedRock.rock_number}/a_sm.webp`}
                alt="current rock"
                className={styles.existingImage}
                onClick={openImageDialog}
              />
            )}
          </div>

          <label>Artists*</label>
          <select
            multiple
            value={selectedArtistKeys}
            onChange={(e) =>
              setSelectedArtistKeys(
                Array.from(e.target.selectedOptions, (o) => parseInt(o.value))
              )
            }
            required
          >
            {artists.map((artist) => (
              <option key={artist.ra_key} value={artist.ra_key}>
                {artist.display_name}
              </option>
            ))}
          </select>

          <label>{selectedRock ? "Replace Image" : "Image*"}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            required={!selectedRock}
          />

          {imageFile && (
            <div className={styles.previewContainer}>
              <img
                src={URL.createObjectURL(imageFile)}
                alt="preview"
                className={styles.previewImage}
              />
            </div>
          )}

          <label>Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Add optional comment here..."
          ></textarea>
        </form>
      </Dialog>

      <LightboxRock open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} imageSrc={imageSrc} />
    </>
  );
};

export default RockCreateEditDlg;
