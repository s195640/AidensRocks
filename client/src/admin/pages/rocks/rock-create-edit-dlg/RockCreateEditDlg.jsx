import { useEffect, useRef, useState } from "react";
import axios from "axios";
import jsQR from "jsqr";
import styles from "./RockCreateEditDlg.module.css";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import LightboxRock from "../../../../components/lightbox-rock/LightboxRock";

// jsQR's binarizer struggles to find small QR modules in full-resolution camera
// photos (lots of JPEG noise relative to module size), so scan progressively
// larger downscaled copies of the image until one resolves. Starting small
// (400px) skips the usually-futile full-resolution attempt.
const SCAN_MAX_DIMENSIONS = [400, 800, 1200, 1600, 2400, null];

const scanImageForQr = (img, maxDimension) => {
  let { width, height } = img;
  if (maxDimension && Math.max(width, height) > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return jsQR(imageData.data, imageData.width, imageData.height);
};

const decodeQrFromFile = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let result = null;
      for (const maxDimension of SCAN_MAX_DIMENSIONS) {
        result = scanImageForQr(img, maxDimension);
        if (result) break;
      }
      URL.revokeObjectURL(url);
      resolve(result ? result.data : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

const rockNumberFromQrText = (qrText) => {
  try {
    return new URL(qrText).searchParams.get("r");
  } catch {
    return null;
  }
};

const defaultArtistKeys = (artists) => {
  const defaultArtist = artists.find((a) => a.display_name === "Ashley Armitage");
  return defaultArtist ? [defaultArtist.ra_key] : [];
};

const RockCreateEditDlg = ({ isOpen, onClose, onSave, artists, selectedRock, rocks }) => {
  // Edit-mode fields (single existing rock).
  const [rockNumber, setRockNumber] = useState("");
  const [selectedArtistKeys, setSelectedArtistKeys] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  // Create-mode fields (batch of new rocks from multiple selected images).
  const fileInputRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [batchError, setBatchError] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedRock) return;
    setRockNumber(selectedRock.rock_number || "");
    setSelectedArtistKeys(selectedRock.artists.map((a) => a.ra_key) || []);
    setComment(selectedRock.comment || "");
    setImageFile(null);
    setError("");
  }, [selectedRock, isOpen]);

  useEffect(() => {
    if (isOpen && !selectedRock) {
      setBatchError("");
      fileInputRef.current?.click();
    }
  }, [isOpen, selectedRock]);

  useEffect(() => {
    if (!isOpen) {
      setEntries((prev) => {
        prev.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
        return [];
      });
      setBatchError("");
    }
  }, [isOpen]);

  useEffect(() => {
    // Dismissing the native file picker without choosing anything fires no
    // "change" event, so without this the dialog would be stuck open with
    // nothing to show and no way to re-trigger the picker on the next click.
    const input = fileInputRef.current;
    if (!input) return;
    const handleCancel = () => onClose();
    input.addEventListener("cancel", handleCancel);
    return () => input.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const handleEditSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!rockNumber || selectedArtistKeys.length === 0) {
      setError("All fields are required except comment.");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("rock_number", rockNumber);
      formData.append("artist_keys", JSON.stringify(selectedArtistKeys));
      formData.append("comment", comment);
      if (imageFile) formData.append("image", imageFile);

      await axios.put(`/api/rocks/${selectedRock.rc_key}`, formData);

      onSave(rockNumber);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error saving rock. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const qrText = await decodeQrFromFile(file);
      if (qrText) {
        const rockNumberFromQr = rockNumberFromQrText(qrText);
        if (rockNumberFromQr) setRockNumber(rockNumberFromQr);
      }
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

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    if (files.length === 0) {
      onClose();
      return;
    }

    const newEntries = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      rockNumber: "",
      artistKeys: defaultArtistKeys(artists),
      comment: "",
      error: "",
    }));
    setEntries(newEntries);

    newEntries.forEach(async (entry) => {
      const qrText = await decodeQrFromFile(entry.file);
      if (!qrText) return;
      const rockNumberFromQr = rockNumberFromQrText(qrText);
      if (!rockNumberFromQr) return;
      setEntries((prev) =>
        prev.map((e2) => (e2.id === entry.id ? { ...e2, rockNumber: rockNumberFromQr } : e2))
      );
    });
  };

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const removeEntry = (id) => {
    setEntries((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((entry) => entry.id !== id);
    });
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setBatchError("");

    if (entries.length === 0) {
      setBatchError("Select at least one image.");
      return;
    }

    const numbersSeen = new Set();
    const validated = entries.map((entry) => {
      let entryError = "";
      if (!entry.rockNumber || entry.artistKeys.length === 0) {
        entryError = "Rock number and artist are required.";
      } else if (rocks.some((r) => String(r.rock_number) === String(entry.rockNumber))) {
        entryError = `Rock number ${entry.rockNumber} already exists.`;
      } else if (numbersSeen.has(String(entry.rockNumber))) {
        entryError = `Rock number ${entry.rockNumber} is used more than once.`;
      } else {
        numbersSeen.add(String(entry.rockNumber));
      }
      return { ...entry, error: entryError };
    });

    if (validated.some((entry) => entry.error)) {
      setEntries(validated);
      return;
    }

    setIsSaving(true);
    const savedNumbers = [];
    const remaining = [];

    for (const entry of validated) {
      try {
        const formData = new FormData();
        formData.append("rock_number", entry.rockNumber);
        formData.append("artist_keys", JSON.stringify(entry.artistKeys));
        formData.append("comment", entry.comment);
        formData.append("image", entry.file);
        await axios.post("/api/rocks", formData);
        savedNumbers.push(entry.rockNumber);
        URL.revokeObjectURL(entry.previewUrl);
      } catch (err) {
        console.error(err);
        remaining.push({ ...entry, error: "Error saving this rock. Please try again." });
      }
    }

    setIsSaving(false);
    setEntries(remaining);

    if (savedNumbers.length > 0) {
      onSave(savedNumbers.join(", "));
    }

    if (remaining.length === 0) {
      onClose();
    } else {
      setBatchError(`${savedNumbers.length} rock(s) saved. ${remaining.length} failed — fix and save again.`);
    }
  };

  const showBatchDialog = isOpen && !selectedRock && entries.length > 0;
  const showEditDialog = isOpen && !!selectedRock;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFilesSelected}
      />

      {showEditDialog && (
        <Dialog
          isOpen={isOpen}
          onClose={onClose}
          title="Edit Rock"
          buttonPanel={
            <>
              <button onClick={handleEditSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className={styles.dialogForm}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <label>Rock Number*</label>
            <div className={styles.rockNumberRow}>
              <input type="number" value={rockNumber} onChange={(e) => setRockNumber(e.target.value)} required disabled />
              <img
                src={`/media/catalog/${selectedRock.rock_number}/a_sm.webp`}
                alt="current rock"
                className={styles.existingImage}
                onClick={openImageDialog}
              />
            </div>

            <label>Artists*</label>
            <select
              multiple
              value={selectedArtistKeys}
              onChange={(e) =>
                setSelectedArtistKeys(Array.from(e.target.selectedOptions, (o) => parseInt(o.value)))
              }
              required
            >
              {artists.map((artist) => (
                <option key={artist.ra_key} value={artist.ra_key}>
                  {artist.display_name}
                </option>
              ))}
            </select>

            <label>Replace Image</label>
            <input type="file" accept="image/*" onChange={handleEditImageChange} />

            {imageFile && (
              <div className={styles.previewContainer}>
                <img src={URL.createObjectURL(imageFile)} alt="preview" className={styles.previewImage} />
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
      )}

      {showBatchDialog && (
        <Dialog
          isOpen={isOpen}
          onClose={onClose}
          title={`Create Rocks (${entries.length})`}
          buttonPanel={
            <>
              <button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "Saving..." : `Save All (${entries.length})`}
              </button>
              <button onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveAll} className={styles.dialogForm}>
            {batchError && <div className={styles.errorMessage}>{batchError}</div>}

            <div className={styles.batchGrid}>
              {entries.map((entry) => (
                <div key={entry.id} className={styles.batchCard}>
                  <button
                    type="button"
                    className={styles.batchCardRemove}
                    onClick={() => removeEntry(entry.id)}
                    disabled={isSaving}
                    aria-label="Remove image"
                  >
                    ×
                  </button>

                  <img src={entry.previewUrl} alt="preview" className={styles.batchCardImage} />

                  {entry.error && <div className={styles.errorMessage}>{entry.error}</div>}

                  <label>Rock Number*</label>
                  <input
                    type="number"
                    value={entry.rockNumber}
                    onChange={(e) => updateEntry(entry.id, { rockNumber: e.target.value })}
                    required
                  />

                  <label>Artists*</label>
                  <select
                    multiple
                    value={entry.artistKeys}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        artistKeys: Array.from(e.target.selectedOptions, (o) => parseInt(o.value)),
                      })
                    }
                    required
                  >
                    {artists.map((artist) => (
                      <option key={artist.ra_key} value={artist.ra_key}>
                        {artist.display_name}
                      </option>
                    ))}
                  </select>

                  <label>Comment</label>
                  <textarea
                    value={entry.comment}
                    onChange={(e) => updateEntry(entry.id, { comment: e.target.value })}
                    rows={2}
                    placeholder="Add optional comment here..."
                  ></textarea>
                </div>
              ))}
            </div>
          </form>
        </Dialog>
      )}

      <LightboxRock open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} imageSrc={imageSrc} />
    </>
  );
};

export default RockCreateEditDlg;
