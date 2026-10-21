import { useMemo, useState } from "react";
import Table from "../../../../components/simple-components/table/Table";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import RockPopupByNumber from "../../../../components/rock-popup/RockPopupByNumber";
import { FaArrowDown, FaArrowUp, FaEdit, FaHandHoldingHeart, FaMinus, FaTrash, FaTrashRestore } from "react-icons/fa";
import { formatLocalDateTime } from "../../../../utils/localDate";
import styles from "./RockRequestsAdminTable.module.css";

export const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
const PRIORITY_ICONS = { high: FaArrowUp, normal: FaMinus, low: FaArrowDown };

const RockRequestsAdminTable = ({
  requests,
  loading,
  handleEdit,
  handleDelete,
  handleUndelete,
  handleQuickUpdate,
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
      [r.name, r.email, r.address, r.country, r.tracking_number, r.rock_numbers, r.comments, r.message].some(
        (field) => String(field ?? "").toLowerCase().includes(term)
      )
    );
  }, [searchTerm, requests]);

  const activeData = searchedData.filter((r) => !r.deleted);
  const deletedData = searchedData.filter((r) => r.deleted);
  const pendingData = activeData.filter((r) => !r.shipped);
  const shippedData = activeData.filter((r) => r.shipped);

  const totals = (rows) => {
    const rocks = rows.reduce((sum, r) => sum + (Number(r.rocks_requested) || 0), 0);
    return `(${rows.length} ${rows.length === 1 ? "request" : "requests"}, ${rocks} ${rocks === 1 ? "rock" : "rocks"})`;
  };

  // Small line under a section heading: requests / rocks per priority.
  const priorityBreakdown = (rows) => (
    <div className={styles.priorityBreakdown}>
      {PRIORITY_OPTIONS.map(({ value, label }) => {
        const matching = rows.filter((r) => (r.priority || "normal") === value);
        const rocks = matching.reduce((sum, r) => sum + (Number(r.rocks_requested) || 0), 0);
        const Icon = PRIORITY_ICONS[value];
        return (
          <span key={value} className={styles.breakdownItem}>
            <Icon size={10} className={styles[`breakdownIcon_${value}`]} />
            {label}: {matching.length} {matching.length === 1 ? "request" : "requests"}, {rocks}{" "}
            {rocks === 1 ? "rock" : "rocks"}
          </span>
        );
      })}
    </div>
  );

  const defaultSort = { key: "create_dt", direction: "desc" };

  // The whole row is tinted by priority: blue High, red Low, Normal plain.
  const priorityRowClass = (row) => styles[`row_${row.priority}`];
  // Pending only: a request marked Ready is also bold.
  const pendingRowClass = (row) =>
    `${priorityRowClass(row) || ""} ${row.ready_to_ship ? styles.row_ready : ""}`;

  const columns = useMemo(
    () => [
      {
        key: "priority",
        label: "Priority",
        defaultWidth: 75,
        sortable: true,
        sortValue: (row) => PRIORITY_RANK[row.priority] ?? 1,
      },
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "address", label: "Address", sortable: true },
      { key: "country", label: "Country", defaultWidth: 90, sortable: true },
      { key: "rocks_requested", label: "# Rocks", defaultWidth: 70, sortable: true },
      {
        key: "needed_by",
        label: "Needed By",
        defaultWidth: 90,
        sortable: true,
        // Soonest date first; "No rush" after every date, blanks last.
        sortValue: (row) => (row.no_rush ? "9999-12-31" : row.needed_by || "9999-12-32"),
      },
      { key: "ready_to_ship", label: "Ready", defaultWidth: 55, sortable: true },
      { key: "tracking_number", label: "Tracking #", sortable: true },
      { key: "rock_numbers", label: "Rock Numbers", sortable: true },
      { key: "comments", label: "Notes", sortable: true },
      {
        key: "bereaved_parent",
        label: <FaHandHoldingHeart title="Bereaved parent" aria-label="Bereaved parent" />,
        defaultWidth: 45,
        sortable: true,
        // Flagged first when sorted ascending.
        sortValue: (row) => (row.bereaved_parent ? 0 : 1),
      },
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
        return request.address ? (
          <div className={styles.addressCell}>{request.address}</div>
        ) : (
          "-"
        );

      // Priority and Ready save as soon as they change (no dialog).
      // One icon per priority: the current one is lit in its color, the
      // others are faded; one click sets it.
      case "priority": {
        const priority = request.priority || "normal";
        return (
          <div className={styles.priorityIcons} role="group" aria-label="Priority">
            {PRIORITY_OPTIONS.map(({ value, label }) => {
              const Icon = PRIORITY_ICONS[value];
              const active = value === priority;
              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.priorityButton} ${active ? styles[`priority_${value}`] : ""}`}
                  disabled={request.deleted}
                  aria-pressed={active}
                  title={`${label} priority`}
                  onClick={() => !active && handleQuickUpdate(request.rq_key, { priority: value })}
                >
                  <Icon size={12} />
                </button>
              );
            })}
          </div>
        );
      }

      case "ready_to_ship":
        return (
          <div className={styles.checkboxCell}>
            <input
              type="checkbox"
              checked={!!request.ready_to_ship}
              disabled={request.deleted}
              onChange={(e) => handleQuickUpdate(request.rq_key, { ready_to_ship: e.target.checked })}
              aria-label="Ready to ship"
            />
          </div>
        );

      // A checkbox drawn as the hand-holding-heart icon: lit when set.
      case "bereaved_parent":
        return (
          <button
            type="button"
            className={`${styles.bereavedButton} ${request.bereaved_parent ? styles.bereavedOn : ""}`}
            disabled={request.deleted}
            aria-pressed={!!request.bereaved_parent}
            title={request.bereaved_parent ? "Bereaved parent" : "Mark as bereaved parent"}
            onClick={() => handleQuickUpdate(request.rq_key, { bereaved_parent: !request.bereaved_parent })}
          >
            <FaHandHoldingHeart size={16} />
          </button>
        );

      case "needed_by":
        return request.no_rush ? "No rush" : request.needed_by || "-";

      case "create_dt":
        return request.create_dt ? formatLocalDateTime(request.create_dt) : "-";

      case "sent_dt":
        return request.sent_dt ? formatLocalDateTime(request.sent_dt) : "-";

      case "email_dt":
        return request.email_dt ? formatLocalDateTime(request.email_dt) : "-";

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
        <h3 className={styles.sectionHeading}>Pending {totals(pendingData)}</h3>
        <input
          type="text"
          placeholder="Search name, email, address, tracking #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      {priorityBreakdown(pendingData)}
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
          rowClassName={pendingRowClass}
        />
      )}

      <h3 className={styles.sectionHeading}>Shipped {totals(shippedData)}</h3>
      {priorityBreakdown(shippedData)}
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
          rowClassName={priorityRowClass}
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
              rowClassName={priorityRowClass}
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
