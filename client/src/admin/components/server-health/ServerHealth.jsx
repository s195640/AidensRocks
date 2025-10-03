// src/admin/components/server-health/ServerHealth.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ServerHealth.module.css";
import { FiRefreshCw } from "react-icons/fi";

const ServerHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/server-health");

      const data = res.data;

      // Adapt API shape to old expected format
      const dbTablesNode1 = Object.entries(data.dbTables.node1).map(
        ([name, value]) => ({ name, value })
      );
      const dbTablesNode2 = Object.entries(data.dbTables.node2).map(
        ([name, value]) => ({ name, value })
      );

      setHealthData({
        lastUpdated: new Date(data.lastUpdated).toLocaleString(),
        serverIp: data.serverIp,
        lanIp: data.lanIp,
        internetIp: data.internetIp,
        connectedNode: data.connectedNode,
        dbSync: data.dbSync,
        dbTablesNode1,
        dbTablesNode2,
      });
    } catch (err) {
      console.error("Error fetching server health:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const StatusIcon = ({ status }) => (
    <span className={status ? styles.green : styles.red}>
      {status ? "✔" : "✖"}
    </span>
  );

  if (!healthData) {
    return <div className={styles.container}>Loading server health...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Server Health</h2>
        <button className={styles.refreshBtn} onClick={fetchHealth}>
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.label}>Last Updated:</div>
        <div className={styles.value}>{healthData.lastUpdated}</div>

        <div className={styles.label}>Server IP Address:</div>
        <div className={styles.value}>{healthData.serverIp}</div>

        <div className={styles.label}>Lan IP Address:</div>
        <div className={styles.value}>{healthData.lanIp}</div>

        <div className={styles.label}>Internet IP Address:</div>
        <div className={styles.value}>{healthData.internetIp}</div>

        <div className={styles.label}>Connected Node:</div>
        <div className={styles.value}>{healthData.connectedNode}</div>

        <div className={styles.label}>Database Sync:</div>
        <div className={styles.value}>
          <StatusIcon status={healthData.dbSync} />
        </div>
      </div>

      <div className={styles.dbTables}>
        <div className={styles.tableWrapper}>
          <h3>Node 1</h3>
          <table className={styles.table}>
            <tbody>
              {healthData.dbTablesNode1.map((row) => (
                <tr key={`node1-${row.name}`}>
                  <td className={styles.tdLabel}>{row.name}</td>
                  <td className={styles.tdValue}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableWrapper}>
          <h3>Node 2</h3>
          <table className={styles.table}>
            <tbody>
              {healthData.dbTablesNode2.map((row) => (
                <tr key={`node2-${row.name}`}>
                  <td className={styles.tdLabel}>{row.name}</td>
                  <td className={styles.tdValue}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServerHealth;
