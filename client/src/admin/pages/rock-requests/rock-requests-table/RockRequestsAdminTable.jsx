import { useMemo, useState } from "react";
import Table from "../../../../components/simple-components/table/Table";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import RockPopupByNumber from "../../../../components/rock-popup/RockPopupByNumber";
import { FaEdit, FaTrash, FaTrashRestore } from "react-icons/fa";
import styles from "./RockRequestsAdminTable.module.css";

const RockRequestsAdminTable = ({
  requests,
  loading,
  handleEdit,
  handleDelete,
  handleUndelete,
  showDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [messageDialog, setMessageDialog] = useState({ open: false, text: "" });
  const [viewingRockNumber, setViewingRockNumber] = useState(null);

  const _data = requests.map((r) => ({
    ...r,
    _message:
      r.message && r.message.length > 150
        ? `${r.message.substring(0, 150)} (...)`
        : r.message,
  }));

  const searchedData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return _data;
    return _data.filter((r) =>
      [r.name, r.email, r.address, r.tracking_number, r.rock_numbers, r.comments, r.message].some(
        (field) => String(field ?? "").toLowerCase().includes(term)
      )
    );
  }, [searchTerm, requests]);

  const activeData = searchedData.filter((r) => !r.deleted);
  const deletedData = searchedData.filter((r) => r.deleted);
  const pendingData = activeData.filter((r) => !r.shipped);
  const shippedData = activeData.filter((r) => r.shipped);

  const defaultSort = { key: "create_dt", direction: "desc" };

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "address", label: "Address", sortable: true },
      { key: "rocks_requested", label: "# Rocks", defaultWidth: 70, sortable: true },
      { key: "shipped", label: "Shipped", defaultWidth: 70, sortable: true },
      { key: "tracking_number", label: "Tracking #", sortable: true },
      { key: "rock_numbers", label: "Rock Numbers", sortable: true },
      { key: "comments", label: "Comments", sortable: true },
      {
        key: "message",
        label: "Message",
        sortable: true,
        sortValue: (row) => row._message,
      },
      { key: "create_dt", label: "Requested", defaultWidth: 120, sortable: true },
      { key: "sent_dt", label: "Sent", defaultWidth: 120, sortable: true },
      { key: "email_dt", label: "Emailed", defaultWidth: 120, sortable: true },
      { key: "actions", label: "Actions", defaultWidth: 60, sortable: false },
    ],
    []
  );

  const renderCell = (request, colKey) => {
    switch (colKey) {
      case "address":
        return (
          <div className={styles.addressCell}>{request.address}</div>
        );

      case "shipped":
        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={!!request.shipped}
              disabled
              readOnly
              className={styles.checkboxCell}
            />
          </div>
        );

      case "create_dt":
        return request.create_dt ? request.create_dt.replace("T", " ").slice(0, 16) : "-";

      case "sent_dt":
        return request.sent_dt ? request.sent_dt.replace("T", " ").slice(0, 16) : "-";

      case "email_dt":
        return request.email_dt ? request.email_dt.replace("T", " ").slice(0, 16) : "-";

      case "rock_numbers": {
        const numbers = (request.rock_numbers || "")
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);
        if (numbers.length === 0) return "-";
        return numbers.map((num, idx) => (
          <span key={`${num}-${idx}`}>
            <span
              className={styles.rockNumberLink}
              onClick={() => setViewingRockNumber(num)}
            >
              {num}
            </span>
            {idx < numbers.length - 1 ? ", " : ""}
          </span>
        ));
      }

      case "message":
        return request.message ? (
          <div
            className={styles.commentCell}
            onClick={() => setMessageDialog({ open: true, text: request.message })}
          >
            {request._message}
          </div>
        ) : (
          "-"
        );

      case "actions":
        return request.deleted ? (
          <div className={styles.actionsWrapper}>
            <FaTrashRestore
              size={20}
              style={{ color: "#5bc0de", cursor: "pointer", transition: "transform 0.2s" }}
              title="Undelete"
              onClick={() => handleUndelete(request.rq_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>
        ) : (
          <div className={styles.actionsWrapper}>
            <FaEdit
              size={20}
              style={{ color: "#5bc0de", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleEdit(request)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
            <FaTrash
              size={20}
              style={{ color: "red", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleDelete(request.rq_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>
        );

      default:
        return request[colKey] ?? "-";
    }
  };

  return (
    <>
      <div className={styles.sectionHeadingRow}>
        <h3 className={styles.sectionHeading}>Pending</h3>
        <input
          type="text"
          placeholder="Search name, email, address, tracking #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      {pendingData.length === 0 ? (
        <p className={styles.emptyMessage}>No pending rock requests.</p>
      ) : (
        <Table
          columns={columns}
          data={pendingData}
          renderCell={renderCell}
          fontSize={"0.75rem"}
          defaultSort={defaultSort}
          loading={loading}
        />
      )}

      <h3 className={styles.sectionHeading}>Shipped</h3>
      {shippedData.length === 0 ? (
        <p className={styles.emptyMessage}>No shipped rock requests yet.</p>
      ) : (
        <Table
          columns={columns}
          data={shippedData}
          renderCell={renderCell}
          fontSize={"0.75rem"}
          defaultSort={defaultSort}
          loading={loading}
        />
      )}

      {showDeleted && (
        <>
          <h3 className={styles.sectionHeading}>Deleted</h3>
          {deletedData.length === 0 ? (
            <p className={styles.emptyMessage}>No deleted rock requests.</p>
          ) : (
            <Table
              columns={columns}
              data={deletedData}
              renderCell={renderCell}
              fontSize={"0.75rem"}
              defaultSort={defaultSort}
              loading={loading}
            />
          )}
        </>
      )}

      <Dialog
        isOpen={messageDialog.open}
        onClose={() => setMessageDialog({ open: false, text: "" })}
        title="Full Message"
        buttonPanel={
          <button
            className={styles.closeButton}
            onClick={() => setMessageDialog({ open: false, text: "" })}
          >
            ✕
          </button>
        }
      >
        <div className={styles.commentText}>{messageDialog.text || "(No message)"}</div>
      </Dialog>

      <RockPopupByNumber
        rockNumber={viewingRockNumber}
        onClose={() => setViewingRockNumber(null)}
      />
    </>
  );
};

export default RockRequestsAdminTable;
