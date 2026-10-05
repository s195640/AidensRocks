import { useState, useEffect } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./UserCreateEditDlg.module.css";

const UserCreateEditDlg = ({ user, onSave, onClose, isOpen, users }) => {
  const [displayName, setDisplayName] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setRelation(user.relation || "");
    } else {
      setDisplayName("");
      setRelation("");
    }
    setError("");
  }, [user, isOpen]);

  const handleSaveClick = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!displayName || !relation) {
      setError("All fields are required.");
      return;
    }

    if (!user) {
      const duplicate = users.some(
        (u) => u.display_name.toLowerCase() === displayName.toLowerCase()
      );
      if (duplicate) {
        setError(`Artist "${displayName}" already exists.`);
        return;
      }
    }

    try {
      // Users.jsx closes the dialog itself once the save succeeds.
      await onSave({ display_name: displayName, relation });
    } catch (err) {
      setError(err.response?.data?.error || "Saving the artist failed. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit Artist" : "Create Artist"}
      buttonPanel={
        <>
          <button onClick={handleSaveClick}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </>
      }
    >
      <form className={styles.dialogForm} onSubmit={handleSaveClick}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        {user && <p>RA_KEY: {user.ra_key}</p>}

        <label>Display Name*</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        <label>Relation*</label>
        <input
          type="text"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          required
        />
      </form>
    </Dialog>
  );
};

export default UserCreateEditDlg;
