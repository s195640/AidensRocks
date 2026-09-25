import { useMemo, useState } from "react";
import Table from "../../../../components/simple-components/table/Table";
import RockRequestInfoDialog from "../rock-request-info-dlg/RockRequestInfoDialog";
import { FaEdit, FaTrash, FaClipboardList } from "react-icons/fa";
import styles from "./RockTable.module.css";

export default function RockTable({ rocks, onEdit, onDelete, openImageDialog, requests }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingRequest, setViewingRequest] = useState(null);

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
    if (!term) return _data;
    return _data.filter((row) => {
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
  }, [_data, searchTerm]);

  const columns = [
    { key: "rock_number", label: "Rock", defaultWidth: 80, sortable: true, },
    { key: "artists", label: "Artists", defaultWidth: 120, sortable: true, },
    { key: "comment", label: "Comment", sortable: true, },
    {
      key: "request_name",
      label: "Request Name",
      defaultWidth: 120,
      sortable: true,
      sortValue: (row) => row._requestName,
    },
    {
      key: "request_email",
      label: "Request Email",
      defaultWidth: 140,
      sortable: true,
      sortValue: (row) => row._requestEmail,
    },
    {
      key: "request_address",
      label: "Request Address",
      defaultWidth: 160,
      sortable: true,
      sortValue: (row) => row._requestAddress,
    },
    { key: "create_dt", label: "Created", defaultWidth: 120, sortable: true },
    { key: "image", label: "Image", defaultWidth: 75 },
    { key: "actions", label: "Actions", defaultWidth: 85 },
  ];

  const renderCell = (row, key) => {
    if (key === "artists") return row.artists.map((a) => a.display_name).join(", ");
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
      <div className={styles.searchRow}>
        <input
          type="text"
          placeholder="Search rock #, artists, comment, request name/email/address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <Table columns={columns} data={filteredRocks} renderCell={renderCell} enableRowDrag={false} />

      <RockRequestInfoDialog
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        request={viewingRequest}
      />
    </>
  );
}
