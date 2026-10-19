import { useEffect, useRef, useState } from "react";
import axios from "axios";
import jsQR from "jsqr";
import styles from "./RockCreateEditDlg.module.css";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import LightboxRock from "../../../../components/lightbox-rock/LightboxRock";
import RockRequestInfoDialog from "../rock-request-info-dlg/RockRequestInfoDialog";
import ToggleSwitch from "../../../../components/simple-components/toggle-switch/ToggleSwitch";

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

// Rotates the image file itself (not just its on-screen preview) so the
// rotated pixels are what actually gets uploaded.
const rotateImageFile = (file, degrees) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const swapDimensions = degrees % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = swapDimensions ? img.height : img.width;
      canvas.height = swapDimensions ? img.width : img.height;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to rotate image."));
            return;
          }
          resolve(new File([blob], file.name, { type: file.type || blob.type }));
        },
        file.type || "image/jpeg"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for rotation."));
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

const RockCreateEditDlg = ({ isOpen, onClose, onSave, artists, selectedRock, rocks, requests }) => {
  // Edit-mode fields (single existing rock).
  const [rockNumber, setRockNumber] = useState("");
  const [selectedArtistKeys, setSelectedArtistKeys] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [showRequestInfo, setShowRequestInfo] = useState(false);

  const linkedRequest =
    selectedRock?.rq_key != null
      ? (requests || []).find((r) => String(r.rq_key) === String(selectedRock.rq_key))
      : null;

  // Create-mode fields (batch of new rocks from multiple selected images).
  const fileInputRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [batchError, setBatchError] = useState("");
  // "Common Artist" on: one artist list at the top applies to every rock. An
  // entry's artistKeys is null while it follows that list, or its own keys
  // when set from the rock's detail dialog (or once Common Artist is off).
  const [useCommonArtist, setUseCommonArtist] = useState(true);
  const [commonArtistKeys, setCommonArtistKeys] = useState([]);
  // Per-rock detail dialog (artist + comment for that one rock).
  const [detailEntryId, setDetailEntryId] = useState(null);
  const [detailArtistKeys, setDetailArtistKeys] = useState([]);
  const [detailComment, setDetailComment] = useState("");
  // Read by the batch dialog's Escape handler: Dialog captures onClose once
  // when it opens, and Escape reaches both stacked dialogs, so without this
  // closing the detail dialog would also discard the whole batch.
  const detailOpenRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedRock) return;
    setRockNumber(selectedRock.rock_number || "");
    // A rock with no artist comes back as [{ ra_key: null }] (LEFT JOIN) --
    // keeping that null made every save fail.
    setSelectedArtistKeys((selectedRock.artists || []).map((a) => a.ra_key).filter((k) => k != null));
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
      detailOpenRef.current = false;
      setDetailEntryId(null);
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

  // Editing never changes a rock's number (PUT /api/rocks ignores it), so a
  // photo whose QR code is for a different rock is refused rather than
  // shown under the wrong number -- it used to change the number on screen
  // and then save the photo onto the rock being edited anyway.
  const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    setError("");
    setImageFile(file);
    if (file) {
      const qrText = await decodeQrFromFile(file);
      const rockNumberFromQr = qrText ? rockNumberFromQrText(qrText) : null;
      if (rockNumberFromQr && Number(rockNumberFromQr) !== Number(selectedRock.rock_number)) {
        setImageFile(null);
        e.target.value = null;
        setError(
          `This photo's QR code is for rock ${rockNumberFromQr}, but you're editing rock ${selectedRock.rock_number}. ` +
            `Choose rock ${selectedRock.rock_number}'s photo, or add rock ${rockNumberFromQr} as a new rock.`
        );
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
      artistKeys: null,
      comment: "",
      error: "",
      scanning: true,
    }));
    setEntries(newEntries);
    setUseCommonArtist(true);
    setCommonArtistKeys(defaultArtistKeys(artists));

    // The dialog shows a spinner (and Save is disabled) until every image's
    // QR scan has finished, so a typed-in rock number can't be overwritten
    // by a late scan result.
    newEntries.forEach(async (entry) => {
      const qrText = await decodeQrFromFile(entry.file);
      const rockNumberFromQr = qrText ? rockNumberFromQrText(qrText) : null;
      setEntries((prev) =>
        prev.map((e2) =>
          e2.id === entry.id
            ? {
                ...e2,
                scanning: false,
                qrNotFound: !rockNumberFromQr,
                ...(rockNumberFromQr ? { rockNumber: rockNumberFromQr } : {}),
              }
            : e2
        )
      );
    });
  };

  const effectiveArtistKeys = (entry) =>
    useCommonArtist ? entry.artistKeys ?? commonArtistKeys : entry.artistKeys ?? [];

  // Off: each rock gets its own list, starting from the common one. On: every
  // rock goes back to following the common list.
  const toggleCommonArtist = () => {
    setEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        artistKeys: useCommonArtist ? entry.artistKeys ?? [...commonArtistKeys] : null,
      }))
    );
    setUseCommonArtist((prev) => !prev);
  };

  const openDetail = (entry) => {
    detailOpenRef.current = true;
    setDetailEntryId(entry.id);
    setDetailArtistKeys(effectiveArtistKeys(entry));
    setDetailComment(entry.comment);
  };

  const closeDetail = () => {
    detailOpenRef.current = false;
    setDetailEntryId(null);
  };

  const saveDetail = () => {
    // With Common Artist on, picking the same artists as the common list
    // keeps the rock following it rather than pinning a copy.
    const sameAsCommon =
      useCommonArtist &&
      detailArtistKeys.length === commonArtistKeys.length &&
      detailArtistKeys.every((k) => commonArtistKeys.includes(k));
    updateEntry(detailEntryId, {
      artistKeys: sameAsCommon ? null : detailArtistKeys,
      comment: detailComment,
    });
    closeDetail();
  };

  const closeBatch = () => {
    if (detailOpenRef.current) return;
    onClose();
  };

  const artistNames = (keys) =>
    keys
      .map((k) => artists.find((a) => a.ra_key === k)?.display_name)
      .filter(Boolean)
      .join(", ");

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

  const rotateEntry = async (id) => {
    const entry = entries.find((e2) => e2.id === id);
    if (!entry) return;
    try {
      const rotatedFile = await rotateImageFile(entry.file, 90);
      const newPreviewUrl = URL.createObjectURL(rotatedFile);
      URL.revokeObjectURL(entry.previewUrl);
      updateEntry(id, { file: rotatedFile, previewUrl: newPreviewUrl });
    } catch (err) {
      console.error(err);
      updateEntry(id, { error: "Error rotating image. Please try again." });
    }
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
      if (!entry.rockNumber || effectiveArtistKeys(entry).length === 0) {
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
        formData.append("artist_keys", JSON.stringify(effectiveArtistKeys(entry)));
        formData.append("comment", entry.comment);
        formData.append("image", entry.file);
        await axios.post("/api/rocks", formData);
        savedNumbers.push(entry.rockNumber);
        URL.revokeObjectURL(entry.previewUrl);
      } catch (err) {
        console.error(err);
        remaining.push({
          ...entry,
          error:
            err.response?.status === 409
              ? err.response.data.error
              : "Error saving this rock. Please try again.",
        });
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
  const scanningCount = entries.filter((entry) => entry.scanning).length;
  const detailEntry = entries.find((entry) => entry.id === detailEntryId);

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

            {linkedRequest && (
              <>
                <label>Linked Rock Request</label>
                <button
                  type="button"
                  className={styles.linkedRequestButton}
                  onClick={() => setShowRequestInfo(true)}
                >
                  View Request from {linkedRequest.name}
                </button>
              </>
            )}
          </form>
        </Dialog>
      )}

      {showBatchDialog && (
        <Dialog
          isOpen={isOpen}
          onClose={closeBatch}
          title={`Create Rocks (${entries.length})`}
          buttonPanel={
            <>
              <button onClick={handleSaveAll} disabled={isSaving || scanningCount > 0}>
                {isSaving ? "Saving..." : `Save All (${entries.length})`}
              </button>
              <button onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
            </>
          }
        >
          {scanningCount > 0 ? (
            <div className={styles.scanningPanel}>
              <div className={styles.spinner}></div>
              <p>
                Reading QR codes... ({entries.length - scanningCount} of {entries.length})
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveAll} className={styles.dialogForm}>
              {batchError && <div className={styles.errorMessage}>{batchError}</div>}

              <div className={styles.commonArtistRow}>
                <ToggleSwitch checked={useCommonArtist} onChange={toggleCommonArtist} disabled={isSaving} />
                <span>Common Artist</span>
              </div>

              {useCommonArtist && (
                <>
                  <label>Artists* (all rocks)</label>
                  <select
                    multiple
                    value={commonArtistKeys}
                    onChange={(e) =>
                      setCommonArtistKeys(Array.from(e.target.selectedOptions, (o) => parseInt(o.value)))
                    }
                  >
                    {artists.map((artist) => (
                      <option key={artist.ra_key} value={artist.ra_key}>
                        {artist.display_name}
                      </option>
                    ))}
                  </select>
                </>
              )}

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

                    <button
                      type="button"
                      className={styles.batchCardRotate}
                      onClick={() => rotateEntry(entry.id)}
                      disabled={isSaving}
                      aria-label="Rotate image 90 degrees"
                    >
                      ⟳
                    </button>

                    <img
                      src={entry.previewUrl}
                      alt="preview"
                      className={`${styles.batchCardImage} ${styles.batchCardImageClickable}`}
                      onClick={() => !isSaving && openDetail(entry)}
                      title="Edit this rock's artist and comment"
                    />

                    {entry.error && <div className={styles.errorMessage}>{entry.error}</div>}

                    <label
                      className={entry.qrNotFound ? styles.qrNotFound : ""}
                      title={entry.qrNotFound ? "No rock number found in this photo's QR code" : undefined}
                    >
                      Rock Number*
                    </label>
                    <input
                      type="number"
                      value={entry.rockNumber}
                      onChange={(e) => updateEntry(entry.id, { rockNumber: e.target.value })}
                      required
                    />

                    {useCommonArtist ? (
                      entry.artistKeys && (
                        <div className={`${styles.batchCardNote} ${styles.batchCardArtistRow}`}>
                          <span>Artist: {artistNames(entry.artistKeys) || "none"}</span>
                          <button
                            type="button"
                            className={styles.clearArtistButton}
                            onClick={() => updateEntry(entry.id, { artistKeys: null })}
                            disabled={isSaving}
                            title="Use the Common Artist selection for this rock"
                          >
                            Clear
                          </button>
                        </div>
                      )
                    ) : (
                      <>
                        <label>Artists*</label>
                        <select
                          multiple
                          value={entry.artistKeys ?? []}
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
                      </>
                    )}

                    {entry.comment && <div className={styles.batchCardNote}>Comment: {entry.comment}</div>}
                  </div>
                ))}
              </div>
            </form>
          )}
        </Dialog>
      )}

      {/* A sibling of the batch Dialog rather than nested in it, for the
          same reason as RockRequestInfoDialog below. */}
      {showBatchDialog && detailEntry && (
        <Dialog
          isOpen
          onClose={closeDetail}
          title={`Rock ${detailEntry.rockNumber || "(no number yet)"}`}
          buttonPanel={
            <>
              <button onClick={saveDetail}>OK</button>
              <button onClick={closeDetail}>Cancel</button>
            </>
          }
        >
          <div className={styles.dialogForm}>
            <div className={styles.previewContainer}>
              <img src={detailEntry.previewUrl} alt="preview" className={styles.detailImage} />
            </div>

            <label>Artists*</label>
            <select
              multiple
              value={detailArtistKeys}
              onChange={(e) => setDetailArtistKeys(Array.from(e.target.selectedOptions, (o) => parseInt(o.value)))}
            >
              {artists.map((artist) => (
                <option key={artist.ra_key} value={artist.ra_key}>
                  {artist.display_name}
                </option>
              ))}
            </select>

            <label>Comment</label>
            <textarea
              value={detailComment}
              onChange={(e) => setDetailComment(e.target.value)}
              rows={4}
              placeholder="Add optional comment here..."
            ></textarea>
          </div>
        </Dialog>
      )}

      <LightboxRock open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} imageSrc={imageSrc} />

      {/* Rendered as a sibling of the edit Dialog above, not nested inside
          its children -- Dialog.module.css's .dialog has a `transform`
          (its open/close animation), which becomes the containing block
          for position:fixed descendants, so a fixed overlay nested inside
          would render relative to that dialog's box instead of the
          viewport. See RockRequestsEditDialog.jsx for the same fix. */}
      <RockRequestInfoDialog
        isOpen={showRequestInfo}
        onClose={() => setShowRequestInfo(false)}
        request={linkedRequest}
      />
    </>
  );
};

export default RockCreateEditDlg;
