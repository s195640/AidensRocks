import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./Users.module.css";
import UserTable from "./user-table/UserTable";
import UserCreateEditDlg from "./user-create-edit-dlg/UserCreateEditDlg";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "ra_key", direction: "asc" });

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openDialog = (user = null) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingUser(null);
    setDialogOpen(false);
  };

  const handleSave = async (payload) => {
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.ra_key}`, payload);
      } else {
        await axios.post("/api/users", payload);
      }
      closeDialog();
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
      // Rethrown so the dialog stays open and shows why (e.g. a duplicate
      // name on edit, which the server answers with 409).
      throw error;
    }
  };

  const handleDelete = async (ra_key) => {
    if (!window.confirm("Delete this artist?")) return;
    try {
      await axios.delete(`/api/users/${ra_key}`);
      setUsers((prev) => prev.filter((u) => u.ra_key !== ra_key));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert(error.response?.data?.error || "Deleting the artist failed.");
    }
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "create_dt") {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className={styles.container}>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h1>Artists</h1>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.createButton} onClick={() => openDialog()}>
            + New Artist
          </button>
        </div>
      </div>


      <UserTable
        users={sortedUsers}
        sortConfig={sortConfig}
        requestSort={requestSort}
        onEdit={openDialog}
        onDelete={handleDelete}
      />

      <UserCreateEditDlg
        user={editingUser}
        users={users}
        onSave={handleSave}
        onClose={closeDialog}
        isOpen={dialogOpen}
      />
    </div>
  );
};

export default Users;
