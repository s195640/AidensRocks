// Dashboard glance: a small table of today so far and yesterday (visitors,
// with admins and internal traffic left out; journey posts; rock requests;
// errors), error kinds still marked New, and a link to the Activity page.
// /api/admin/activity/glance.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { count } from "./activityUi";
import styles from "./TodayGlance.module.css";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Columns: key in the glance response, header (short, so all four fit on a
// phone). Errors are red when there are any.
const COLUMNS = [
  { key: "visitors", label: "Visitors" },
  { key: "journey_posts", label: "Journey posts" },
  { key: "rock_requests", label: "Rock requests" },
  { key: "errors", label: "Errors", alert: true },
];

const TodayGlance = () => {
  const [glance, setGlance] = useState(null);

  useEffect(() => {
    axios
      .get("/api/admin/activity/glance", { params: { tz: TZ } })
      .then(({ data }) => setGlance(data))
      .catch((err) => console.error("Error loading today's activity:", err));
  }, []);

  const days = [
    { label: "Today", day: glance },
    { label: "Yesterday", day: glance?.yesterday },
  ];

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label="Day"></th>
            {COLUMNS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(({ label, day }) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {COLUMNS.map((c) => (
                <td key={c.key} className={c.alert && day?.[c.key] > 0 ? styles.alert : undefined}>
                  {day ? count(day[c.key]) : "…"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.footer}>
        {glance?.new_errors > 0 ? (
          <span className={styles.alert}>
            {count(glance.new_errors)} new {glance.new_errors === 1 ? "error" : "errors"} in Site Health
          </span>
        ) : (
          <span />
        )}
        <Link to="/admin/activity" className={styles.link}>
          See all activity →
        </Link>
      </div>
    </div>
  );
};

export default TodayGlance;
