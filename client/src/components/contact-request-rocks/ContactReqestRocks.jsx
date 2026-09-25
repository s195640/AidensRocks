// components/contact-request-rocks/ContactReqestRocks.jsx
import { useState } from "react";
import axios from "axios";
import styles from "./ContactReqestRocks.module.css";

const ContactRequestRocks = ({ onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [rocksRequested, setRocksRequested] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isSubmitEnabled =
    name.trim() && email.trim() && address.trim() && Number(rocksRequested) >= 1 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSubmitEnabled) return;

    setSubmitting(true);
    setError("");
    try {
      await axios.post("/api/rock-requests", {
        name,
        email,
        address,
        rocksRequested: Number(rocksRequested),
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

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <label htmlFor="request-name" className={styles.label}>
                Name
              </label>
              <input
                id="request-name"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label htmlFor="request-email" className={styles.label}>
                Email Address
              </label>
              <input
                id="request-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="request-address" className={styles.label}>
                Address
              </label>
              <textarea
                id="request-address"
                className={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Street, City, State/Province, Postal Code, Country"
                required
              />

              <label htmlFor="request-rocks" className={styles.label}>
                # Rocks
              </label>
              <input
                id="request-rocks"
                type="number"
                min="1"
                step="1"
                className={styles.input}
                value={rocksRequested}
                onChange={(e) => setRocksRequested(e.target.value)}
                required
              />

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
                  disabled={!isSubmitEnabled}
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
