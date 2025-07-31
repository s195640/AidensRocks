import axios from "axios";
import { useEffect, useState } from "react";
import "./Users.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

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
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingUser(null);
    setDisplayName("");
    setDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.ra_key}`, {
          display_name: displayName,
        });
      } else {
        await axios.post("/api/users", {
          display_name: displayName,
        });
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

  return (
    <div className="users-container">
      <h1>Users Dashboard</h1>
      <button className="new-user-button" onClick={() => openDialog()}>
        + New User
      </button>
      <table className="users-table">
        <thead>
          <tr>
            <th>RA_KEY</th>
            <th>Display Name</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.ra_key}>
              <td>{user.ra_key}</td>
              <td>{user.display_name}</td>
              <td>{new Date(user.create_dt).toLocaleString()}</td>
              <td>{new Date(user.update_dt).toLocaleString()}</td>
              <td>
                <button onClick={() => openDialog(user)}>Edit</button>
                <button onClick={() => handleDelete(user.ra_key)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dialogOpen && (
        <div className="user-dialog">
          <div className="user-dialog-content">
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
            <div className="dialog-buttons">
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
