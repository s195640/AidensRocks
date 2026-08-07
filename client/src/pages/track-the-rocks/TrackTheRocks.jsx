import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RockTable from "../../components/rock-journey/rock-table/RockTable";
import styles from "./TrackTheRocks.module.css";
import RockMapPopup from "../../components/rock-map/rock-map-popup/RockMapPopup";
import TotalRocks from "../../components/total-rocks/TotalRocks";

function TrackTheRocks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rockNumber, setRockNumber] = useState("");
  const [selectedRock, setSelectedRock] = useState(null);

  // Deep-link support: /track-the-rocks?rock=123 opens straight to that
  // rock's result dialog (same as typing 123 into Search and submitting),
  // skipping the manual search step — for shareable links pointing someone
  // straight to their own rock's journey.
  useEffect(() => {
    const num = parseInt(searchParams.get("rock"), 10);
    if (num > 0) {
      setSelectedRock(num);
    }
  }, [searchParams]);

  const handleSearchClick = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setRockNumber("");
  };

  const handleSearchSubmit = () => {
    const num = parseInt(rockNumber, 10);
    if (!num || num <= 0) {
      alert("Please enter a valid rock number > 0");
      return;
    }
    setSelectedRock(num);
    setIsDialogOpen(false);
  };

  const handleClosePopup = () => {
    setSelectedRock(null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>See Aiden&apos;s Rocks</h1>

      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.title}>
          <TotalRocks />
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={() => navigate("/all-rocks")}
          >
            See All Rocks
          </button>
          <button className={styles.button} onClick={handleSearchClick}>
            Search
          </button>
        </div>
      </div>

      <RockTable />

      {/* 🔎 Search Dialog */}
      {isDialogOpen && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h2>Search for a rock</h2>
            <label htmlFor="rockNumber">Rock number</label>
            <input
              id="rockNumber"
              type="number"
              min="1"
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
            />
            <div className={styles.dialogButtons}>
              <button
                className={`${styles.dialogButton} ${styles.searchBtn}`}
                onClick={handleSearchSubmit}
              >
                Search
              </button>
              <button
                className={`${styles.dialogButton} ${styles.closeBtn}`}
                onClick={handleCloseDialog}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗺️ Rock Map Dialog */}
      {selectedRock && (
        <div className={styles.dialogOverlay}>
          <div className={styles.largeDialog}>
            <div className={styles.largeDialogContent}>
              <RockMapPopup rockNumber={selectedRock} />
            </div>
            <div className={styles.largeDialogFooter}>
              <button
                className={styles.button}
                onClick={handleClosePopup}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackTheRocks;
