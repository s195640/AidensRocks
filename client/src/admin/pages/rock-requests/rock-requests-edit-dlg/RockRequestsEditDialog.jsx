import { useEffect, useState } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import authFetch from "../../../utils/authFetch";
import SendRockRequestEmailDialog from "./SendRockRequestEmailDialog";
import RockPopupByNumber from "../../../../components/rock-popup/RockPopupByNumber";
import styles from "./RockRequestsEditDialog.module.css";

const buildFormData = (request) => ({
  name: request.name || "",
  email: request.email || "",
  address: request.address || "",
  rocks_requested: request.rocks_requested ?? "",
  shipped: request.shipped || false,
  tracking_number: request.tracking_number || "",
  comments: request.comments || "",
  rock_numbers: request.rock_numbers || "",
});

// Splits a "343, 234, 54" style CSV into rock-number tokens, checking each
// against the fetched catalog list. Returns per-number error strings; an
// empty array means the field is clean. UX convenience only -- the server
// re-validates authoritatively on save.
const validateRockNumbers = (raw, rocks, requestKey) => {
  const tokens = (raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const errors = [];
  const seen = new Set();

  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      errors.push(`"${token}" is not a valid rock number.`);
      continue;
    }
    if (seen.has(token)) {
      errors.push(`Rock number ${token} is listed more than once.`);
      continue;
    }
    seen.add(token);

    const catalogRock = rocks.find((r) => String(r.rock_number) === token);
    if (!catalogRock) {
      errors.push(`Rock number ${token} does not exist in the catalog.`);
    } else if (
      catalogRock.rq_key != null &&
      String(catalogRock.rq_key) !== String(requestKey)
    ) {
      errors.push(`Rock number ${token} is already assigned to another request.`);
    }
  }

  return errors;
};

// Loose equality over the form's fields, coercing everything to string so a
// number-vs-string type mismatch (e.g. an untouched `rocks_requested` from
// the initial fetch vs. the string a number input always produces once
// touched) never reads as a false "unsaved changes".
const formsEqual = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (String(a[key] ?? "") !== String(b[key] ?? "")) return false;
  }
  return true;
};

