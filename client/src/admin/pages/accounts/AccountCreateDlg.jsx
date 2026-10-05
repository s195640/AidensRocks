import axios from "axios";
import { useEffect, useState } from "react";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import { LEVELS, LEVEL_LABELS } from "../../utils/accessLevels";
import styles from "./AccountsAdmin.module.css";

// Unverified isn't offered: the password reset that activates the account
// verifies it and raises it to User anyway.
const CREATE_LEVELS = [LEVELS.USER, LEVELS.CREATOR, LEVELS.ADMIN];

// "Add Account" on Admin -> Accounts. The account is created LOCKED with no
// usable password (POST /api/admin/accounts); the person sets one through
// the password reset link, which also unlocks and verifies it. See
// data/ai-build-docs/admin-create-account/.
//
// `artists` / `takenArtists`: same as AccountEditDlg (linked-artist picker).
const AccountCreateDlg = ({ isOpen, onClose, onCreated, artists = [], takenArtists = new Map() }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState(LEVELS.USER);
  const [raKey, setRaKey] = useState("");
  const [notify, setNotify] = useState(true);
  const [sendSetupEmail, setSendSetupEmail] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setAccessLevel(LEVELS.USER);
    setRaKey("");
    setNotify(true);
    setSendSetupEmail(true);
    setError("");
  }, [isOpen]);

  const canLinkArtist = accessLevel === LEVELS.CREATOR || accessLevel === LEVELS.ADMIN;

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await axios.post("/api/admin/accounts", {
        first_name: firstName,
        last_name: lastName,
        email,
        access_level: accessLevel,
        ra_key: canLinkArtist && raKey ? Number(raKey) : null,
        notify_rock_moves: notify,
        send_setup_email: sendSetupEmail,
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create the account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Account"
      buttonPanel={
        <>
          <button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </>
      }
    >
      <form className={styles.dialogForm} onSubmit={handleCreate}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <p className={styles.dialogNote}>
          The account starts locked with no password. They choose a password with the emailed
          link (or &ldquo;Forgot your password?&rdquo; on the Sign In page), which also unlocks it.
        </p>

        <label htmlFor="create-first-name">First Name</label>
        <input id="create-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />

        <label htmlFor="create-last-name">Last Name</label>
        <input id="create-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />

        <label htmlFor="create-email">Email</label>
        <input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="create-level">Access Level</label>
        <select id="create-level" value={accessLevel} onChange={(e) => setAccessLevel(Number(e.target.value))}>
          {CREATE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {LEVEL_LABELS[lvl]} ({lvl})
            </option>
          ))}
        </select>

        {canLinkArtist && (
          <>
            <label htmlFor="create-artist">Linked Artist</label>
            <select id="create-artist" value={raKey} onChange={(e) => setRaKey(e.target.value)}>
              <option value="">— None —</option>
              {artists.map((a) => {
                const takenBy = takenArtists.get(a.ra_key);
                return (
                  <option key={a.ra_key} value={a.ra_key} disabled={!!takenBy}>
                    {a.display_name}
                    {a.relation ? ` (${a.relation})` : ""}
                    {takenBy ? ` — linked to ${takenBy}` : ""}
                  </option>
                );
              })}
            </select>
          </>
        )}

        <div className={styles.toggleRow}>
          <span>Email when followed rocks move</span>
          <ToggleSwitch checked={notify} onChange={() => setNotify((v) => !v)} />
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={sendSetupEmail}
            onChange={(e) => setSendSetupEmail(e.target.checked)}
          />
          Email them a link to set their password
        </label>
      </form>
    </Dialog>
  );
};

export default AccountCreateDlg;
