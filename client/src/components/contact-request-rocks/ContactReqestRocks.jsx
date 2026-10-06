// components/contact-request-rocks/ContactReqestRocks.jsx
import { useState } from "react";
import axios from "axios";
import styles from "./ContactReqestRocks.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Today's date in the visitor's own time zone, as the YYYY-MM-DD a date input uses.
const localToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ContactRequestRocks = ({ onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [rocksRequested, setRocksRequested] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [noRush, setNoRush] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);

  const rocksCount = Number(rocksRequested);
  const fieldErrors = {
    name: !name.trim() ? "Name is required." : "",
    email: !email.trim()
      ? "Email address is required."
      : !EMAIL_PATTERN.test(email.trim())
        ? "Please enter a valid email address."
        : "",
    address: !address.trim() ? "Address is required." : "",
    rocks:
      rocksRequested === ""
        ? "Number of rocks is required."
        : !Number.isInteger(rocksCount) || rocksCount < 1
          ? "Please enter at least 1 rock."
          : "",
    neededBy: noRush
      ? ""
      : !neededBy
        ? 'Please choose a date, or check "No rush".'
        : neededBy < localToday()
          ? "Please choose today or a later date."
          : "",
  };
  // Errors only show after the first Submit press, then update live as fields are fixed.
  const shownError = (field) => (attempted ? fieldErrors[field] : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setAttempted(true);
    if (Object.values(fieldErrors).some(Boolean)) return;

    setSubmitting(true);
    setError("");
    try {
      await axios.post("/api/rock-requests", {
        name,
        email,
        address,
        rocksRequested: Number(rocksRequested),
        neededBy: noRush ? null : neededBy,
        noRush,
        message,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Rock request submit failed:", err);
      setError(
        "Sorry, something went wrong. Please email us instead: AidensRocks.AAA@gmail.com"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <h2>Request A Rock</h2>

        {submitted ? (
          <>
            <p>
              Thank you! We&apos;ve received your request and will be in touch about
              sending your rocks soon.
            </p>
            <button onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <p className={styles.callout}>
              If you would like some rocks sent to you for your upcoming trips, or
              if you have a special location in mind where you’d like to place an
              Aiden Rock, please let us know how many you would like and where to
              send them. We will send them anywhere in the world for free; we just
              want to see them take off and travel!
            </p>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <label htmlFor="request-name" className={styles.label}>
                Name
              </label>
              <input
                id="request-name"
                type="text"
                className={`${styles.input} ${shownError("name") ? styles.invalid : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!shownError("name")}
                aria-describedby={shownError("name") ? "request-name-error" : undefined}
              />
              {shownError("name") && (
                <div id="request-name-error" className={styles.fieldError}>
                  {shownError("name")}
                </div>
              )}

              <label htmlFor="request-email" className={styles.label}>
                Email Address
              </label>
              <input
                id="request-email"
                type="email"
                className={`${styles.input} ${shownError("email") ? styles.invalid : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!shownError("email")}
                aria-describedby={shownError("email") ? "request-email-error" : undefined}
              />
              {shownError("email") && (
                <div id="request-email-error" className={styles.fieldError}>
                  {shownError("email")}
                </div>
              )}

              <label htmlFor="request-address" className={styles.label}>
                Address
              </label>
              <textarea
                id="request-address"
                className={`${styles.textarea} ${shownError("address") ? styles.invalid : ""}`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Street, City, State/Province, Postal Code, Country"
                aria-invalid={!!shownError("address")}
                aria-describedby={shownError("address") ? "request-address-error" : undefined}
              />
              {shownError("address") && (
                <div id="request-address-error" className={styles.fieldError}>
                  {shownError("address")}
                </div>
              )}

              <label htmlFor="request-rocks" className={styles.label}>
                # Rocks
              </label>
              <input
                id="request-rocks"
                type="number"
                min="1"
                step="1"
                className={`${styles.input} ${shownError("rocks") ? styles.invalid : ""}`}
                value={rocksRequested}
                onChange={(e) => setRocksRequested(e.target.value)}
                aria-invalid={!!shownError("rocks")}
                aria-describedby={shownError("rocks") ? "request-rocks-error" : undefined}
              />
              {shownError("rocks") && (
                <div id="request-rocks-error" className={styles.fieldError}>
                  {shownError("rocks")}
                </div>
              )}

              <label htmlFor="request-needed-by" className={styles.label}>
                Need Rocks By
              </label>
              <div className={styles.neededByRow}>
                <input
                  id="request-needed-by"
                  type="date"
                  min={localToday()}
                  className={`${styles.input} ${shownError("neededBy") ? styles.invalid : ""}`}
                  value={noRush ? "" : neededBy}
                  onChange={(e) => setNeededBy(e.target.value)}
                  disabled={noRush}
                  aria-invalid={!!shownError("neededBy")}
                  aria-describedby={shownError("neededBy") ? "request-needed-by-error" : undefined}
                />
                <label htmlFor="request-no-rush" className={styles.checkboxLabel}>
                  <input
                    id="request-no-rush"
                    type="checkbox"
                    checked={noRush}
                    onChange={(e) => setNoRush(e.target.checked)}
                  />
                  No rush
                </label>
              </div>
              {shownError("neededBy") && (
                <div id="request-needed-by-error" className={styles.fieldError}>
                  {shownError("neededBy")}
                </div>
              )}

              <label htmlFor="request-message" className={styles.label}>
                Message <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="request-message"
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Anything else you'd like us to know?"
              />

              <div className={styles.buttonRow}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "Submit"}
                </button>
                <button type="button" onClick={onClose} disabled={submitting}>
                  Close
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactRequestRocks;
