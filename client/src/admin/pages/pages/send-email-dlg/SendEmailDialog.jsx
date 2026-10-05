import { useState } from "react";
import axios from "axios";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import EMAIL_TEMPLATES from "../../../../adminContent/emailTemplates";
import styles from "./SendEmailDialog.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Test-sends the current draft content of an email-template page_content
// row (see emailSlugs.js) to a single recipient, via POST /:slug/send — the
// server re-reads the draft itself and derives any HTML placeholders, so
// this dialog only collects the recipient plus the template's raw `fields`
// (adminContent/emailTemplates.js). Blank optional fields stay as their
// literal {PLACEHOLDER} text.
const SendEmailDialog = ({ page, onClose }) => {
  const fields = EMAIL_TEMPLATES[page.slug]?.fields || [];
  const [to, setTo] = useState("");
  const [inputs, setInputs] = useState({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(null);

  const trimmedTo = to.trim();
  const isValid =
    EMAIL_RE.test(trimmedTo) &&
    fields.every((f) => !f.required || (inputs[f.key] || "").trim());

  const setInput = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const handleSend = async () => {
    if (!isValid) return;
    setSending(true);
    setError("");
    const values = {};
    for (const f of fields) {
      const v = (inputs[f.key] || "").trim();
      if (v) values[f.key] = v;
    }
    try {
      await axios.post(`/api/admin/pages/${page.slug}/send`, { to: trimmedTo, values });
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

          {fields.map((f) => (
            <div key={f.key} style={{ marginTop: "1rem" }}>
              <label htmlFor={`send-email-${f.key}`} className={styles.label}>
                {f.label} (fills in {`{${f.key}}`}){f.required ? "" : " — optional"}
              </label>
              <input
                id={`send-email-${f.key}`}
                className={styles.input}
                type={f.type || "text"}
                min={f.type === "number" ? "1" : undefined}
                value={inputs[f.key] || ""}
                onChange={(e) => setInput(f.key, e.target.value)}
                placeholder={f.placeholder}
                disabled={sending}
              />
            </div>
          ))}
        </>
      )}
    </Dialog>
  );
};

export default SendEmailDialog;
