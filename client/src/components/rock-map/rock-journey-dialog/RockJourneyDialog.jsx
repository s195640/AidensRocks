// Shared "rock journey" dialog opened from a map pin or a rock-number
// search — used on both the map page and Track the Rocks so the two stay
// visually identical instead of drifting into separate dialog styles.
//
// Site Tracking: opening it records rock_view (meta.source: search, link,
// map_pin or my_rocks) and closing it rock_close with the time on screen.
// Stops opened inside it link to this view via JourneyActivityContext.
// onResult(found) tells the caller whether the rock has a public journey,
// once it has loaded (for rock_search / rock_link).
import { useEffect, useState } from "react";
import styles from "./RockJourneyDialog.module.css";
import RockMapPopup from "../rock-map-popup/RockMapPopup";
import JourneyActivityContext from "../../rock-journey/JourneyActivityContext";
import { openView } from "../../../utils/activity";

export default function RockJourneyDialog({ rockNumber, onClose, source = null, onResult }) {
  const [activity, setActivity] = useState({ openId: null, source });

  useEffect(() => {
    if (!rockNumber) return undefined;
    const view = openView("rock_view", "rock_close", { targetId: String(rockNumber), meta: { source } });
    setActivity({ openId: view.openId, source });
    return () => view.close();
  }, [rockNumber]);

  if (!rockNumber) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <JourneyActivityContext.Provider value={activity}>
          <RockMapPopup rockNumber={rockNumber} onResult={onResult} />
        </JourneyActivityContext.Provider>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
      </div>
    </div>
  );
}
