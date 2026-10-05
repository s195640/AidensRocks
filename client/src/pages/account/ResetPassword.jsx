import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import PasswordFields from "./PasswordFields";
import { passwordMeetsRules } from "./passwordRules";
import styles from "./Account.module.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordMeetsRules(password)) {
      setError("Your password doesn't meet all of the requirements yet.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post("/api/auth/reset-password", { token, password });
      setDone(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Choose a New Password</h2>
          <p className={styles.error}>This reset link is missing its token.</p>
          <div className={styles.links}>
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2>Choose a New Password</h2>
        {done ? (
          <>
            <p className={styles.success}>{done}</p>
            <div className={styles.links}>
              <Link to="/login">Go to sign in</Link>
            </div>
          </>
        ) : (
          <>
            <PasswordFields
              password={password}
              setPassword={setPassword}
              confirm={confirm}
              setConfirm={setConfirm}
            />
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Set New Password"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.links}>
              <Link to="/forgot-password">Request a new link</Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ResetPassword;
