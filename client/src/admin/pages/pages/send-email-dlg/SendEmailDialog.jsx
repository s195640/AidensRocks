import { useState } from "react";
import axios from "axios";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./SendEmailDialog.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends the current draft content of an email-template page_content row
// (see emailSlugs.js) to a single recipient, via POST /:slug/send — the
// server re-reads draft_body/draft_email_subject itself, so this dialog only
// needs to collect the recipient address.
const SendEmailDialog = ({ page, onClose }) => {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(null);

  const trimmed = to.trim();
  const isValid = EMAIL_RE.test(trimmed);

  const handleSend = async () => {
    if (!isValid) return;
    setSending(true);
    setError("");
    try {
      await axios.post(`/api/admin/pages/${page.slug}/send`, { to: trimmed });
      setSentTo(trimmed);
    } catch (err) {
      console.error("Failed to send email:", err);
      setError(err.response?.data?.error || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const buttonPanel = sentTo ? (
    <button className={styles.cancelBtn} onClick={onClose}>
      Close
    </button>
  ) : (
    <>
      <button className={styles.sendBtn} onClick={handleSend} disabled={!isValid || sending}>
        {sending ? "Sending..." : "Send"}
      </button>
      <button className={styles.cancelBtn} onClick={onClose} disabled={sending}>
        Cancel
      </button>
    </>
  );

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={`Send: ${page.nav_label}`}
      buttonPanel={buttonPanel}
      closeOnOutsideClick={!sending}
    >
      {sentTo ? (
        <div className={styles.successMessage}>Email sent to {sentTo}.</div>
      ) : (
        <>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <label htmlFor="send-email-to" className={styles.label}>
            Recipient email address
          </label>
          <input
            id="send-email-to"
            className={styles.input}
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
            disabled={sending}
            autoFocus
          />
        </>
      )}
    </Dialog>
  );
};

export default SendEmailDialog;
