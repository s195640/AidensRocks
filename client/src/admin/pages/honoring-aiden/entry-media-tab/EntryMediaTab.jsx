import { useCallback, useEffect, useState } from "react";
import honoringAidenAdminApi from "../honoringAidenAdminApi";
import styles from "./EntryMediaTab.module.css";

// One media card, shared by both the "current page" grid and the "other
// pages" grid below — the only difference between the two is whether
// entry_title is present (only "other" items carry it, so the admin can
// tell which page a cross-entry item came from).
function MediaCard({ item, onImport, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.thumbWrapper}>
        {item.item_type === "video" ? (
          // Native controls, not just a static poster — playable right in
          // the grid. preload="none" so the browser doesn't fetch every
          // video's data just because its card is on screen; only once the
          // admin actually presses play.
          <video
            src={item.media_path}
            poster={item.poster_path || undefined}
            controls
            preload="none"
            className={styles.thumb}
          />
        ) : (
          <img src={item.thumbnail_path || item.media_path} alt="" className={styles.thumb} />
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.type}>{item.item_type === "video" ? "Video" : "Image"}</div>
        {item.entry_title && <div className={styles.entryTitle}>{item.entry_title}</div>}
        <div className={item.ref_count > 0 ? styles.badgeUsed : styles.badgeUnused}>
          {item.ref_count > 0 ? `Used ×${item.ref_count}` : "Not used"}
        </div>
        <div className={styles.date}>
          {item.create_dt ? new Date(item.create_dt).toLocaleDateString() : "—"}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={() => onImport(item)}>
          Import
        </button>
        <button type="button" className={styles.deleteBtn} onClick={() => onDelete(item)}>
          Delete
        </button>
      </div>
    </div>
  );
}

// Lists every media file uploaded into this entry, plus (by request) every
// OTHER entry's media below a divider, newest first — see
// server/src/routes/honoringAidenAdmin.js's GET /entries/:id/media for the
// full { current, other } shape (what "historical" rows are, why ref_count
// is computed per-item against its OWN entry's last SAVED body_json, and
// why "other" only covers tracked uploads, not untracked/historical ones
// from other entries).
export default function EntryMediaTab({ entry, onImport }) {
  const [current, setCurrent] = useState([]);
  const [other, setOther] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await honoringAidenAdminApi.fetchEntryMedia(entry.id);
      setCurrent(data.current);
      setOther(data.other);
    } catch (err) {
      console.error(`Failed to load media for entry ${entry.id}:`, err);
      setError("Couldn't load media for this page.");
    } finally {
      setLoading(false);
    }
  }, [entry.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item) => {
    const warning =
      item.ref_count > 0
        ? `This file is still used ${item.ref_count} time${item.ref_count === 1 ? "" : "s"} ${item.entry_title ? `on "${item.entry_title}"` : "in this page's content"} — deleting it will leave broken image(s)/video(s) where it's referenced. Delete anyway?`
        : "Delete this file? This can't be undone.";
    if (!window.confirm(warning)) return;

    try {
      await honoringAidenAdminApi.deleteEntryMedia(entry.id, item.media_path);
      setCurrent((prev) => prev.filter((i) => i.media_path !== item.media_path));
      setOther((prev) => prev.filter((i) => i.media_path !== item.media_path));
    } catch (err) {
      console.error(`Failed to delete media "${item.media_path}":`, err);
      window.alert("Couldn't delete this file. Please try again.");
    }
  };

  if (loading) return <p>Loading media…</p>;
  if (error) return <p className={styles.errorMessage}>{error}</p>;

  return (
    <div>
      {current.length === 0 ? (
        <p>No media uploaded for this page yet.</p>
      ) : (
        <div className={styles.grid}>
          {current.map((item) => (
            <MediaCard key={item.media_path} item={item} onImport={onImport} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {other.length > 0 && (
        <>
          <hr className={styles.divider} />
          <h4 className={styles.sectionHeading}>Other Pages&apos; Media</h4>
          <div className={styles.grid}>
            {other.map((item) => (
              <MediaCard key={item.media_path} item={item} onImport={onImport} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
