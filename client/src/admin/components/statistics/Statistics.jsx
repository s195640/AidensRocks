// src/components/statistics/Statistics.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./Statistics.module.css";
import { FiRefreshCw } from "react-icons/fi";

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [unmatchedPaths, setUnmatchedPaths] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, unmatchedRes] = await Promise.all([
        axios.get("/api/statistics"),
        axios.get("/api/unmatched-path"),
      ]);
      setStats(statsRes.data);
      setUnmatchedPaths(unmatchedRes.data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) return <div className={styles.container}>Loading Statistics...</div>;

  const summaryRows = [
    { label: "Visitors", data: stats.visitors },
    { label: "No Location", data: stats.noLocation },
    { label: "Since Jan 1", data: stats.sinceJan1 },
    { label: "Last Year", data: stats.lastYear },
    { label: "Last 24 hours", data: stats.last24h },
    { label: "Last 7 days", data: stats.last7d },
    { label: "Last 30 days", data: stats.last30d },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Statistics</h2>
        <button className={styles.refreshBtn} onClick={fetchStats} disabled={loading}>
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.mainTableWrapper}>
        <table className={styles.mainTable}>
          <thead>
            <tr>
              <th></th>
              <th>Total</th>
              <th>Unique</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.label}>
                <td className={styles.rowLabel}>{row.label}</td>
                <td className={styles.rowValue}>{row.data.total.toLocaleString()}</td>
                <td className={styles.rowValue}>{row.data.unique.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableSection}>
        <h3>Visitors by Platform</h3>
        <table className={styles.agentTable}>
          <thead>
            <tr>
              <th></th>
              <th>Total</th>
              <th>Unique</th>
            </tr>
          </thead>
          <tbody>
            {stats.agentStats.map((agent) => (
              <tr key={agent.name}>
                <td className={styles.tdLabel}>{agent.name}</td>
                <td className={styles.tdValue}>{agent.total.toLocaleString()}</td>
                <td className={styles.tdValue}>{agent.unique.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableSection}>
        <h3>Path Hits</h3>
        {unmatchedPaths.length === 0 ? (
          <p>No path hits logged.</p>
        ) : (
          <table className={styles.agentTable}>
            <thead>
              <tr>
                <th></th>
                <th>Hits</th>
                <th>Last Hit</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedPaths.map((row) => (
                <tr key={row.path}>
                  <td className={styles.tdLabel}>{row.path}</td>
                  <td className={styles.tdValue}>{row.hit_count.toLocaleString()}</td>
                  <td className={styles.tdValue}>
                    {row.last_hit_dt ? new Date(row.last_hit_dt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Statistics;