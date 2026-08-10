import { useState } from "react";
import axios from "axios";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import PageContentEditor from "../../../../adminContent/PageContentEditor";
import EMAIL_PLACEHOLDERS from "../../../../adminContent/emailPlaceholders";
import EMAIL_SLUGS from "../emailSlugs";
import styles from "./PagesEditDialog.module.css";

const PagesEditDialog = ({ page, onClose, onSaved }) => {
  const [draft, setDraft] = useState(page.draft_body);
  const [subject, setSubject] = useState(page.draft_email_subject || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEmail = EMAIL_SLUGS.has(page.slug);
  // Only the tokens this specific template actually supports (see
  // emailPlaceholders.js's `pages` filter) — "Response Email" and "Response
  // Email Multi" each get their own set.
  const placeholders = EMAIL_PLACEHOLDERS.filter(
    (entry) => entry.pages === null || entry.pages?.includes(page.slug)
  );

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await axios.put(`/api/admin/pages/${page.slug}/draft`, {
        body: draft,
        ...(isEmail ? { email_subject: subject } : {}),
      });
      onSaved();
    } catch (err) {
      console.error("Failed to save draft:", err);
      setError("Failed to save draft. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const buttonPanel = (
    <>
      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
        Cancel
      </button>
    </>
  );

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={`Edit: ${page.nav_label}`}
      buttonPanel={buttonPanel}
      closeOnOutsideClick={false}
    >
      {error && <div className={styles.errorMessage}>{error}</div>}
      {isEmail && (
        <div className={styles.subjectField}>
          <label htmlFor="email-subject">Subject</label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
          />
          <p className={styles.placeholderHint}>
            You can use{" "}
            {placeholders.map(({ key, token }, i) => (
              <span key={key}>
                <code>{token}</code>
                {i < placeholders.length - 2
                  ? ", "
                  : i === placeholders.length - 2
                    ? " and "
                    : " "}
              </span>
            ))}
            in the subject or body (the editor&apos;s Insert ▾ menu below adds them for you) —
            they get filled in with the real values when you send.
          </p>
        </div>
      )}
      <PageContentEditor page={page.slug} content={draft} onChange={setDraft} />
    </Dialog>
  );
};

export default PagesEditDialog;
