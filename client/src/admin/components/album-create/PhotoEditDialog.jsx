// PhotoEditDialog.jsx
import { useEffect, useState } from "react";
import styles from "./AlbumCreate.module.css"; // reuse same styles

const PhotoEditDialog = ({ photo, onClose, onUpdate, onRefresh }) => {
  const [form, setForm] = useState(photo);

  useEffect(() => {
    setForm(photo);
  }, [photo]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onUpdate(form);
  };

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>Edit Photo: {photo.name}</h3>
          <div className={styles.actions}>
            <button onClick={onRefresh}>Refresh</button>
            <button onClick={handleSubmit}>Update</button>
            <button onClick={onClose} className="cancel">
              Cancel
            </button>
          </div>
        </div>

        <div className={styles.formFields}>
          <label>
            Display Name:
            <input
              value={form.display_name || ""}
              onChange={(e) => handleChange("display_name", e.target.value)}
            />
          </label>

          <label>
            Date:
            <input
              type="date"
              value={form.date || ""}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </label>

          <label>
            Description:
            <textarea
              value={form.desc || ""}
              onChange={(e) => handleChange("desc", e.target.value)}
            />
          </label>

          <label className={styles.checkboxLabel}>
            Show:
            <input
              type="checkbox"
              checked={form.show}
              onChange={(e) => handleChange("show", e.target.checked)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditDialog;
