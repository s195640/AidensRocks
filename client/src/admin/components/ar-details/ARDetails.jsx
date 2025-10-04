import { useEffect, useState } from "react";
import axios from "axios";
import { FiChevronDown, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import styles from "./ARDetails.module.css";

const ARDetails = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // toggle states
  const [showArtists, setShowArtists] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [showStates, setShowStates] = useState(true);

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

  useEffect(() => {
    fetchDetails();
  }, []);

  if (!details) {
    return <div className={styles.container}>Loading AR Details...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Aidens Rocks Details</h2>
      </div>

      <div className={styles.grid}>
        <div className={styles.label}>Rocks:</div>
        <div className={styles.value}>{details.rocks}</div>

        <div className={styles.label}>Rocks Found:</div>
        <div className={styles.value}>{details.rocksFound}</div>

        <div className={styles.label}>Journeys:</div>
        <div className={styles.value}>{details.journeys}</div>

        {/* Artists section */}
        <div className={styles.label}>
          <button
            className={styles.toggleBtn}
            onClick={() => setShowArtists(!showArtists)}
          >
            {showArtists ? <FiChevronDown /> : <FiChevronRight />}
          </button>
          Artists:
        </div>
        <div className={styles.value}>{details.artists}</div>
        {showArtists && (
          <div className={styles.fullRow}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Rocks</th>
                </tr>
              </thead>
              <tbody>
                {details.artistsTable.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.name}</td>
                    <td>{a.age ?? "—"}</td>
                    <td>{a.rocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Countries section */}
        <div className={styles.label}>
          <button
            className={styles.toggleBtn}
            onClick={() => setShowCountries(!showCountries)}
          >
            {showCountries ? <FiChevronDown /> : <FiChevronRight />}
          </button>
          Countries:
        </div>
        <div className={styles.value}>{details.countries}</div>
        {showCountries && (
          <div className={styles.fullRow}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Country Name</th>
                  <th>Rocks</th>
                </tr>
              </thead>
              <tbody>
                {details.countriesTable.map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.name}</td>
                    <td>{c.rocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* States section */}
        <div className={styles.label}>
          <button
            className={styles.toggleBtn}
            onClick={() => setShowStates(!showStates)}
          >
            {showStates ? <FiChevronDown /> : <FiChevronRight />}
          </button>
          US States:
        </div>
        <div className={styles.value}>{details.usStates}</div>
        {showStates && (
          <div className={styles.fullRow}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>State Name</th>
                  <th>Rocks</th>
                </tr>
              </thead>
              <tbody>
                {details.statesTable.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.name}</td>
                    <td>{s.rocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ARDetails;
