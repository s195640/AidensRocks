// src/pages/Admin.jsx
import ARDetails from "../../components/ar-details/ARDetails";
import ServerHealth from "../../components/server-health/ServerHealth";
import styles from "./Admin.module.css";

const Admin = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
      </div>
      <div className={styles.content}>
        <ServerHealth />
        <ARDetails />

      </div>
    </div>
  );
};

export default Admin;
