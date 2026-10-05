import { useEffect, useState } from "react";
import styles from "./Dialog.module.css";

export default function Dialog({
  isOpen,
  onClose,
  title,
  buttonPanel,
  children,
  closeOnOutsideClick = false,
  className,
}) {
  const [visible, setVisible] = useState(isOpen);

  // Escape + the body scroll lock only while open. A closed-but-mounted
  // Dialog (e.g. the footer's lyrics dialog) used to reset
  // body.style.overflow on mount, undoing other scroll locks such as the
  // mobile nav menu's, and answered Escape while invisible.
  useEffect(() => {
    if (!isOpen) return undefined;
    setVisible(true);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
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
        className={`${styles.dialog} ${isOpen ? styles.show : styles.hide} ${className || ""}`}
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
