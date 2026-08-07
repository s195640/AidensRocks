import { useState } from "react";
import axios from "axios";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./SendEmailDialog.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends the current draft content of an email-template page_content row
// (see emailSlugs.js) to a single recipient, via POST /:slug/send — the
// server re-reads draft_body/draft_email_subject itself, so this dialog only
// needs to collect the recipient address plus whatever {PLACEHOLDER} values
// the template needs filled in. {ROCK_NUMBER} is the only one used today;
// add more fields here (and to `values` below) as more get introduced.
const SendEmailDialog = ({ page, onClose }) => {
  const [to, setTo] = useState("");
  const [rockNumber, setRockNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(null);

  const trimmedTo = to.trim();
  const rockNum = parseInt(rockNumber, 10);
  const isValid = EMAIL_RE.test(trimmedTo) && rockNum > 0;

  const handleSend = async () => {
    if (!isValid) return;
    setSending(true);
    setError("");
    try {
      await axios.post(`/api/admin/pages/${page.slug}/send`, {
        to: trimmedTo,
        values: { ROCK_NUMBER: rockNum },
      });
      setSentTo(trimmedTo);
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

          <label htmlFor="send-email-rock-number" className={styles.label}>
            Rock number (fills in {"{ROCK_NUMBER}"})
          </label>
          <input
            id="send-email-rock-number"
            className={styles.input}
            type="number"
            min="1"
            value={rockNumber}
            onChange={(e) => setRockNumber(e.target.value)}
            placeholder="123"
            disabled={sending}
          />
        </>
      )}
    </Dialog>
  );
};

export default SendEmailDialog;
