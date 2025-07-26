import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useARContext } from "../../context/ARContext";
import "./UploadRockForm.css";

const generateUUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const UploadRockForm = () => {
  const { trackerData, rValue } = useARContext();

  const [showForm, setShowForm] = useState(false);
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
  const fileInputRef = useRef(null);
  const firstInputRef = useRef(null);

  const isSubmitEnabled =
    (comment.trim() !== "" || images.length > 0) && !loading;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const filePreviews = files.map((file) => ({
      id: generateUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...filePreviews]);
  };

  const removeImage = (idToRemove) => {
    const removed = images.find((img) => img.id === idToRemove);
    if (removed) URL.revokeObjectURL(removed.preview);

    const updated = images.filter((img) => img.id !== idToRemove);
    setImages(updated);

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("rockNumber", rockNumber);
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

      alert("Rock submitted!");
      setShowForm(false);
      setRockNumber("");
      setLocation("");
      setDate(new Date().toISOString().split("T")[0]);
      setComment("");
      setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload rock.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowForm(false);
  };

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (showForm && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;

    const focusable = document.querySelectorAll(
      ".rock-form button, .rock-form input, .rock-form textarea"
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trap = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [showForm]);

  return (
    <div className="upload-rock">
      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="upload-btn"
      >
        Upload Your Rock
      </button>

      {showForm && (
        <>
          <div className="modal-backdrop" onClick={handleClose} />
          <form
            onSubmit={handleSubmit}
            className="rock-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-rock-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="upload-rock-title" style={{ marginTop: 0 }}>
              Upload Your Rock
            </h2>
            <button
              type="button"
              onClick={handleClose}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                zIndex: 1100,
              }}
              aria-label="Close form"
              disabled={loading}
            >
              ×
            </button>

            <div>
              <label>
                Rock Number{" "}
                <span style={{ fontWeight: "normal", color: "#888" }}>
                  (optional)
                </span>
              </label>
              <input
                type="number"
                min="1"
                value={rockNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 1) {
                    setRockNumber(value);
                  } else if (e.target.value === "") {
                    setRockNumber("");
                  }
                }}
                ref={firstInputRef}
                disabled={loading}
              />
            </div>

            <div>
              <label>
                Location{" "}
                <span style={{ fontWeight: "normal", color: "#888" }}>
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label>
                Comment{" "}
                <span style={{ fontWeight: "normal", color: "#888" }}>
                  (optional)
                </span>
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label>
                Images{" "}
                <span style={{ fontWeight: "normal", color: "#888" }}>
                  (optional)
                </span>
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                disabled={loading}
              />

              <div className="image-preview">
                {images.map((img) => (
                  <div key={img.id} className="image-container">
                    <img src={img.preview} alt="Image preview" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {images.length > 0 && (
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#555",
                    fontSize: "0.9rem",
                  }}
                >
                  {images.length} image{images.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!isSubmitEnabled}
              style={{
                opacity: isSubmitEnabled ? 1 : 0.5,
                cursor: isSubmitEnabled ? "pointer" : "not-allowed",
              }}
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
          </form>
        </>
      )}
    </div>
  );
};

export default UploadRockForm;
