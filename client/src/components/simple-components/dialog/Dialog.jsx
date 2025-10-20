import { useEffect, useState } from "react";
import styles from "./Dialog.module.css";

export default function Dialog({
  isOpen,
  onClose,
  title,
  buttonPanel,
  children,
  closeOnOutsideClick = false,
}) {
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setVisible(true);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = isOpen ? "hidden" : "auto";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setVisible(false);
  };

  const handleOverlayClick = () => {
    if (closeOnOutsideClick && onClose) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.show : styles.hide}`}
      onClick={handleOverlayClick}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`${styles.dialog} ${isOpen ? styles.show : styles.hide}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || buttonPanel) && (
          <div className={styles.dialogHeader}>
            <h3 className={styles.dialogTitle}>{title}</h3>
            <div className={styles.dialogButtons}>{buttonPanel}</div>
          </div>
        )}
        <div className={styles.dialogContent}>{children}</div>
      </div>
    </div>
  );
}
