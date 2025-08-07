import styles from "./Job.module.css";

const Job = ({ title, children }) => {
  return (
    <div className={styles.jobBox}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};

export default Job;
