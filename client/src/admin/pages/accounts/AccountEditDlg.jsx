import axios from "axios";
import { useEffect, useState } from "react";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import { LEVELS, LEVEL_LABELS, LOCKED_LEVEL } from "../../utils/accessLevels";
import styles from "./AccountsAdmin.module.css";

// `artists`: every artist ({ ra_key, display_name }); `takenArtists`: Map of
// ra_key -> email for artists already linked to some *other* account.
const AccountEditDlg = ({
  account,
  isSelf,
  isOpen,
  onClose,
  onSaved,
  artists = [],
  takenArtists = new Map(),
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState(LEVELS.USER);
  const [isLocked, setIsLocked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [notify, setNotify] = useState(false);
  const [raKey, setRaKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    setFirstName(account.first_name || "");
    setLastName(account.last_name || "");
    setEmail(account.email);
    setAccessLevel(account.access_level);
    setIsLocked(account.is_locked);
    setVerified(!!account.email_verified_dt);
    setNotify(account.notify_rock_moves);
    setRaKey(account.ra_key ? String(account.ra_key) : "");
    setError("");
    setNotice("");
  }, [account]);

  // Creators and Admins can be linked to an artist (server: ARTIST_LINK_LEVELS).
  const canLinkArtist = accessLevel === LEVELS.CREATOR || accessLevel === LEVELS.ADMIN;

  if (!isOpen || !account) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await axios.put(`/api/admin/accounts/${account.id}`, {
        first_name: firstName,
        last_name: lastName,
        email,
        access_level: accessLevel,
        is_locked: isLocked,
        email_verified: verified,
        notify_rock_moves: notify,
        // Only Creators and Admins keep a linked artist (the server clears it otherwise).
        ra_key: canLinkArtist && raKey ? Number(raKey) : null,
      });
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    setError("");
    setNotice("");
    try {
      const { data } = await axios.post(`/api/admin/accounts/${account.id}/send-reset`);
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset email.");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Account"
      buttonPanel={
        <>
          <button onClick={handleSave} disabled={saving}>
            Save
          </button>
          <button onClick={onClose}>Cancel</button>
        </>
      }
    >
      <form className={styles.dialogForm} onSubmit={handleSave}>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {notice && <div className={styles.noticeMessage}>{notice}</div>}

        <label>First Name</label>
        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />

        <label>Last Name</label>
        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Access Level</label>
        <select
          value={accessLevel}
          onChange={(e) => setAccessLevel(Number(e.target.value))}
          disabled={isSelf}
          title={isSelf ? "You can't change your own access level" : undefined}
        >
          {Object.values(LEVELS).map((lvl) => (
            <option key={lvl} value={lvl}>
              {LEVEL_LABELS[lvl]} ({lvl})
            </option>
          ))}
        </select>

        {canLinkArtist && (
          <>
            <label>Linked Artist</label>
            <select value={raKey} onChange={(e) => setRaKey(e.target.value)}>
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
          <span>
            Locked ({LOCKED_LEVEL})
            {account.failed_login_count > 0 && (
              <small> — {account.failed_login_count} failed attempt(s)</small>
            )}
          </span>
          <ToggleSwitch
            checked={isLocked}
            onChange={() => setIsLocked((v) => !v)}
            disabled={isSelf}
            title={isSelf ? "You can't lock your own account" : undefined}
          />
        </div>

        <div className={styles.toggleRow}>
          <span>Email verified</span>
          <ToggleSwitch checked={verified} onChange={() => setVerified((v) => !v)} />
        </div>

        <div className={styles.toggleRow}>
          <span>Email when followed rocks move</span>
          <ToggleSwitch checked={notify} onChange={() => setNotify((v) => !v)} />
        </div>

        <label>Password</label>
        <button type="button" className={styles.secondaryButton} onClick={handleSendReset}>
          Send password reset email
        </button>
      </form>
    </Dialog>
  );
};

export default AccountEditDlg;
