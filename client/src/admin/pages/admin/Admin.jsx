// src/pages/Admin.jsx
import ARDetails from "../../components/ar-details/ARDetails";
import ServerHealth from "../../components/server-health/ServerHealth";
import Statistics from "../../components/statistics/Statistics";
import MusicPanel from "../../components/music-panel/MusicPanel";
import HonoringAidenPanel from "../../components/honoring-aiden-panel/HonoringAidenPanel";
import styles from "./Admin.module.css";

const Admin = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
      </div>
      <div className={styles.content}>
        {/* Left Column: Music, Honoring Aiden, Stats, and Health */}
        <div className={styles.leftColumn}>
          <MusicPanel />
          <HonoringAidenPanel />
          <Statistics />
          <ServerHealth />
        </div>

        {/* Right Column: AR Details */}
        <div className={styles.rightColumn}>
          <ARDetails />
        </div>
      </div>
    </div>
  );
};

export default Admin;