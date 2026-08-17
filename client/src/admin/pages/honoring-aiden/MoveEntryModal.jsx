import { useEffect, useState } from "react";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import honoringAidenAdminApi from "./honoringAidenAdminApi";
import styles from "./MoveEntryModal.module.css";

// "Move to..." modal — relocates an entry between top-level and any other
// top-level entry's sub-list (or promotes/demotes it), from
// AdminEditableBlock's own "Move" icon on each sidebar row
// (HonoringAidenPage.jsx). By request: "pages need to be able to be moved
// from a sub to a main and vs versa, as well as between 2 different
// parents."
//
// Only ever opened for an entry that's actually eligible to move —
// HonoringAidenPage.jsx omits the "Move" icon entirely for a top-level
// entry that currently has its own sub-entries (moving it under another
// parent would need a third nesting level for those children, which the
// two-level cap forbids — see routes/honoringAidenAdmin.js's PATCH
// /entries/:id/move), so this component doesn't need to re-derive or
// display that restriction itself.
export default function MoveEntryModal({ isOpen, onClose, entry, topLevelEntries, onMoved }) {
  // "" = Top Level, otherwise a (string) top-level entry id — <select>'s
  // native value type is always a string, converted back to a number (or
  // null) only when actually submitting.
  const [destination, setDestination] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !entry) return;
    // Opens showing where the entry actually is right now (not blank),
    // so "Move" with no changes is a harmless no-op rather than an
    // accidental reorder-to-end within whatever the default happened to be.
    setDestination(entry.parent_id != null ? String(entry.parent_id) : "");
    setError("");
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  // Every OTHER top-level entry is a selectable destination — including
  // the entry's current parent (if it has one), so the dropdown's initial
  // value above actually appears as an option; only the entry itself is
  // excluded (an entry can't be its own parent).
  const destinations = topLevelEntries.filter((e) => e.id !== entry.id);
  const currentLocation = entry.parent_id != null ? String(entry.parent_id) : "";

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Nothing actually changed — just close instead of round-tripping a
    // move-to-the-same-place (which would still reset sort_order to the
    // end of that group server-side, a pointless side effect for a no-op).
    if (destination === currentLocation) {
      onClose();
      return;
    }

    setError("");
    try {
      setIsSaving(true);
      const moved = await honoringAidenAdminApi.moveEntry(
        entry.id,
        destination === "" ? null : Number(destination)
      );
      onMoved?.(moved);
      onClose();
    } catch (err) {
      console.error("Failed to move entry:", err);
      setError(err.response?.data?.error || "Error moving entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move "${entry.title}"`}
      buttonPanel={
        <>
          <button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Moving..." : "Move"}
          </button>
          <button onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <label htmlFor="honoring-aiden-move-destination">Move to</label>
        <select
          id="honoring-aiden-move-destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="">— Top Level —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              Under &quot;{d.title}&quot;
            </option>
          ))}
        </select>
      </form>
    </Dialog>
  );
}
