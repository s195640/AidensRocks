import PasswordInput from "./PasswordInput";
import { PASSWORD_RULES } from "./passwordRules";
import styles from "./Account.module.css";

// New password + confirm, with a live checklist of the password rules.
const PasswordFields = ({ password, setPassword, confirm, setConfirm }) => (
  <>
    <PasswordInput
      autoComplete="new-password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <ul className={styles.rules}>
      {PASSWORD_RULES.map((r) => (
        <li key={r.label} className={r.test(password) ? styles.met : ""}>
          {r.label}
        </li>
      ))}
    </ul>
    <PasswordInput
      placeholder="Confirm password"
      autoComplete="new-password"
      value={confirm}
      onChange={(e) => setConfirm(e.target.value)}
    />
  </>
);

export default PasswordFields;
