// src/admin/components/honoring-aiden-panel/HonoringAidenPanel.jsx
import { useEffect, useState } from "react";
import honoringAidenAdminApi from "../../pages/honoring-aiden/honoringAidenAdminApi";
import styles from "./HonoringAidenPanel.module.css";
import { FiRefreshCw } from "react-icons/fi";

// Dashboard widget (Admin.jsx, right below MusicPanel — by request), same
// shape/styling as MusicPanel/ServerHealth: every Honoring Aiden entry's
// visit count (view_count) and on/off (published) status.
//
// "Maintain the tree structure" (by request) — rendered as one flat table
// with sub-entries directly beneath their parent, indented, rather than a
// nested table per parent; indentation alone is enough to read as a tree
// while still fitting this dashboard's existing single-<table> widget
// pattern. Tree-building (topLevelEntries/childEntriesOf) is the same
// approach HonoringAidenPage.jsx's own sidebar uses — reimplemented here
// rather than imported/shared, since this is the only other place in the
// app that needs that exact grouping and it's a few lines either way.
//
// Uses the admin entries endpoint (honoringAidenAdminApi.fetchEntries(),
// not the public one) so drafts show up with an accurate "Off" status too
// — this widget only renders inside Admin.jsx, which is already behind
// PrivateRoute, so the admin-only data here is appropriate to show.
const HonoringAidenPanel = () => {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const rows = await honoringAidenAdminApi.fetchEntries();
      // Archived entries are soft-deleted everywhere else in this feature
      // (HonoringAidenPage.jsx's own sidebar filters the same way) — no
      // reason for this widget to be the one place that still shows them.
      setEntries(Array.isArray(rows) ? rows.filter((e) => !e.archived) : []);
    } catch (err) {
      console.error("Error fetching honoring-aiden entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  if (!entries) {
    return <div className={styles.container}>Loading Honoring Aiden...</div>;
  }

  const topLevelEntries = entries.filter((e) => !e.parent_id);
  const childEntriesOf = (parentId) => entries.filter((e) => e.parent_id === parentId);

  // Flattened render order: each top-level entry immediately followed by
  // its own sub-entries — `entries` is already `ORDER BY sort_order` from
  // the API, and filtering (not re-sorting) preserves that relative order
  // within each group, same reasoning HonoringAidenPage.jsx's own
  // handleDragEnd relies on.
  const rows = topLevelEntries.flatMap((entry) => [
    { ...entry, isSubEntry: false },
    ...childEntriesOf(entry.id).map((child) => ({ ...child, isSubEntry: true })),
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Honoring Aiden</h2>
        <button className={styles.refreshBtn} onClick={fetchEntries} disabled={loading}>
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Page</th>
              <th>Visits</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.empty}>No entries yet.</td>
              </tr>
            ) : (
              rows.map((entry) => (
                <tr key={entry.slug}>
                  <td className={`${styles.tdLabel} ${entry.isSubEntry ? styles.subEntry : ""}`}>
                    {entry.title}
                  </td>
                  <td className={styles.tdValue}>{(entry.view_count || 0).toLocaleString()}</td>
                  <td className={styles.tdStatus}>
                    <span className={entry.published ? styles.on : styles.off}>
                      {entry.published ? "On" : "Off"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HonoringAidenPanel;
