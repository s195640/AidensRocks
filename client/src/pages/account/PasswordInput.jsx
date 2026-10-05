import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./Account.module.css";

// Password field with an eye button to show/hide what was typed.
const PasswordInput = ({ value, onChange, placeholder = "Password", autoComplete }) => {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className={styles.passwordWrap}>
      <input
        className={`${styles.input} ${styles.passwordInput}`}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        className={styles.eyeButton}
        onClick={() => setVisible((v) => !v)}
        title={label}
        aria-label={label}
        aria-pressed={visible}
      >
        {visible ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
};

export default PasswordInput;
