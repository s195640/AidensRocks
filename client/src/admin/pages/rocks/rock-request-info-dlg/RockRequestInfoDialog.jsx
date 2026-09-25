import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./RockRequestInfoDialog.module.css";

const formatDt = (dt) => (dt ? dt.replace("T", " ").slice(0, 16) : "-");

// Read-only view of a rock_requests row, for a cataloged rock that's
// currently linked to a request (catalog.rq_key). Nothing here is
// editable -- to change the request itself, use the Rock Requests admin
// page's edit dialog.
const RockRequestInfoDialog = ({ isOpen, onClose, request }) => {
  if (!request) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Linked Rock Request"
      buttonPanel={<button onClick={onClose}>Close</button>}
    >
      <div className={styles.grid}>
        <div className={styles.label}>Name</div>
        <div className={styles.value}>{request.name}</div>

        <div className={styles.label}>Email</div>
        <div className={styles.value}>{request.email}</div>

        <div className={styles.label}>Address</div>
        <div className={styles.value}>{request.address}</div>

        <div className={styles.label}># Rocks Requested</div>
        <div className={styles.value}>{request.rocks_requested}</div>

        <div className={styles.label}>Shipped</div>
        <div className={styles.value}>{request.shipped ? "Yes" : "No"}</div>

        <div className={styles.label}>Tracking Number</div>
        <div className={styles.value}>{request.tracking_number || "-"}</div>

        <div className={styles.label}>Rock Numbers</div>
        <div className={styles.value}>{request.rock_numbers || "-"}</div>

        <div className={styles.label}>Comments</div>
        <div className={styles.value}>{request.comments || "-"}</div>

        <div className={styles.label}>Message (from requester)</div>
        <div className={styles.value}>{request.message || "No message provided."}</div>

        <div className={styles.label}>Requested</div>
        <div className={styles.value}>{formatDt(request.create_dt)}</div>

        <div className={styles.label}>Sent</div>
        <div className={styles.value}>{formatDt(request.sent_dt)}</div>

        <div className={styles.label}>Emailed</div>
        <div className={styles.value}>{formatDt(request.email_dt)}</div>
      </div>
    </Dialog>
  );
};

export default RockRequestInfoDialog;
