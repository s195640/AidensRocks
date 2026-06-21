import { useEffect, useState } from "react";
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
    console.log("[QR] scanning file for QR code:", file.name, file.size, "bytes");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      console.log("[QR] image loaded:", img.width, "x", img.height);
      let result = null;
      for (const maxDimension of SCAN_MAX_DIMENSIONS) {
        result = scanImageForQr(img, maxDimension);
        console.log(`[QR] attempt at max dimension ${maxDimension ?? "original"}:`, result ? "found" : "not found");
        if (result) break;
      }
      URL.revokeObjectURL(url);
      if (result) {
        console.log("[QR] QR code found:", result.data);
      } else {
        console.log("[QR] no QR code found in image after all attempts");
      }
      resolve(result ? result.data : null);
    };
    img.onerror = () => {
      console.log("[QR] failed to load image for QR scanning");
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

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
      const defaultArtist = artists.find((a) => a.display_name === "Ashley Armitage");
      setRockNumber("");
      setSelectedArtistKeys(defaultArtist ? [defaultArtist.ra_key] : []);
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const qrText = await decodeQrFromFile(file);
      if (qrText) {
        try {
          const rockNumberFromQr = new URL(qrText).searchParams.get("r");
          console.log("[QR] parsed rock number from QR:", rockNumberFromQr);
          if (rockNumberFromQr) setRockNumber(rockNumberFromQr);
        } catch (err) {
          console.log("[QR] QR content was not a parseable URL:", qrText, err);
        }
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
            onChange={handleImageChange}
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
