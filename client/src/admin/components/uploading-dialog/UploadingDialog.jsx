import Dialog from "../../../components/simple-components/dialog/Dialog";
import styles from "./UploadingDialog.module.css";

// Circular percentage dial, hand-rolled in SVG — no such component exists
// anywhere in this codebase yet, and no charting/progress library is
// installed to reach for instead (see AlbumsCreateDlg.jsx's linear
// progressFill bars for the closest existing precedent, which this mirrors
// in color: #eee track / #5cb85c fill).
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressDial({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={styles.dialWrapper}>
      <svg viewBox="0 0 120 120" className={styles.dial}>
        <circle className={styles.dialTrack} cx="60" cy="60" r={RADIUS} />
        <circle
          className={styles.dialFill}
          cx="60"
          cy="60"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.dialPercent}>{clamped}%</div>
    </div>
  );
}

// Shown for every media upload triggered from inside the Honoring Aiden
// ContentEditor (toolbar insert, slash command, drag/drop, paste) — both
// whole-file and chunked uploads report progress the same way (see
// honoringAidenAdminApi.js's uploadMedia), so this doesn't need to know or
// care which path is running. No cancel/close affordance: no upload flow in
// this app currently supports aborting an in-flight upload, so this doesn't
// introduce one either — it just tracks EntryDetailView's uploadDialog state
// and disappears on its own once the upload settles (success or failure).
export default function UploadingDialog({ isOpen, fileName, percent }) {
  return (
    <Dialog isOpen={isOpen} title="Uploading">
      <div className={styles.content}>
        <ProgressDial percent={percent} />
        {fileName && <div className={styles.fileName}>{fileName}</div>}
      </div>
    </Dialog>
  );
}
