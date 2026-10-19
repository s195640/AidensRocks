import { useEffect, useMemo, useState } from "react";
import Table from "../../../../components/simple-components/table/Table";
import RockRequestInfoDialog from "../rock-request-info-dlg/RockRequestInfoDialog";
import RockJourneyDialog from "../../../../components/rock-map/rock-journey-dialog/RockJourneyDialog";
import { FaEdit, FaTrash, FaClipboardList, FaHandHoldingHeart } from "react-icons/fa";
import { ASSIGN_STATUSES } from "../assignStatuses";
import styles from "./RockTable.module.css";

export default function RockTable({
  rocks,
  onEdit,
  onDelete,
  onStatusChange,
  onBereavedChange,
  statusFilter,
  recentHours,
  searchTerm,
  onShownCountChange,
  stickyHeaderTop,
  openImageDialog,
  requests,
}) {
  const [viewingRequest, setViewingRequest] = useState(null);
  const [journeyRock, setJourneyRock] = useState(null);

  const requestByRqKey = useMemo(() => {
    const map = new Map();
    (requests || []).forEach((r) => map.set(String(r.rq_key), r));
    return map;
  }, [requests]);

  // Precompute each rock's linked request (if any) once, so both the
  // search filter and the "Rock Request" column's sort/render can reuse
  // the same lookup instead of re-deriving it in multiple places.
  const _data = useMemo(
    () =>
      rocks.map((row) => {
        const linkedRequest = row.rq_key != null ? requestByRqKey.get(String(row.rq_key)) : null;
        return {
          ...row,
          _linkedRequest: linkedRequest,
          _requestName: linkedRequest?.name || "",
          _requestEmail: linkedRequest?.email || "",
          _requestAddress: linkedRequest?.address || "",
        };
      }),
    [rocks, requestByRqKey]
  );

  const filteredRocks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const since = recentHours ? Date.now() - recentHours * 60 * 60 * 1000 : null;
    const byFilters = _data.filter(
      (row) =>
        (!statusFilter || row.assign_status === statusFilter) && (!since || new Date(row.create_dt) > since)
    );
    if (!term) return byFilters;
    return byFilters.filter((row) => {
      const artistNames = (row.artists || []).map((a) => a.display_name).join(", ");
      return [
        row.rock_number,
        artistNames,
        row.comment,
        row._requestName,
        row._requestEmail,
        row._requestAddress,
      ].some((field) => String(field ?? "").toLowerCase().includes(term));
    });
  }, [_data, searchTerm, statusFilter, recentHours]);

  useEffect(() => {
    onShownCountChange?.(filteredRocks.length);
  }, [filteredRocks.length, onShownCountChange]);

  const columns = [
    { key: "rock_number", label: "Rock", defaultWidth: 80, sortable: true, },
    { key: "image", label: "Image", defaultWidth: 75 },
    { key: "assign_status", label: "Status", defaultWidth: 110, sortable: true },
    {
      key: "bereaved_parent",
      label: <FaHandHoldingHeart title="Bereaved parent" aria-label="Bereaved parent" />,
      defaultWidth: 45,
      sortable: true,
      // Flagged first when sorted ascending.
      sortValue: (row) => (row.bereaved_parent ? 0 : 1),
    },
    { key: "artists", label: "Artists", defaultWidth: 120, sortable: true, },
    { key: "comment", label: "Comment", sortable: true, },
    {
      key: "assigned_dt",
      label: "Assigned",
      defaultWidth: 100,
      sortable: true,
      sortValue: (row) => row.assigned_dt || "",
    },
    {
      key: "request_name",
      label: "Name",
      defaultWidth: 120,
      sortable: true,
      sortValue: (row) => row._requestName,
    },
    {
      key: "request_email",
      label: "Email",
      defaultWidth: 140,
      sortable: true,
      sortValue: (row) => row._requestEmail,
    },
    {
      key: "request_address",
      label: "Address",
      defaultWidth: 160,
      sortable: true,
      sortValue: (row) => row._requestAddress,
    },
    { key: "create_dt", label: "Created", defaultWidth: 120, sortable: true },
    { key: "actions", label: "Actions", defaultWidth: 85, className: styles.actionsCol },
  ];

  const renderCell = (row, key) => {
    // Opens the same journey dialog visitors see (as on the Activity page);
    // a rock with no public journey yet is plain text.
    if (key === "rock_number")
      return row.has_journey ? (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setJourneyRock(row.rock_number)}
          title="See this rock's journey"
        >
          {row.rock_number}
        </button>
      ) : (
        row.rock_number
      );
    if (key === "artists") return row.artists.map((a) => a.display_name).join(", ");
    // Saves as soon as it changes (no dialog).
    if (key === "assign_status")
      return (
        <select
          className={`${styles.statusSelect} ${styles[`status_${row.assign_status}`] || ""}`}
          value={row.assign_status}
          onChange={(e) => onStatusChange(row, e.target.value)}
        >
          {ASSIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );
    if (key === "assigned_dt") return row.assigned_dt || "-";
    // Same hand-holding-heart toggle as Rock Requests: lit when set.
    if (key === "bereaved_parent")
      return (
        <button
          type="button"
          className={`${styles.bereavedButton} ${row.bereaved_parent ? styles.bereavedOn : ""}`}
          aria-pressed={!!row.bereaved_parent}
          title={row.bereaved_parent ? "Bereaved parent" : "Mark as bereaved parent"}
          onClick={() => onBereavedChange(row, !row.bereaved_parent)}
        >
          <FaHandHoldingHeart size={16} />
        </button>
      );
    if (key === "request_name") return row._requestName || "-";
    if (key === "request_email") return row._requestEmail || "-";
    if (key === "request_address")
      return row._requestAddress ? (
        <div className={styles.addressCell} title={row._requestAddress}>
          {row._requestAddress}
        </div>
      ) : (
        "-"
      );
    if (key === "create_dt") return new Date(row.create_dt).toLocaleDateString();
    if (key === "image")
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <img
            src={`/media/catalog/${row.rock_number}/a_sm.webp`}
            alt=""
            className={styles.thumb}
            onClick={() => openImageDialog(row)}
            onError={(e) => (e.target.style.display = "none")}
            style={{ cursor: "pointer" }}
          />
        </div>
      );
    if (key === "actions") {
      const linkedRequest = row._linkedRequest;
      return (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <FaEdit
            size={20}
            style={{ color: "#5bc0de", cursor: "pointer", transition: "transform 0.2s" }}
            onClick={() => onEdit(row)}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <FaTrash
            size={20}
            style={{ color: "red", cursor: "pointer", transition: "transform 0.2s" }}
            onClick={() => onDelete(row)}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          {linkedRequest && (
            <FaClipboardList
              size={20}
              title="View linked rock request"
              style={{ color: "#8a6d00", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => setViewingRequest(linkedRequest)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          )}
        </div>
      );
    }
    return row[key];
  };

  return (
    <>
      <Table
        columns={columns}
        data={filteredRocks}
        renderCell={renderCell}
        enableRowDrag={false}
        stickyHeaderTop={stickyHeaderTop}
      />

      <RockJourneyDialog rockNumber={journeyRock} onClose={() => setJourneyRock(null)} />

      <RockRequestInfoDialog
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        request={viewingRequest}
      />
    </>
  );
}
