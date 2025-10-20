import styles from "./AdminContainer.module.css";
const AdminContainer = ({ children }) => {
  return (
    <div className={styles.adminContainer}>
      {children}
    </div>
  )
}

export default AdminContainer;