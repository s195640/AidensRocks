import { useState, useEffect } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./UserCreateEditDlg.module.css";

const UserCreateEditDlg = ({ user, onSave, onClose, isOpen, users }) => {
  const [displayName, setDisplayName] = useState("");
  const [relation, setRelation] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setRelation(user.relation || "");
      setDob(user.dob ? user.dob.split("T")[0] : "");
    } else {
      setDisplayName("");
      setRelation("");
      setDob("");
    }
    setError("");
  }, [user, isOpen]);

  const handleSaveClick = (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!displayName || !relation || !dob) {
      setError("All fields are required.");
      return;
    }

    if (!user) {
      const duplicate = users.some(
        (u) => u.display_name.toLowerCase() === displayName.toLowerCase()
      );
      if (duplicate) {
        setError(`User "${displayName}" already exists.`);
        return;
      }
    }

    onSave({ display_name: displayName, relation, dob });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit User" : "Create User"}
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

        <label>Date of Birth*</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />
      </form>
    </Dialog>
  );
};

export default UserCreateEditDlg;
