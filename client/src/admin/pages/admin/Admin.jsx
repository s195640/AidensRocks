// src/pages/Admin.jsx
import { useAuth } from "../../context/AuthContext";

const Admin = () => {
  const { logout } = useAuth();

  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default Admin;
