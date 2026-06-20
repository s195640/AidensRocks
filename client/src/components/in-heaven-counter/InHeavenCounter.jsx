import { useEffect, useState } from "react";
import styles from "./InHeavenCounter.module.css";

// 5/20/2025 @ 4:06pm America/New_York (EDT, UTC-4 on this date).
const PASSING_DATE_UTC = "2025-05-20T20:06:00Z";

function getElapsed(start, now) {
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days, hours, minutes, seconds };
}

const pad = (n) => String(n).padStart(2, "0");

const InHeavenCounter = () => {
  const start = new Date(PASSING_DATE_UTC);
  const [elapsed, setElapsed] = useState(() => getElapsed(start, new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsed(start, new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { years, months, days, hours, minutes, seconds } = elapsed;

  const units = [
    { value: years, label: "Years" },
    { value: months, label: "Months" },
    { value: days, label: "Days" },
    { value: pad(hours), label: "Hrs" },
    { value: pad(minutes), label: "Min" },
    { value: pad(seconds), label: "Sec" },
  ];

  return (
    <div className={styles.counter}>
      <span className={styles.label}>In Heaven for</span>
      <div className={styles.units}>
        {units.map((unit) => (
          <div key={unit.label} className={styles.unit}>
            <span className={styles.value}>{unit.value}</span>
            <span className={styles.unitLabel}>{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InHeavenCounter;
