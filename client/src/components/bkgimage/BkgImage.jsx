import styles from "./BkgImage.module.css";

const BkgImage = ({ backgroundImage, children, scrollTargetSelector }) => {
  const scrollToTarget = () => {
    const targetSection = document.querySelector(scrollTargetSelector);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className={styles.section}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.content}>{children}</div>
      <span
        className={styles.scrollIconContainer}
        onClick={scrollToTarget}
        aria-label="Scroll to content"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && scrollToTarget()}
      >
        <svg
          className={styles.scrollIcon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z"
          ></path>
        </svg>
      </span>
    </div>
  );
};

export default BkgImage;
