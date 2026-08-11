// Shared "rock journey" dialog opened from a map pin or a rock-number
// search — used on both the map page and Track the Rocks so the two stay
// visually identical instead of drifting into separate dialog styles.
import styles from "./RockJourneyDialog.module.css";
import RockMapPopup from "../rock-map-popup/RockMapPopup";

export default function RockJourneyDialog({ rockNumber, onClose }) {
  if (!rockNumber) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <RockMapPopup rockNumber={rockNumber} />
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
      </div>
    </div>
  );
}
