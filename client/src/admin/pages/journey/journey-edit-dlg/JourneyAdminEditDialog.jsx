import { useState, useEffect, useRef } from "react";
import heic2any from "heic2any";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./JourneyAdminEditDialog.module.css";

const MAX_NEW_IMAGES = 10;

const JourneyAdminEditDialog = ({
  post,
  isOpen,
  onClose,
  onSave,
  openImagesLightbox,
}) => {
  const [formData, setFormData] = useState({
    rock_number: post.rock_number || "",
    location: post.location || "",
    date: post.date ? post.date.slice(0, 16) : "",
    comment: post.comment || "",
    name: post.name || "",
    email: post.email || "",
    show: post.show || false,
    coordinates:
      post.latitude && post.longitude
        ? `${post.latitude}, ${post.longitude}`
        : "",
  });

  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [error, setError] = useState("");

  const [newImages, setNewImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [heicLoading, setHeicLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        const res = await fetch(`/api/journey-admin/${post.rps_key}/images`);
        if (!res.ok) throw new Error("Failed to load images");
        const data = await res.json();
        setImages(data);
      } catch (err) {
        console.error(err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [isOpen, post.rps_key]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleImageShow = async (rpi_key, currentShow) => {
    try {
      const res = await fetch(
        `/api/journey-admin/images/${rpi_key}/toggle-show`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show: !currentShow }),
        }
      );
      if (!res.ok) throw new Error("Toggle image show failed");
      setImages((imgs) =>
        imgs.map((img) =>
          img.rpi_key === rpi_key ? { ...img, show: !currentShow } : img
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteImage = async (rpi_key) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch(`/api/journey-admin/images/${rpi_key}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete image failed");
      setImages((imgs) => imgs.filter((img) => img.rpi_key !== rpi_key));
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);

    const invalidFiles = files.filter((file) => {
      const isImageMime = file.type.startsWith("image/");
      const isHeicExt =
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");
      return !(isImageMime || isHeicExt);
    });

    if (invalidFiles.length > 0) {
      setImageError("Only image files are allowed (.jpg, .png, .heic, etc).");
      e.target.value = null;
      return;
    }

    if (newImages.length + files.length > MAX_NEW_IMAGES) {
      setImageError(`You can only add up to ${MAX_NEW_IMAGES} images at a time.`);
      e.target.value = null;
      return;
    } else {
      setImageError("");
    }

    const allowedFiles = files.slice(0, MAX_NEW_IMAGES - newImages.length);

    setHeicLoading(true);

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
        processedFiles.push(file);
      }
    }

    const fileURLs = processedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setNewImages((prev) => [...prev, ...fileURLs]);

    setHeicLoading(false);
    e.target.value = null;
  };

  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleUploadImages = async () => {
    if (newImages.length === 0) return;
    setUploadingImages(true);
    setImageError("");

    try {
      const formData = new FormData();
      newImages.forEach((imgObj) => formData.append("images", imgObj.file));

      const res = await fetch(`/api/journey-admin/${post.rps_key}/images`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload images");
      const uploaded = await res.json();

      setImages((prev) => [...prev, ...uploaded]);
      setNewImages([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error(err);
      setImageError("Failed to upload images: " + err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let latitude = null;
      let longitude = null;

      if (formData.coordinates) {
        const parts = formData.coordinates.split(",").map((p) => p.trim());
        if (parts.length === 2) {
          latitude = parts[0];
          longitude = parts[1];
        }
      }

      const payload = { ...formData, latitude, longitude };

      const res = await fetch(`/api/journey-admin/${post.rps_key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save post");
      }
      onSave();
    } catch (err) {
      console.error(err);
      setError("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getThumbnailUrl = (img) =>
    `/media/rocks/${formData.rock_number}/${post.uuid}/sm/${img.current_name}.webp`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Journey Post"
      buttonPanel={
        <>
          <button onClick={handleSave} disabled={saving}>
            Save
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </>
      }
    >
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.dialogForm} onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="rock_number">Rock Number</label>
        <input
          type="number"
          id="rock_number"
          name="rock_number"
          value={formData.rock_number}
          onChange={handleChange}
          required
        />

        <label htmlFor="location">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
        />

        <label htmlFor="coordinates">Coordinates</label>
        <input
          type="text"
          id="coordinates"
          name="coordinates"
          value={formData.coordinates}
          onChange={handleChange}
        />

        <label htmlFor="date">Date</label>
        <input
          type="datetime-local"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
        />

        <label htmlFor="comment">Comment</label>
        <textarea
          id="comment"
          name="comment"
          value={formData.comment}
          onChange={handleChange}
        />

        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />

        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />

        <label htmlFor="show">Show</label>
        <input
          type="checkbox"
          id="show"
          name="show"
          checked={formData.show}
          onChange={handleChange}
        />
      </form>

      <h3>Images</h3>
      {loadingImages ? (
        <p>Loading images...</p>
      ) : images.length === 0 ? (
        <p>No images found.</p>
      ) : (
        <table className={styles.imagesTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Original Name</th>
              <th>Show</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.rpi_key}>
                <td>
                  <img
                    src={getThumbnailUrl(img)}
                    alt={img.original_name}
                    className={styles.imagePreview}
                    onClick={() => openImagesLightbox(post)}
                  />
                </td>
                <td>{img.original_name}</td>
                <td>{img.show ? "Yes" : "No"}</td>
                <td className={styles.actionsCol}>
                  <button
                    onClick={() => toggleImageShow(img.rpi_key, img.show)}
                    type="button"
                  >
                    {img.show ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteImage(img.rpi_key)}
                    type="button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Add New Images</h3>
      <div className={styles.newImagesSection}>
        {heicLoading && (
          <div className={styles.heicSpinnerOverlay}>
            <div className={styles.heicSpinner}></div>
            <p className={styles.heicSpinnerText}>Converting HEIC images...</p>
          </div>
        )}

        <input
          id="newImages"
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          className={styles.hiddenFileInput}
        />

        <div className={styles.imageSelectWrapper}>
          <button
            type="button"
            className={styles.selectImagesBtn}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploadingImages}
          >
            Select Images
          </button>
          <span>{newImages.length} of {MAX_NEW_IMAGES}</span>
          <button
            type="button"
            className={styles.uploadImagesBtn}
            onClick={handleUploadImages}
            disabled={newImages.length === 0 || uploadingImages}
          >
            {uploadingImages ? "Uploading..." : "Upload"}
          </button>
        </div>

        {imageError && <p className={styles.imageErrorMessage}>{imageError}</p>}

        {newImages.length > 0 && (
          <div className={styles.imagePreviewsFlex}>
            {newImages.map((img, index) => (
              <div className={styles.newImageContainer} key={index}>
                <img src={img.url} alt={`New upload ${index}`} />
                <button
                  type="button"
                  className={styles.removeNewImageBtn}
                  onClick={() => handleRemoveNewImage(index)}
                  disabled={uploadingImages}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default JourneyAdminEditDialog;
