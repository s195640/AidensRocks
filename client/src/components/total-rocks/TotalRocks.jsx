import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./TotalRocks.module.css";

export default function TotalRocks() {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const res = await axios.get("/api/rock-posts/totals");
        setTotals(res.data);
      } catch (err) {
        console.error("Error fetching rock totals:", err);
      }
    };

    fetchTotals();
  }, []);

  if (!totals) return null; // display nothing until data comes back

  return (
    <div className={styles.totalRocks}>
      Total rocks found {totals.rocks_found} of {totals.total_rocks}
    </div>
  );
}
