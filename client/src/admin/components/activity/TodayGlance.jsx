// Dashboard row: today so far (visitors, visits, page views; admins and
// internal traffic left out) and error kinds still marked New, with links
// to the Activity page and Site Health. /api/admin/activity/glance.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { count } from "./activityUi";
import styles from "./TodayGlance.module.css";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const TodayGlance = () => {
  const [today, setToday] = useState(null);

  useEffect(() => {
    axios
      .get("/api/admin/activity/glance", { params: { tz: TZ } })
      .then(({ data }) => setToday(data))
      .catch((err) => console.error("Error loading today's activity:", err));
  }, []);

  return (
    <div className={styles.row}>
      <span className={styles.label}>Today</span>
      <span className={styles.stat}>
        <strong>{today ? count(today.visitors) : "…"}</strong> visitors
      </span>
      <span className={styles.stat}>
        <strong>{today ? count(today.visits) : "…"}</strong> visits
      </span>
      <span className={styles.stat}>
        <strong>{today ? count(today.page_views) : "…"}</strong> page views
      </span>
      {today?.new_errors > 0 && (
        <span className={`${styles.stat} ${styles.alert}`}>
          <strong>{count(today.new_errors)}</strong> new {today.new_errors === 1 ? "error" : "errors"} in Site Health
        </span>
      )}
      <Link to="/admin/activity" className={styles.link}>
        See all activity →
      </Link>
    </div>
  );
};

export default TodayGlance;
