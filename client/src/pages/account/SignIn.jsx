import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../admin/context/AuthContext";
import { useAccountPage } from "../../adminContent/useAccountPage";
import AccountPageHeader from "./AccountPageHeader";
import PasswordInput from "./PasswordInput";
import styles from "./Account.module.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signInPage = useAccountPage("sign-in");
  const createPage = useAccountPage("create-account");
  const resetPage = useAccountPage("reset-password");
  // Only show these links once their on/off setting has loaded — otherwise
  // they flash on screen before disappearing when turned off.
  const showReset = !resetPage.loading && resetPage.visible;
  const showCreate = !createPage.loading && createPage.visible;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      // Close the phone keyboard and start the next page at the top — a
      // programmatic navigate keeps this page's scroll position (often
      // scrolled down to the form on a phone), unlike the navbar links,
      // which reset it themselves.
      document.activeElement?.blur();
      navigate(location.state?.from || "/", { replace: true });
      window.scrollTo(0, 0);
      return;
    }
    setError(result.message);
    setErrorCode(result.code || null);
  };

  const resendVerification = async () => {
    try {
      const { data } = await axios.post("/api/auth/resend-verification", { email });
      setError(null);
      setErrorCode(null);
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't resend the email. Please try again.");
    }
  };

  // Same as Create Account / Reset Password: wait for the editable title
  // so the built-in one doesn't flash first.
  if (signInPage.loading) return <div className={styles.container} />;

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <AccountPageHeader page={signInPage} />
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign In"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
        {errorCode === "UNVERIFIED" && (
          <p className={styles.subtitle}>
            <button type="button" className={styles.linkButton} onClick={resendVerification}>
              Resend the verification email
            </button>
          </p>
        )}
        {notice && <p className={styles.success}>{notice}</p>}

        {/* Each link only shows while its page is turned on in Page Details. */}
        {(showReset || showCreate) && (
          <div className={styles.links}>
            {showReset && <Link to="/forgot-password">Forgot your password?</Link>}
            {showCreate && <Link to="/sign-up">Create an account</Link>}
          </div>
        )}
      </form>
    </div>
  );
};

export default SignIn;
