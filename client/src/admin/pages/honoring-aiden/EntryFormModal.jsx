import { useEffect, useState } from "react";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import honoringAidenAdminApi from "./honoringAidenAdminApi";
import styles from "./EntryFormModal.module.css";

// Create/rename modal for an `entry` row — opened from the sidebar's
// "+ Add Entry" button (top-level create), a top-level entry's own "+"
// (sub-entry create — see `parentEntry` below), or the pencil icon
// (rename). Title only, by request ("lets simplify this a bit... just
// provide Title only, we will use this as the link") — slug is generated
// server-side from the title (routes/honoringAidenAdmin.js's slugify(),
// retried on a collision), and every other field this form used to have
// (entry_date/published/cover_image) is gone: published now lives on
// EntryDetailView.jsx's own visibility toggle, and the entry's whole body
// is the ContentEditor there — nothing left for a separate form field to
// configure.
//
// On rename, `updateEntry` sends only `title` -- PUT is a partial update
// (see routes/honoringAidenAdmin.js). The `entry` prop here is a sidebar
// list row, which has no body_json; resending it used to wipe the page.
//
// `parentEntry`: only meaningful in create mode (entry == null) — the
// top-level entry a new sub-entry is being added under, from
// HonoringAidenPage.jsx's own "+" on that entry's row. Ignored entirely on
// rename (an entry's parent isn't editable from this form — no reparenting
// UI exists yet, see summary-issue-log.md).
export default function EntryFormModal({ isOpen, onClose, entry, parentEntry = null, onSaved }) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTitle(entry?.title || "");
    setError("");
  }, [entry, isOpen]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setIsSaving(true);
      const saved = entry
        ? await honoringAidenAdminApi.updateEntry(entry.id, { title: title.trim() })
        : await honoringAidenAdminApi.createEntry({
            title: title.trim(),
            parent_id: parentEntry?.id ?? null,
          });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error("Failed to save entry:", err);
      setError(err.response?.data?.error || "Error saving entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const dialogTitle = entry
    ? "Rename Entry"
    : parentEntry
      ? `Add Sub-Entry under "${parentEntry.title}"`
      : "Add Entry";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      buttonPanel={
        <>
          <button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <label>Title*</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </form>
    </Dialog>
  );
}
