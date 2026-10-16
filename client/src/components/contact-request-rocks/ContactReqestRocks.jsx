// components/contact-request-rocks/ContactReqestRocks.jsx
import { useState } from "react";
import axios from "axios";
import useFormFunnel from "../../utils/useFormFunnel";
import useShownError from "../../utils/useShownError";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { US_STATES } from "../../utils/usStates";
import styles from "./ContactReqestRocks.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

// Today's date in the visitor's own time zone, as the YYYY-MM-DD a date input uses.
const localToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ContactRequestRocks = ({ onClose, source = null }) => {
  // Site Tracking: opened -> started -> submitted (or abandoned).
  const funnel = useFormFunnel("request_a_rock", source);
  const { contactEmail } = useSiteSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [usAddress, setUsAddress] = useState(true);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [usState, setUsState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [rocksRequested, setRocksRequested] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [noRush, setNoRush] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  useShownError("rock_request", error);
  const [attempted, setAttempted] = useState(false);

  const rocksCount = Number(rocksRequested);
  const fieldErrors = {
    name: !name.trim() ? "Name is required." : "",
    email: !email.trim()
      ? "Email address is required."
      : !EMAIL_PATTERN.test(email.trim())
        ? "Please enter a valid email address."
        : "",
    // Only the fields for the current "US address" mode are checked.
    street: usAddress && !street.trim() ? "Street is required." : "",
    city: usAddress && !city.trim() ? "City is required." : "",
    usState: usAddress && !usState ? "State is required." : "",
    postalCode: !usAddress
      ? ""
      : !postalCode.trim()
        ? "ZIP code is required."
        : !ZIP_PATTERN.test(postalCode.trim())
          ? "Please enter a ZIP code like 12345 or 12345-6789."
          : "",
    address: !usAddress && !address.trim() ? "Address is required." : "",
    country: !usAddress && !country.trim() ? "Country is required." : "",
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
    if (Object.values(fieldErrors).some(Boolean)) {
      // Which fields were missing / invalid -- never what was typed.
      const fields = Object.keys(fieldErrors).filter((k) => fieldErrors[k]);
      funnel.failed(`validation:${fields.join(",")}`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await axios.post("/api/rock-requests", {
        name,
        email,
        usAddress,
        // Country is filled in as USA by the server for a US address.
        ...(usAddress ? { street, city, state: usState, postalCode } : { address, country }),
        rocksRequested: Number(rocksRequested),
        neededBy: noRush ? null : neededBy,
        noRush,
        message,
      });
      setSubmitted(true);
      funnel.submitted({ rocks: Number(rocksRequested) || null });
    } catch (err) {
      console.error("Rock request submit failed:", err);
      funnel.failed(err.response ? `server_${err.response.status}` : "network");
      setError(
        contactEmail
          ? `Sorry, something went wrong. Please email us instead: ${contactEmail}`
          : "Sorry, something went wrong. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.popupOverlay} onChangeCapture={funnel.onChangeCapture}>
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

              <div className={styles.addressHeader}>
                <span className={styles.label}>Address</span>
                <label htmlFor="request-us-address" className={styles.checkboxLabel}>
                  <input
                    id="request-us-address"
                    type="checkbox"
                    checked={usAddress}
                    onChange={(e) => setUsAddress(e.target.checked)}
                  />
                  US address
                </label>
              </div>

              {usAddress ? (
                <>
                  <label htmlFor="request-street" className={styles.subLabel}>
                    Street
                  </label>
                  <input
                    id="request-street"
                    type="text"
                    autoComplete="street-address"
                    className={`${styles.input} ${shownError("street") ? styles.invalid : ""}`}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main St, Apt 4"
                    aria-invalid={!!shownError("street")}
                    aria-describedby={shownError("street") ? "request-street-error" : undefined}
                  />
                  {shownError("street") && (
                    <div id="request-street-error" className={styles.fieldError}>
                      {shownError("street")}
                    </div>
                  )}

                  <label htmlFor="request-city" className={styles.subLabel}>
                    City
                  </label>
                  <input
                    id="request-city"
                    type="text"
                    autoComplete="address-level2"
                    className={`${styles.input} ${shownError("city") ? styles.invalid : ""}`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-invalid={!!shownError("city")}
                    aria-describedby={shownError("city") ? "request-city-error" : undefined}
                  />
                  {shownError("city") && (
                    <div id="request-city-error" className={styles.fieldError}>
                      {shownError("city")}
                    </div>
                  )}

                  <div className={styles.stateZipRow}>
                    <div className={styles.stateZipField}>
                      <label htmlFor="request-state" className={styles.subLabel}>
                        State
                      </label>
                      <select
                        id="request-state"
                        autoComplete="address-level1"
                        className={`${styles.input} ${shownError("usState") ? styles.invalid : ""}`}
                        value={usState}
                        onChange={(e) => setUsState(e.target.value)}
                        aria-invalid={!!shownError("usState")}
                        aria-describedby={shownError("usState") ? "request-state-error" : undefined}
                      >
                        <option value="">Select...</option>
                        {US_STATES.map(({ code, name: stateName }) => (
                          <option key={code} value={code}>
                            {stateName}
                          </option>
                        ))}
                      </select>
                      {shownError("usState") && (
                        <div id="request-state-error" className={styles.fieldError}>
                          {shownError("usState")}
                        </div>
                      )}
                    </div>
                    <div className={styles.stateZipField}>
                      <label htmlFor="request-postal-code" className={styles.subLabel}>
                        ZIP Code
                      </label>
                      <input
                        id="request-postal-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={10}
                        placeholder="12345 or 12345-6789"
                        className={`${styles.input} ${shownError("postalCode") ? styles.invalid : ""}`}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        aria-invalid={!!shownError("postalCode")}
                        aria-describedby={shownError("postalCode") ? "request-postal-code-error" : undefined}
                      />
                      {shownError("postalCode") && (
                        <div id="request-postal-code-error" className={styles.fieldError}>
                          {shownError("postalCode")}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    id="request-address"
                    aria-label="Address"
                    className={`${styles.textarea} ${shownError("address") ? styles.invalid : ""}`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Street, City, State/Province, Postal Code"
                    aria-invalid={!!shownError("address")}
                    aria-describedby={shownError("address") ? "request-address-error" : undefined}
                  />
                  {shownError("address") && (
                    <div id="request-address-error" className={styles.fieldError}>
                      {shownError("address")}
                    </div>
                  )}

                  <label htmlFor="request-country" className={styles.subLabel}>
                    Country
                  </label>
                  <input
                    id="request-country"
                    type="text"
                    autoComplete="country-name"
                    maxLength={100}
                    className={`${styles.input} ${shownError("country") ? styles.invalid : ""}`}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    aria-invalid={!!shownError("country")}
                    aria-describedby={shownError("country") ? "request-country-error" : undefined}
                  />
                  {shownError("country") && (
                    <div id="request-country-error" className={styles.fieldError}>
                      {shownError("country")}
                    </div>
                  )}
                </>
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
