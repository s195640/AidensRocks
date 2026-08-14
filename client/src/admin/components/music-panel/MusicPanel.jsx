// src/admin/components/music-panel/MusicPanel.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./MusicPanel.module.css";
import { FiRefreshCw } from "react-icons/fi";

const MusicPanel = () => {
  const [songs, setSongs] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/music");
      const sorted = Array.isArray(res.data)
        ? [...res.data].sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
        : [];
      setSongs(sorted);
    } catch (err) {
      console.error("Error fetching music:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  if (!songs) return <div className={styles.container}>Loading Music...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Music</h2>
        <button className={styles.refreshBtn} onClick={fetchSongs} disabled={loading}>
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Song</th>
              <th>Plays</th>
            </tr>
          </thead>
          <tbody>
            {songs.length === 0 ? (
              <tr>
                <td colSpan={2} className={styles.empty}>No songs yet.</td>
              </tr>
            ) : (
              songs.map((song) => (
                <tr key={song.m_key}>
                  <td className={styles.tdLabel}>{song.name}</td>
                  <td className={styles.tdValue}>{(song.play_count || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MusicPanel;