// Splits a "343, 234, 54" style CSV into clean trimmed tokens for rendering
// as clickable links (RockPopupByNumber below), independent of validation.
const parseRockNumberTokens = (raw) =>
  (raw || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

const RockRequestsEditDialog = ({ request, rocks, isOpen, onClose, onSave, onEmailSent }) => {
  const [formData, setFormData] = useState(() => buildFormData(request));
  // The last-persisted values -- compared against formData to gate "Send
  // Email" on having no unsaved changes. Updated on successful save, and
  // whenever a send-email response changes `shipped` outside the normal
  // save flow (see SendRockRequestEmailDialog's onSent below).
  const [savedFormData, setSavedFormData] = useState(() => buildFormData(request));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");
  const [rockNumberErrors, setRockNumberErrors] = useState([]);
  const [emailDt, setEmailDt] = useState(request.email_dt || null);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [viewingRockNumber, setViewingRockNumber] = useState(null);

  const isDirty = !formsEqual(formData, savedFormData);

  useEffect(() => {
    const initial = buildFormData(request);
    setFormData(initial);
    setSavedFormData(initial);
    setError("");
    setRockNumberErrors([]);
    setEmailDt(request.email_dt || null);
  }, [request]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setError("");

    const numberErrors = validateRockNumbers(formData.rock_numbers, rocks, request.rq_key);
    if (numberErrors.length > 0) {
      setRockNumberErrors(numberErrors);
      return;
    }
    setRockNumberErrors([]);

    setSaving(true);
    try {
      const res = await authFetch(`/api/rock-requests/${request.rq_key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.details) {
          setRockNumberErrors(body.details.map((d) => `Rock ${d.rock_number}: ${d.reason}`));
        }
        throw new Error(body.error || "Failed to save request");
      }

      // Save no longer closes the dialog -- stay open so the admin can
      // immediately use Send Email once the form is clean, and only close
      // via Cancel/Escape/the dialog's own close affordances.
      setSavedFormData(formData);
      setJustSaved(true);
      onSave();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rockNumberTokens = parseRockNumberTokens(formData.rock_numbers);

  return (
    <>
      {/* SendRockRequestEmailDialog and RockPopupByNumber are deliberately
          rendered here, as siblings of Dialog, NOT inside its children.
          Dialog.module.css's .dialog has `transform` (its open/close
          animation), and any transform on an ancestor becomes the
          containing block for position:fixed descendants -- a fixed
          overlay nested inside would render clipped/positioned relative to
          this dialog's box instead of the viewport, instead of appearing
          on top of it. */}
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Rock Request"
        buttonPanel={
          <>
            {justSaved && <span className={styles.savedIndicator}>Saved</span>}
            {isDirty && <span className={styles.sendEmailHint}>Save required to send email</span>}
            <button
              onClick={() => setShowSendEmail(true)}
              disabled={saving || isDirty}
              title={isDirty ? "Save required to send email" : undefined}
              style={isDirty ? { background: "#ccc", color: "#888", cursor: "not-allowed" } : undefined}
            >
              Send Email
            </button>
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </>
        }
      >
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form className={styles.dialogForm} onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            required
          />

          <label htmlFor="rocks_requested"># Rocks Requested</label>
          <input
            type="number"
            id="rocks_requested"
            name="rocks_requested"
            min="1"
            value={formData.rocks_requested}
            onChange={handleChange}
            required
          />

          <label htmlFor="shipped" className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="shipped"
              name="shipped"
              checked={formData.shipped}
              onChange={handleChange}
            />
            Shipped
          </label>

          <label htmlFor="tracking_number">Tracking Number</label>
          <input
            type="text"
            id="tracking_number"
            name="tracking_number"
            value={formData.tracking_number}
            onChange={handleChange}
          />

          <label htmlFor="rock_numbers">Rock Numbers</label>
          <textarea
            id="rock_numbers"
            name="rock_numbers"
            value={formData.rock_numbers}
            onChange={handleChange}
            rows={2}
            placeholder="e.g. 343, 234, 54, 3245, 4354"
          />
          {rockNumberErrors.length > 0 && (
            <div className={styles.errorMessage}>
              {rockNumberErrors.map((msg) => (
                <div key={msg}>{msg}</div>
              ))}
            </div>
          )}
          {rockNumberTokens.length > 0 && (
            <div className={styles.rockNumberList}>
              {rockNumberTokens.map((num, idx) => (
                <span key={`${num}-${idx}`}>
                  <span
                    className={styles.rockNumberLink}
                    onClick={() => setViewingRockNumber(num)}
                  >
                    {num}
                  </span>
                  {idx < rockNumberTokens.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            rows={3}
          />

          <label>Message (from requester)</label>
          <div className={styles.readOnlyField}>
            {request.message || "No message provided."}
          </div>

          <label>Last Emailed</label>
          <div className={styles.readOnlyField}>
            {emailDt ? emailDt.replace("T", " ").slice(0, 16) : "Never"}
          </div>
        </form>
      </Dialog>

      <SendRockRequestEmailDialog
        request={{
          ...request,
          shipped: formData.shipped,
          tracking_number: formData.tracking_number,
          rock_numbers: formData.rock_numbers,
          email_dt: emailDt,
        }}
        isOpen={showSendEmail}
        onClose={() => setShowSendEmail(false)}
        onSent={(data) => {
          setEmailDt(data.email_dt);
          if (data.shipped !== undefined) {
            // Persisted directly by the send-email endpoint, not through
            // Save -- update both copies so this doesn't read as an
            // unsaved change afterward.
            setFormData((prev) => ({ ...prev, shipped: data.shipped }));
            setSavedFormData((prev) => ({ ...prev, shipped: data.shipped }));
          }
          onEmailSent();
        }}
      />

      <RockPopupByNumber
        rockNumber={viewingRockNumber}
        onClose={() => setViewingRockNumber(null)}
      />
    </>
  );
};

export default RockRequestsEditDialog;
