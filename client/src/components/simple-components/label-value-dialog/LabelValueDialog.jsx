import { useState } from "react";
import { Info } from "lucide-react";
import styles from "./LabelValueDialog.module.css";

export default function LabelValueDialog({ name, value, iconColor = "#0099ff", title, items }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.statItem}>
      {name}: {value}
      {items ? <Info
        className={styles.infoIcon}
        style={{ color: iconColor }}
        onClick={() => setOpen(true)}
      /> : null}

      {open && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialogBox}>
            <button className={styles.closeButton} onClick={() => setOpen(false)}>
              ✕
            </button>
            <h2>
              {title}: {value}
            </h2>
            <ul className={styles.list}>
              {items?.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <span className={styles.count}>{item.rocks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
