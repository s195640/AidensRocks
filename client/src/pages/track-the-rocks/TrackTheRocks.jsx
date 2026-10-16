import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RockTable from "../../components/rock-journey/rock-table/RockTable";
import styles from "./TrackTheRocks.module.css";
import { reportShownError, track } from "../../utils/activity";
import RockJourneyDialog from "../../components/rock-map/rock-journey-dialog/RockJourneyDialog";
import TotalRocks from "../../components/total-rocks/TotalRocks";
import ToggleSwitch from "../../components/simple-components/toggle-switch/ToggleSwitch";
import { useAuth } from "../../admin/context/AuthContext";

function TrackTheRocks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rockNumber, setRockNumber] = useState("");
  const [selectedRock, setSelectedRock] = useState(null);
  // Site Tracking: how the open rock was reached -- a search, or a shared
  // ?rock= link (with &from=email-* when it came from one of our emails).
  const [opened, setOpened] = useState({ source: null, from: null });
  const { isUser } = useAuth();
  const [followedOnly, setFollowedOnly] = useState(false);
  const showFollowedOnly = isUser && followedOnly;

  // Deep-link support: /track-the-rocks?rock=123 opens straight to that
  // rock's result dialog (same as typing 123 into Search and submitting),
  // skipping the manual search step — for shareable links pointing someone
  // straight to their own rock's journey.
  useEffect(() => {
    const num = parseInt(searchParams.get("rock"), 10);
    if (num > 0) {
      setOpened({ source: "link", from: searchParams.get("from") });
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
      reportShownError("track_rock_number", "Please enter a valid rock number > 0");
      alert("Please enter a valid rock number > 0");
      return;
    }
    setOpened({ source: "search", from: null });
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

      {isUser && (
        <div className={styles.followedFilter}>
          <span>Show only rocks I follow</span>
          <ToggleSwitch
            checked={followedOnly}
            onChange={() => setFollowedOnly((v) => !v)}
          />
        </div>
      )}

      {/* Remount on toggle so paging starts over from page 1. */}
      <RockTable
        key={showFollowedOnly ? "followed" : "all"}
        followedOnly={showFollowedOnly}
      />

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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
              }}
              autoFocus
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

      {/* 🗺️ Rock Journey Dialog (same dialog used on the map page) */}
      <RockJourneyDialog
        rockNumber={selectedRock}
        onClose={handleClosePopup}
        source={opened.source}
        onResult={(found) => {
          const targetId = String(selectedRock);
          if (opened.source === "search") {
            track("rock_search", { targetId, meta: { page: "track_the_rocks", input: "search", found } });
          } else if (opened.source === "link") {
            track("rock_link", { targetId, meta: { found, from: opened.from } });
          }
        }}
      />
    </div>
  );
}

export default TrackTheRocks;
