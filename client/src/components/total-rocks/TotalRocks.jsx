import { useEffect, useState } from "react";
import axios from "axios";
import { Info } from "lucide-react"; // colorful info icon
import styles from "./TotalRocks.module.css";

export default function TotalRocks() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCountriesDialog, setShowCountriesDialog] = useState(false);
  const [showStatesDialog, setShowStatesDialog] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/ar-details");
        setDetails(res.data);
      } catch (err) {
        console.error("Error fetching AR details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  if (loading || !details) return null;

  return (
    <div className={styles.totalRocks}>
      <div>
        Total rocks found {details.rocksFound} of {details.rocks}
      </div>

      <div className={styles.statsColumn}>
        <div className={styles.statItem}>
          Countries visited: {details.countries}
          <Info
            className={`${styles.infoIcon} ${styles.countriesIcon}`}
            onClick={() => setShowCountriesDialog(true)}
          />
        </div>

        <div className={styles.statItem}>
          US States visited: {details.usStates}
          <Info
            className={`${styles.infoIcon} ${styles.statesIcon}`}
            onClick={() => setShowStatesDialog(true)}
          />
        </div>
      </div>

      {/* ---- Countries Dialog ---- */}
      {showCountriesDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialogBox}>
            <button
              className={styles.closeButton}
              onClick={() => setShowCountriesDialog(false)}
            >
              ✕
            </button>
            <h2>Total Countries Visited: {details.countries}</h2>
            <ul className={styles.list}>
              {details.countriesTable.map((c) => (
                <li key={c.name}>
                  <span>{c.name}</span>
                  <span className={styles.count}>{c.rocks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---- States Dialog ---- */}
      {showStatesDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialogBox}>
            <button
              className={styles.closeButton}
              onClick={() => setShowStatesDialog(false)}
            >
              ✕
            </button>
            <h2>Total States Visited: {details.usStates}</h2>
            <ul className={styles.list}>
              {details.statesTable.map((s) => (
                <li key={s.name}>
                  <span>{s.name}</span>
                  <span className={styles.count}>{s.rocks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
