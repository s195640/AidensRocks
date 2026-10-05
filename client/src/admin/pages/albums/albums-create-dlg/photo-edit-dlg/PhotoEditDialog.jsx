// PhotoEditDialog.jsx
import { useEffect, useState } from "react";
import Dialog from "../../../../../components/simple-components/dialog/Dialog";
import styles from "../AlbumsCreateDlg.module.css";

// The API sends photos.date as an ISO timestamp ("2025-05-01T00:00:00.000Z");
// <input type="date"> only shows YYYY-MM-DD, so it rendered blank.
const withDateInputValue = (photo) =>
  photo && typeof photo.date === "string" ? { ...photo, date: photo.date.slice(0, 10) } : photo;

const PhotoEditDialog = ({ isOpen, photo, onClose, onUpdate }) => {
  const [form, setForm] = useState(() => withDateInputValue(photo));

  useEffect(() => {
    setForm(withDateInputValue(photo));
  }, [photo]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onUpdate(form);
  };

  const buttonPanel = (
    <>
      <button className={styles.dialogBtnPrimary} onClick={handleSubmit}>
        Save
      </button>
      <button className={styles.dialogBtnSecondary} onClick={onClose}>
        Cancel
      </button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Photo: ${photo?.name || ""}`}
      buttonPanel={buttonPanel}
      closeOnOutsideClick={false}
    >
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
    </Dialog>
  );
};

export default PhotoEditDialog;
