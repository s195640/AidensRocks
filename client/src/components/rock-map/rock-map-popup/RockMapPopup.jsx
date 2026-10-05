import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./RockMapPopup.module.css";
import RockJourney from "../../rock-journey/RockJourney";

export default function RockMapPopup({ rockNumber }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [groupedRocks, setGroupedRocks] = useState([]);

  // One fetch per rock. This effect used to depend on `loading` too, so
  // finishing the fetch (loading -> false) fired a second identical request;
  // `cancelled` drops a late response for a rock no longer shown.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProgress(0);

    // fake progress bar animation
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 10)); // hold at 90% until axios completes
    }, 200);

    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/rock-posts/${rockNumber}`);
        if (cancelled) return;
        const grouped = new Map();
        res.data.forEach((entry) => {
          if (!grouped.get(entry.rock_number)) {
            grouped.set(entry.rock_number, []);
          }
          grouped.get(entry.rock_number).push({
            ...entry,
            path: `/media/rocks/${entry.rock_number}/${entry.uuid}`,
          });
        });
        setGroupedRocks(Array.from(grouped).map(([key, value]) => ({ key, value })));
      } catch (err) {
        console.error("Error fetching rock data:", err);
      } finally {
        clearInterval(timer);
        if (!cancelled) {
          setProgress(100);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [rockNumber]);

  return (
    <div className={styles.popup}>
      {loading ? (
        <>
          <h3 className={styles.title}>
            Loading Rock Number: {rockNumber}
          </h3>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : groupedRocks.length === 0 ? (
        <div className={styles.notFound}>
          Rock Number {rockNumber} was not found
        </div>
      ) : (
        groupedRocks.map((i) => (
          <RockJourney
            key={i.key}
            rockNumber={i.key}
            collections={i.value}
          />
        ))
      )}
    </div>
  );
}
