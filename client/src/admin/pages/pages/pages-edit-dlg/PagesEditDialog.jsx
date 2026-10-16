import { useState } from "react";
import axios from "axios";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import PageContentEditor from "../../../../adminContent/PageContentEditor";
import EMAIL_PLACEHOLDERS from "../../../../adminContent/emailPlaceholders";
import EMAIL_SLUGS from "../emailSlugs";
import EMAIL_TEMPLATES from "../../../../adminContent/emailTemplates";
import { ACCOUNT_PAGE_SLUGS } from "../../../../adminContent/accountPages";
import { DIALOG_SLUGS, MAX_ROCKS_CEILING } from "../../../../adminContent/dialogs";
import styles from "./PagesEditDialog.module.css";

const PagesEditDialog = ({ page, onClose, onSaved }) => {
  const [draft, setDraft] = useState(page.draft_body);
  const [subject, setSubject] = useState(page.draft_email_subject || "");
  const [sender, setSender] = useState(page.draft_email_from || "");
  const [replyTo, setReplyTo] = useState(page.draft_email_reply_to || "");
  const [sendTo, setSendTo] = useState(page.draft_email_to || "");
  // Dialog options (Request A Rock's # Rocks note and limit).
  const [rocksNote, setRocksNote] = useState(page.draft_settings?.rocksNote || "");
  const [maxRocks, setMaxRocks] = useState(page.draft_settings?.maxRocks ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEmail = EMAIL_SLUGS.has(page.slug);
  // Account pages (Sign In etc.) keep their Title in the same subject column.
  const isAccountPage = ACCOUNT_PAGE_SLUGS.has(page.slug);
  const isDialog = DIALOG_SLUGS.has(page.slug);
  // Emails sent to the family (not a visitor) also have a Send To.
  const hasSendTo = !!EMAIL_TEMPLATES[page.slug]?.adminRecipient;
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
        ...(isEmail || isAccountPage ? { email_subject: subject } : {}),
        ...(isEmail ? { email_from: sender, email_reply_to: replyTo } : {}),
        ...(hasSendTo ? { email_to: sendTo } : {}),
        // Blank Max Rocks = no limit of its own; the server checks the range.
        ...(isDialog
          ? { settings: { rocksNote, maxRocks: maxRocks === "" ? null : Number(maxRocks) } }
          : {}),
      });
      onSaved();
    } catch (err) {
      console.error("Failed to save draft:", err);
      // The server explains a bad Sender / Reply-To / Send To.
      setError(err.response?.data?.error || "Failed to save draft. Check console for details.");
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
          <div className={styles.addressGrid}>
            <label htmlFor="email-sender">Sender</label>
            <input
              id="email-sender"
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Aiden's Rocks <noreply@aidensrocks.com>"
            />
            <label htmlFor="email-reply-to">Reply-To</label>
            <input
              id="email-reply-to"
              type="text"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="noreply@aidensrocks.com"
            />
            {hasSendTo && (
              <>
                <label htmlFor="email-send-to">Send To</label>
                <input
                  id="email-send-to"
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="Blank = the Sender's address"
                />
              </>
            )}
          </div>
          <p className={styles.placeholderHint}>
            <strong>Sender</strong> is who it&apos;s from (a name is optional:{" "}
            <code>Name &lt;address&gt;</code>). <strong>Reply-To</strong> is where a reply goes.
            {hasSendTo && (
              <>
                {" "}
                <strong>Send To</strong> is who receives it; blank sends it to the Sender&apos;s
                address.
              </>
            )}{" "}
            Blank Sender / Reply-To use the site default. Like the subject, changes go live when you
            Publish.
          </p>
        </div>
      )}
      {isAccountPage && (
        <div className={styles.subjectField}>
          <label htmlFor="page-title">Title</label>
          <input
            id="page-title"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Page title"
          />
          <p className={styles.placeholderHint}>
            Shown as the heading on this page. The editor below is the description under it.
          </p>
        </div>
      )}
      {isDialog && (
        <div className={styles.subjectField}>
          <label htmlFor="dialog-rocks-note"># Rocks Note</label>
          <input
            id="dialog-rocks-note"
            type="text"
            maxLength={200}
            value={rocksNote}
            onChange={(e) => setRocksNote(e.target.value)}
            placeholder="e.g. (up to 10 per request)"
          />
          <p className={styles.placeholderHint}>
            Shown next to the <strong># Rocks</strong> label. Blank shows nothing.
          </p>
          <label htmlFor="dialog-max-rocks">Max Rocks</label>
          <input
            id="dialog-max-rocks"
            type="number"
            min="1"
            max={MAX_ROCKS_CEILING}
            step="1"
            value={maxRocks}
            onChange={(e) => setMaxRocks(e.target.value)}
            placeholder={`Blank = ${MAX_ROCKS_CEILING}`}
          />
          <p className={styles.placeholderHint}>
            The most rocks one request can ask for (1 to {MAX_ROCKS_CEILING}). The editor below is
            the message under the dialog&apos;s heading. Like the message, these go live when you
            Publish.
          </p>
        </div>
      )}
      <PageContentEditor page={page.slug} content={draft} onChange={setDraft} />
    </Dialog>
  );
};

export default PagesEditDialog;
