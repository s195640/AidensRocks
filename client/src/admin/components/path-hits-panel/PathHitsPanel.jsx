// src/admin/components/path-hits-panel/PathHitsPanel.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./PathHitsPanel.module.css";
import { FiRefreshCw, FiEye, FiEyeOff } from "react-icons/fi";

// Its own dashboard widget, split out of Statistics.jsx (which still owns
// visitor/platform stats) per request -- same MusicPanel/HonoringAidenPanel
// card layout. Display Name comes from the admin-managed path_display_name
// lookup table (see server/src/routes/unmatchedPath.js), edited from the
// "Path Display Names" job on the Jobs page
// (client/src/admin/components/path-display-names/PathDisplayNames.jsx);
// this panel is read-only.
const PathHitsPanel = () => {
  const [pathHits, setPathHits] = useState(null);
  const [loading, setLoading] = useState(false);
  // Not persisted anywhere (no localStorage/query param) -- always starts
  // hidden on mount, per request. Purely a client-side filter over the
  // already-fetched rows, so toggling it doesn't refetch.
  const [showUnknown, setShowUnknown] = useState(false);

  const fetchPathHits = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/unmatched-path");
      setPathHits(data);
    } catch (err) {
      console.error("Error fetching path hits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPathHits();
  }, []);

  if (!pathHits) return <div className={styles.container}>Loading Path Hits...</div>;

  const unknownCount = pathHits.filter((row) => row.display_name === "Unknown").length;
  const visibleHits = showUnknown
    ? pathHits
    : pathHits.filter((row) => row.display_name !== "Unknown");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Path Hits</h2>
        <div className={styles.headerActions}>
          {unknownCount > 0 && (
            <button
              className={styles.iconBtn}
              onClick={() => setShowUnknown((v) => !v)}
              title={showUnknown ? "Hide Unknown" : `Show Unknown (${unknownCount})`}
            >
              {showUnknown ? <FiEyeOff /> : <FiEye />}
            </button>
          )}
          <button className={styles.iconBtn} onClick={fetchPathHits} disabled={loading}>
            <FiRefreshCw className={loading ? styles.spin : ""} />
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Full URL</th>
              <th>Hits</th>
              <th>Last Hit</th>
            </tr>
          </thead>
          <tbody>
            {visibleHits.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  {pathHits.length === 0
                    ? "No path hits logged."
                    : "No path hits to show -- all logged hits are Unknown."}
                </td>
              </tr>
            ) : (
              visibleHits.map((row) => (
                <tr key={row.full_url}>
                  <td className={styles.tdLabel}>{row.display_name}</td>
                  <td className={styles.tdUrl}>{row.full_url}</td>
                  <td className={styles.tdValue}>{row.hit_count.toLocaleString()}</td>
                  <td className={styles.tdValue}>
                    {row.last_hit_dt ? new Date(row.last_hit_dt).toLocaleString() : "—"}
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

export default PathHitsPanel;
