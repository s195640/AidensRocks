// UploadRockForm.jsx
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useARContext } from "../../context/ARContext";
import "./UploadRockForm.css";

const UploadRockForm = ({ onClose }) => {
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

  const fileInputRef = useRef(null);
  const firstInputRef = useRef(null);

  const isSubmitEnabled =
    (comment.trim() !== "" || images.length > 0) && !loading;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const filePreviews = files.map((file) => ({
      id: uuidv4(),
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
    formData.append("rockNumberQr", rockNumberQr);
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
      onClose();
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

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const focusable = document.querySelectorAll(
      ".rock-form button, .rock-form input, .rock-form textarea"
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trap = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
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
          onClick={onClose}
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

        {/* Rock Number */}
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

        {/* Location */}
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

        {/* Date */}
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Comment */}
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

        {/* Images */}
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
                <img src={img.preview} alt="Preview" />
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
        </div>

        {/* Submit */}
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
  );
};

export default UploadRockForm;
