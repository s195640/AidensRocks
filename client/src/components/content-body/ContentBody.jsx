import styles from "./ContentBody.module.css";

const ContentBody = ({ children }) => {
  return (
    <div className="additional-content">
      <div className={styles.contentBody}>
        <div className={styles.contentBodyInner}>{children}</div>
      </div>
    </div>
  );
};

export default ContentBody;
