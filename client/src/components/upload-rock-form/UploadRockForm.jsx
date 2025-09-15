import axios from "axios";
import { useState, useRef } from "react";
import { useARContext } from "../../context/ARContext";
import "./UploadRockForm.css";
import { FaFacebookSquare } from "react-icons/fa";

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


  const fileInputRef = useRef(null);

  const isSubmitEnabled =
    rockNumber.trim() &&
    location.trim() &&
    comment.trim() &&
    images.length > 0 &&
    !loading;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    // Allow image/* AND .heic/.heif even if type is blank or weird
    const invalidFiles = files.filter(file => {
      const isImageMime = file.type.startsWith("image/");
      const isHeicExt = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
      return !(isImageMime || isHeicExt);
    });

    if (invalidFiles.length > 0) {
      setImageError("Only image files are allowed (.jpg, .png, .heic, etc).");
      e.target.value = null;
      return;
    }

    if (images.length + files.length > 5) {
      setImageError("You can only upload up to 5 images.");
      e.target.value = null;
      return;
    } else {
      setImageError("");
    }

    const allowedFiles = files.slice(0, 5 - images.length);

    const fileURLs = allowedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...fileURLs]);

    e.target.value = null;
  };






  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (newImages.length <= 5) {
        setImageError("");
      }
      return newImages;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("rockNumber", rockNumber);
    formData.append("rockNumberQr", rockNumberQr);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("location", location);
    formData.append("date", date);
    formData.append("comment", comment);
    images.forEach((imgObj) => {
      formData.append("images", imgObj.file);
    });

    if (trackerData) {
      formData.append("trackerData", JSON.stringify(trackerData));
    }

    try {
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
        <div className="rock-form">
          <button
            type="button"
            onClick={onClose}
            className="close-btn"
            aria-label="Close form"
            disabled={loading}
          >
            ×
          </button>

          <h2 id="upload-rock-title">Upload Your Rock</h2>
          <p className="upload-note">
            <strong>
              Thank you for helping us remember our baby! Provide the rock number, location, comment, and at least 1 image.  After you submit check the Track the Rocks page for the post.
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
              Images: <span className="required">*</span>
            </label>
            <div className="images-input-row">
              {/* Hidden native file input */}
              <input
                id="images"
                type="file"
                multiple
                accept="image/*"
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
                  Select Images
                </button>
                <span>{images.length} of 5</span>
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
                    <img src={img.url} alt={`Preview ${index}`} />
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
                    Uploading
                    <span className="spinner" />
                  </>
                ) : (
                  "Submit"
                )}
              </button>
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
