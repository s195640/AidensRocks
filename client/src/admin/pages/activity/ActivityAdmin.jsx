// src/admin/pages/activity/ActivityAdmin.jsx
import { useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import {
  ActivityByDayPanel,
  AlbumsPanel,
  FormsPanel,
  JourneysPanel,
  MusicListeningPanel,
  OutboundPanel,
  ScrollPanel,
  SearchesPanel,
  TopListsPanel,
  VisitorsPanel,
} from "../../components/activity/ActivityPanels";
import styles from "./ActivityAdmin.module.css";

// Admin → Activity (Site Tracking, phase 4): what visitors do on the site,
// from the activity log. One filter bar drives every panel. Admins and
// internal traffic (dev site / home network) are left out unless included.
// Errors live on the Dashboard's Site Health panel.
const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All" },
];

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const ActivityAdmin = () => {
  const [range, setRange] = useState("30");
  const [includeAdmins, setIncludeAdmins] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const queryKey = JSON.stringify({
    range,
    tz: TZ,
    includeAdmins: includeAdmins ? 1 : 0,
    includeInternal: includeInternal ? 1 : 0,
  });
  const panelProps = { queryKey, refresh };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Activity</h1>

      <div className={styles.bar}>
        <div className={styles.segmented} role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={r.value === range ? styles.segActive : styles.segBtn}
              aria-pressed={r.value === range}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className={styles.toggle}>
          <input type="checkbox" checked={includeAdmins} onChange={(e) => setIncludeAdmins(e.target.checked)} /> Include admins
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={includeInternal} onChange={(e) => setIncludeInternal(e.target.checked)} /> Include
          internal
        </label>
        <button type="button" className={styles.refreshBtn} onClick={() => setRefresh((n) => n + 1)} title="Refresh">
          <FiRefreshCw />
        </button>
      </div>

      <div className={styles.grid}>
        <VisitorsPanel {...panelProps} />
        <ActivityByDayPanel {...panelProps} />
        <FormsPanel {...panelProps} />
        <SearchesPanel {...panelProps} />
        <JourneysPanel {...panelProps} />
        <AlbumsPanel {...panelProps} />
        <MusicListeningPanel {...panelProps} />
        <OutboundPanel {...panelProps} />
        <ScrollPanel {...panelProps} />
        <TopListsPanel {...panelProps} />
      </div>
    </div>
  );
};

export default ActivityAdmin;
