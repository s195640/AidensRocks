import React from "react";
import Table from "../../../../components/simple-components/table/Table";
import { FaEdit, FaTrash } from "react-icons/fa";
import styles from "./RockTable.module.css";

export default function RockTable({ rocks, onEdit, onDelete, openImageDialog }) {
  const columns = [
    { key: "rock_number", label: "Rock", defaultWidth: 80, sortable: true, },
    { key: "artists", label: "Artists", defaultWidth: 120, sortable: true, },
    { key: "comment", label: "Comment", sortable: true, },
    { key: "create_dt", label: "Created", defaultWidth: 120, sortable: true },
    { key: "image", label: "Image", defaultWidth: 75 },
    { key: "actions", label: "Actions", defaultWidth: 85 },
  ];

  const renderCell = (row, key) => {
    if (key === "artists") return row.artists.map((a) => a.display_name).join(", ");
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
    if (key === "actions")
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
        </div>
      );
    return row[key];
  };

  return <Table columns={columns} data={rocks} renderCell={renderCell} enableRowDrag={false} />;
}
