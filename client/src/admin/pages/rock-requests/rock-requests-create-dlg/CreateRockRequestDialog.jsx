import { useState } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import authFetch from "../../../utils/authFetch";
import styles from "./CreateRockRequestDialog.module.css";

const CreateRockRequestDialog = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [rocksRequested, setRocksRequested] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    name.trim() && email.trim() && address.trim() && Number(rocksRequested) >= 1;

  const handleCreate = async () => {
    if (!isValid) return;
    setSaving(true);
    setError("");
    try {
      const res = await authFetch("/api/rock-requests/admin-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          address,
          rocksRequested: Number(rocksRequested),
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create request");

      onCreated();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Rock Request"
      buttonPanel={
        <>
          <button onClick={handleCreate} disabled={saving || !isValid}>
            {saving ? "Creating..." : "Create"}
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </>
      }
    >
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="create-request-name">Name</label>
        <input
          id="create-request-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="create-request-email">Email</label>
        <input
          id="create-request-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="create-request-address">Address</label>
        <textarea
          id="create-request-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="Street, City, State/Province, Postal Code, Country"
          required
        />

        <label htmlFor="create-request-rocks"># Rocks Requested</label>
        <input
          id="create-request-rocks"
          type="number"
          min="1"
          step="1"
          value={rocksRequested}
          onChange={(e) => setRocksRequested(e.target.value)}
          required
        />

        <label htmlFor="create-request-message">
          Message <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="create-request-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
        />
      </form>
    </Dialog>
  );
};

export default CreateRockRequestDialog;
