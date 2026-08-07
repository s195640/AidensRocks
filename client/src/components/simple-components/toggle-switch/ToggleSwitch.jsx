import styles from "./ToggleSwitch.module.css";

// A simple on/off pill switch. `checked` drives the on/off state, `onChange`
// fires on click. `disabled` renders it locked (dimmed, non-interactive) —
// pair with `title` to explain why via a tooltip.
const ToggleSwitch = ({ checked, onChange, disabled = false, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    title={title}
    className={`${styles.switch} ${checked ? styles.on : ""} ${disabled ? styles.disabled : ""}`}
    onClick={() => onChange?.()}
  >
    <span className={styles.thumb} />
  </button>
);

export default ToggleSwitch;
