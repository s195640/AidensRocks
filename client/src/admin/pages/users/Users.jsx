import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./Users.module.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [relation, setRelation] = useState("");
  const [dob, setDob] = useState("");

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
    setDisplayName(user ? user.display_name : "");
    setRelation(user ? user.relation || "" : "");
    setDob(user ? user.dob ? user.dob.split("T")[0] : "" : "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingUser(null);
    setDisplayName("");
    setRelation("");
    setDob("");
    setDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      const payload = { display_name: displayName, relation, dob };
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.ra_key}`, payload);
      } else {
        await axios.post("/api/users", payload);
      }
      closeDialog();
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleDelete = async (ra_key) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`/api/users/${ra_key}`);
      setUsers((prev) => prev.filter((u) => u.ra_key !== ra_key));
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "dob" || sortConfig.key === "create_dt") {
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

  // Helper to calculate age from dob
  const calculateAge = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getArrow = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Users Dashboard</h1>
        <div className={styles.actions}>
          <button onClick={() => openDialog()}>+ New User</button>
        </div>
      </div>

      <table className={styles.usersTable}>
        <thead>
          <tr>
            <th onClick={() => requestSort("ra_key")}>RA_KEY {getArrow("ra_key")}</th>
            <th onClick={() => requestSort("display_name")}>Display Name {getArrow("display_name")}</th>
            <th onClick={() => requestSort("relation")}>Relation {getArrow("relation")}</th>
            <th onClick={() => requestSort("dob")}>DOB {getArrow("dob")}</th>
            <th onClick={() => requestSort("dob")}>Age {getArrow("dob")}</th>
            <th onClick={() => requestSort("create_dt")}>Created {getArrow("create_dt")}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => (
            <tr key={user.ra_key}>
              <td>{user.ra_key}</td>
              <td>{user.display_name}</td>
              <td>{user.relation || ""}</td>
              <td>
                {user.dob
                  ? `${user.dob.slice(5, 7)}/${user.dob.slice(8, 10)}/${user.dob.slice(0, 4)}`
                  : ""}
              </td>
              <td>{calculateAge(user.dob)}</td>
              <td>{new Date(user.create_dt).toLocaleString()}</td>
              <td className={styles.actionsCol}>
                <button onClick={() => openDialog(user)}>Edit</button>
                <button onClick={() => handleDelete(user.ra_key)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dialogOpen && (
        <div className={styles.userDialog}>
          <div className={styles.userDialogContent}>
            <h2>{editingUser ? "Edit User" : "Create User"}</h2>
            {editingUser && <p>RA_KEY: {editingUser.ra_key}</p>}
            <label>
              Display Name:
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label>
              Relation:
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
              />
            </label>
            <label>
              Date of Birth:
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </label>
            <div className={styles.dialogButtons}>
              <button onClick={handleSave}>Save</button>
              <button onClick={closeDialog}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
