// src/pages/Admin.jsx
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
        <div className={styles.box}>Box 2</div>

      </div>
    </div>
  );
};

export default Admin;
