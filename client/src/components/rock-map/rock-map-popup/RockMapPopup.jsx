import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./RockMapPopup.module.css";
import RockJourney from "../../rock-journey/RockJourney";

export default function RockMapPopup({ rockNumber }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [groupedRocks, setGroupedRocks] = useState([]);

  useEffect(() => {
    let timer;

    // fake progress bar animation
    if (loading) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // stop at 90% until axios completes
          return prev + 10;
        });
      }, 200);
    }

    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/rock-posts/${rockNumber}`);
        const data = res.data;
        const grouped = new Map();
        data.forEach((entry) => {
          if (!grouped.get(entry.rock_number)) {
            grouped.set(entry.rock_number, []);
          }
          grouped
            .get(entry.rock_number)
            .push({
              ...entry,
              path: `/media/rocks/${entry.rock_number}/${entry.uuid}`,
            });
        });
        setGroupedRocks(
          Array.from(grouped).map(([key, value]) => ({ key, value }))
        );
      } catch (err) {
        console.error("Error fetching rock data:", err);
      } finally {
        clearInterval(timer);
        setProgress(100);
        setLoading(false);
      }
    };

    fetchData();

    return () => clearInterval(timer);
  }, [rockNumber, loading]);

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
