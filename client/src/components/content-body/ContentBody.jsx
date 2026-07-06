import styles from "./ContentBody.module.css";

const ContentBody = ({ children, fullHeight = true }) => {
  return (
    <div className="additional-content">
      <div
        className={styles.contentBody}
        style={fullHeight ? undefined : { minHeight: "auto" }}
      >
        <div className={styles.contentBodyInner}>{children}</div>
      </div>
    </div>
  );
};

export default ContentBody;
