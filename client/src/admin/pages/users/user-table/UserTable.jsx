import Table from "../../../../components/simple-components/table/Table";
import { FaEdit, FaTrash } from "react-icons/fa";
import styles from "./UserTable.module.css";

export default function UserTable({ users, onEdit, onDelete }) {
  const rows = users.map((u) => ({
    ...u,
    _createTs: u.create_dt ? new Date(u.create_dt).getTime() : 0,
  }));

  const columns = [
    { key: "ra_key", label: "RA_KEY", sortable: true, defaultWidth: 80 },
    { key: "display_name", label: "Display Name", sortable: true },
    { key: "relation", label: "Relation", sortable: true },
    {
      key: "create_dt",
      label: "Created",
      sortable: true,
      defaultWidth: 160,
      sortValue: (row) => row._createTs,
    },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 120 },
  ];

  const renderCell = (row, key) => {
    switch (key) {
      case "create_dt":
        return row.create_dt
          ? new Date(row.create_dt).toLocaleDateString()
          : "";
      case "actions":
        return (
          <div className={styles.actionsCol}>
            <FaEdit
              className={`${styles.icon} ${styles.editIcon}`}
              onClick={() => onEdit(row)}
              title="Edit"
            />
            <FaTrash
              className={`${styles.icon} ${styles.deleteIcon}`}
              onClick={() => onDelete(row.ra_key)}
              title="Delete"
            />
          </div>
        );
      default:
        return row[key];
    }
  };

  return <Table columns={columns} data={rows} renderCell={renderCell} />;
}
