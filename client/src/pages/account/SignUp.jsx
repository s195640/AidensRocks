import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAccountPage } from "../../adminContent/useAccountPage";
import AccountPageHeader from "./AccountPageHeader";
import PasswordFields from "./PasswordFields";
import { passwordMeetsRules } from "./passwordRules";
import styles from "./Account.module.css";

const SignUp = () => {
  const page = useAccountPage("create-account");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
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
      const { data } = await axios.post("/api/auth/signup", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
      });
      setDone(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Sign up failed. Please try again.");
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
          <p className={styles.subtitle}>New accounts can&apos;t be created right now.</p>
          <div className={styles.links}>
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Check your email</h2>
          <p className={styles.subtitle}>
            We sent a verification link to <strong>{email}</strong>. Open it to finish
            creating your account.
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
        <AccountPageHeader page={page} />
        <div className={styles.nameRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="First name"
            autoComplete="given-name"
            maxLength={100}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Last name"
            autoComplete="family-name"
            maxLength={100}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordFields
          password={password}
          setPassword={setPassword}
          confirm={confirm}
          setConfirm={setConfirm}
        />
        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create Account"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.links}>
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </form>
    </div>
  );
};

export default SignUp;
