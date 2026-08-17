import styles from "./AddBlockButton.module.css";

// "+" affordance for adding a new entry (bottom of the sidebar) or a new
// journal entry (between/after existing ones). No auth check of its own —
// see AdminEditableBlock.jsx's comment: this whole page is PrivateRoute-gated.
export default function AddBlockButton({ label, onClick, className = "" }) {
  return (
    <button type="button" className={`${styles.addButton} ${className}`} onClick={onClick}>
      + {label}
    </button>
  );
}
