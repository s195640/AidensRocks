import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAccountPage } from "../../adminContent/useAccountPage";
import AccountPageHeader from "./AccountPageHeader";
import styles from "./Account.module.css";

const ForgotPassword = () => {
  const page = useAccountPage("reset-password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post("/api/auth/forgot-password", { email });
      setDone(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (page.loading) return <div className={styles.container} />;

  // Turned off in Page Details → Account Pages.
  if (!page.visible) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>{page.title}</h2>
          <p className={styles.subtitle}>
            Password reset isn&apos;t available right now. Please contact us for help with
            your account.
          </p>
          <div className={styles.links}>
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        {done ? (
          <>
            <h2>{page.title}</h2>
            <p className={styles.success}>{done}</p>
          </>
        ) : (
          <>
            <AccountPageHeader page={page} />
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
        <div className={styles.links}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
