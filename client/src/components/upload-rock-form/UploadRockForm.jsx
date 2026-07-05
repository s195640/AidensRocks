import axios from "axios";
import { useState, useRef } from "react";
import { useARContext } from "../../context/ARContext";
import "./UploadRockForm.css";
import { FaFacebookSquare } from "react-icons/fa";
import heic2any from "heic2any";

// Cloudflare (prod host) hard-caps request bodies at 100MB, so anything
// bigger has to be staged client-side in chunks before the rock post itself
// is created.
const CHUNK_SIZE = 80 * 1024 * 1024;

export default function UploadRockForm({ onClose }) {
  const { trackerData, rValue } = useARContext();

  const [rockNumberQr] = useState(() =>
    rValue && /^\d+$/.test(rValue) ? String(rValue) : ""
  );
  const [rockNumber, setRockNumber] = useState(() =>
    rValue && /^\d+$/.test(rValue) ? String(rValue) : ""
  );
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageError, setImageError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [stageLabel, setStageLabel] = useState("");
  const [stagingProgress, setStagingProgress] = useState(0);
  const fileInputRef = useRef(null);
  const isSubmitEnabled =
    rockNumber.trim() &&
    location.trim() &&
    comment.trim() &&
    images.length > 0 &&
    !loading;
  const [heicLoading, setHeicLoading] = useState(false);



  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);

    // Filter invalid files (same as before)
    const invalidFiles = files.filter(file => {
      const isImageMime = file.type.startsWith("image/");
      const isVideoMime = file.type.startsWith("video/");
      const isHeicExt = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
      return !(isImageMime || isVideoMime || isHeicExt);
    });

    if (invalidFiles.length > 0) {
      setImageError("Only image and video files are allowed (.jpg, .png, .heic, .mp4, .mov, etc).");
      e.target.value = null;
      return;
    }

    if (images.length + files.length > 10) {
      setImageError("You can only upload up to 10 images.");
      e.target.value = null;
      return;
    } else {
      setImageError("");
    }

    const allowedFiles = files.slice(0, 10 - images.length);

    setHeicLoading(true); // <-- SHOW HEIC LOADING SPINNER

    const processedFiles = [];

    for (const file of allowedFiles) {
      const isHeic =
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      if (isHeic) {
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9,
          });

          const convertedFile = new File(
            [convertedBlob],
            file.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" }
          );

          processedFiles.push(convertedFile);
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          setImageError("Failed to convert HEIC image.");
        }
      } else {
        processedFiles.push(file); // normal image
      }
    }

    const fileURLs = processedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...fileURLs]);

    setHeicLoading(false); // <-- HIDE HEIC SPINNER
    e.target.value = null;
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (newImages.length <= 10) {
        setImageError("");
      }
      return newImages;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };


  const stageFileInChunks = async (file, onBytesUploaded) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const stagingId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let bytesDone = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const chunk = file.slice(start, start + CHUNK_SIZE);

      const chunkData = new FormData();
      chunkData.append("chunk", chunk);
      chunkData.append("stagingId", stagingId);
      chunkData.append("chunkIndex", chunkIndex);
      chunkData.append("totalChunks", totalChunks);
      chunkData.append("originalName", file.name);

      await axios.post("/api/upload-rock/stage-chunk", chunkData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => onBytesUploaded(bytesDone + evt.loaded),
      });
      bytesDone += chunk.size;
    }

    return stagingId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStagingProgress(0);

    try {
      // Large files (e.g. video) are staged via chunked upload first, since
      // Cloudflare hard-caps a single request body at 100MB. Everything else
      // still rides along in the final multipart request as before.
      const toStage = images
        .map((imgObj, index) => ({ index, file: imgObj.file }))
        .filter(({ file }) => file.size > CHUNK_SIZE);
      const totalStageBytes = toStage.reduce((sum, { file }) => sum + file.size, 0);
      let stagedBytesDone = 0;

      const manifestByIndex = new Array(images.length).fill(null);

      for (const { index, file } of toStage) {
        setStageLabel(`Uploading ${file.name}...`);
        const stagingId = await stageFileInChunks(file, (bytesUploaded) => {
          setStagingProgress(
            Math.round(((stagedBytesDone + bytesUploaded) / totalStageBytes) * 100)
          );
        });
        stagedBytesDone += file.size;
        manifestByIndex[index] = { type: "staged", stagingId, originalName: file.name };
      }

      setStageLabel("Submitting...");
      setStagingProgress(0);

      const formData = new FormData();
      formData.append("rockNumber", rockNumber);
      formData.append("rockNumberQr", rockNumberQr);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("location", location);
      formData.append("date", date);
      formData.append("comment", comment);

      const fileManifest = images.map((imgObj, index) => {
        if (manifestByIndex[index]) return manifestByIndex[index];
        formData.append("images", imgObj.file);
        return { type: "inline" };
      });
      formData.append("fileManifest", JSON.stringify(fileManifest));

      if (trackerData) {
        formData.append("trackerData", JSON.stringify(trackerData));
      }

      await axios.post("/api/upload-rock", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDialog({
        type: "success",
        message: (
          <>
            Thank you for helping us remember Aiden!<br /><br />
            <strong>What to do next!</strong>
            <ol style={{ textAlign: "left", margin: "0.5rem 0 0 1.25rem" }}>
              <li>Take the rock with you to another new location and post again.</li>
              <li>Leave the rock behind where it can be found for the next person.</li>
              <li>
                Follow our Facebook:{" "}
                <a
                  href="https://www.facebook.com/groups/1733974850593785/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <FaFacebookSquare size={20} className="social-icon" />
                  Aidens Rocks
                </a>
              </li>
              <li>
                Finally, Email us and request a new rock for your next adventure.{" "}
                <a href="mailto:AidensRocks.AAA@gmail.com">AidensRocks.AAA@gmail.com</a>
              </li>
            </ol>
          </>
        ),
      });

      // Reset form fields after success
      setRockNumber("");
      setLocation("");
      setDate(new Date().toISOString().split("T")[0]);
      setComment("");
      setImages([]);
      setName("");
      setEmail("");
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error("Upload failed:", err);
      setDialog({
        type: "error",
        message:
          "Sorry, something went wrong. The submit did not work. Please email us instead if it keeps failing: AidensRocks.AAA@gmail.com",
      });
    } finally {
      setLoading(false);
      setStageLabel("");
      setStagingProgress(0);
    }
  };

  // Close dialog handler
  const closeDialog = () => {
    setDialog(null);
    if (dialog?.type === "success") {
      onClose(); // Close form on success dialog close
    }
  };
  return (
    <>
      <div className="rock-form-overlay">
        {heicLoading && (
          <div className="heic-spinner-overlay">
            <div className="heic-spinner"></div>
            <p className="heic-spinner-text">Converting HEIC images...</p>
          </div>
        )}

        <div className="rock-form">
          <div className="rock-form-header">
            <h2 id="upload-rock-title">Upload Your Rock</h2>
            <button
              type="button"
              onClick={onClose}
              className="close-btn"
              aria-label="Close form"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <p className="upload-note">
            <strong>
              Thank you for helping us remember our baby! Provide the rock number, location, comment, and at least 1 image or video.  After you submit check the Track the Rocks page for the post.  Large videos may take a little time to upload.
            </strong>
          </p>

          <form onSubmit={handleSubmit}>
            {/* Rock Number */}
            <label htmlFor="rockNumber">
              Rock Number: <span className="required">*</span>
            </label>
            <input
              type="number"
              min="0"
              id="rockNumber"
              placeholder="Enter 0, if the rocknumber is not visable."
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
              required
            />

            {/* Name */}
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              placeholder="(optional)"
              onChange={(e) => setName(e.target.value)}
            />

            {/* Email */}
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              placeholder="(optional) - If provided, we may contact you!"
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Location */}
            <label htmlFor="location">
              Location: <span className="required">*</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            {/* Date */}
            <label htmlFor="date">Date:</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Comment */}
            <label htmlFor="comment">
              Comment: <span className="required">*</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />

            {/* Images */}
            <label htmlFor="images">
              Photos/Videos: <span className="required">*</span>
            </label>
            <div className="images-input-row">
              {/* Hidden native file input */}
              <input
                id="images"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden-file-input"
              />

              {/* Button and count */}
              <div className="image-select-wrapper">
                <button
                  type="button"
                  className="select-images-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={loading}
                >
                  Select Files
                </button>
                <span>{images.length} of 10</span>
              </div>
            </div>


            {/* Image previews container including error message */}
            <div className="image-preview-container">
              {/* Error message centered */}
              {imageError && (
                <p className="image-error-message">{imageError}</p>
              )}

              {/* Preview images */}
              <div className="image-previews-flex">
                {images.map((img, index) => (
                  <div className="image-container" key={index}>
                    {img.file.type.startsWith("video/") ? (
                      <video src={img.url} muted />
                    ) : (
                      <img src={img.url} alt={`Preview ${index}`} />
                    )}
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => handleRemoveImage(index)}
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>


            {/* Submit */}
            <div className="full-width">
              <button
                type="submit"
                className="submit-btn"
                disabled={!isSubmitEnabled}
              >
                {loading ? (
                  <>
                    {stageLabel || "Uploading"}
                    {stagingProgress > 0 ? ` ${stagingProgress}%` : ""}
                    <span className="spinner" />
                  </>
                ) : (
                  "Submit"
                )}
              </button>
              {loading && stagingProgress > 0 && (
                <div className="staging-progress-track">
                  <div
                    className="staging-progress-fill"
                    style={{ width: `${stagingProgress}%` }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
      {/* Submit Success/Error Dialog */}
      {dialog && (
        <div className="dialog-overlay" role="alertdialog" aria-modal="true">
          <div className="dialog-box">
            <h3 className="dialog-title" style={{ textAlign: "center" }}>
              {dialog.type === "success" ? "Thank You!" : "Submit Failed"}
            </h3>
            <div className="dialog-message">{dialog.message}</div>
            <button
              type="button"
              onClick={closeDialog}
              className="dialog-close-btn"
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
