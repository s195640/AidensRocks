import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./Account.module.css";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "verifying" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This verification link is missing its token."
  );
  // Tokens are single-use: guard against StrictMode's double effect run
  // consuming it once and then reporting the second call as "expired".
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    axios
      .post("/api/auth/verify-email", { token })
      .then(({ data }) => {
        setStatus("done");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.error || "We couldn't verify your email. Please try again."
        );
      });
  }, [token]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Email Verification</h2>
        {status === "verifying" && <p className={styles.subtitle}>Verifying…</p>}
        {status === "done" && <p className={styles.success}>{message}</p>}
        {status === "error" && <p className={styles.error}>{message}</p>}
        <div className={styles.links}>
          <Link to="/login">Go to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
