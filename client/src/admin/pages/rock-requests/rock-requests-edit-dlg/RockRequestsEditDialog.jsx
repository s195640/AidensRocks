import { useEffect, useState } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import authFetch from "../../../utils/authFetch";
import SendRockRequestEmailDialog from "./SendRockRequestEmailDialog";
import RockPopupByNumber from "../../../../components/rock-popup/RockPopupByNumber";
import styles from "./RockRequestsEditDialog.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `request` is null when creating -- every field starts blank.
const buildFormData = (request) => ({
  name: request?.name || "",
  email: request?.email || "",
  address: request?.address || "",
  rocks_requested: request?.rocks_requested ?? "",
  needed_by: request?.needed_by || "",
  no_rush: request?.no_rush || false,
  message: request?.message || "",
  shipped: request?.shipped || false,
  tracking_number: request?.tracking_number || "",
  comments: request?.comments || "",
  rock_numbers: request?.rock_numbers || "",
});

// Admin only has to give a name and a number of rocks; email is checked
// only if one was typed. The server re-validates the same rules.
const validateFields = (formData) => {
  const rocks = Number(formData.rocks_requested);
  const email = formData.email.trim();
  return {
    name: !formData.name.trim() ? "Name is required." : "",
    email: email && !EMAIL_PATTERN.test(email) ? "Please enter a valid email address." : "",
    rocks_requested:
      String(formData.rocks_requested).trim() === ""
        ? "Number of rocks is required."
        : !Number.isInteger(rocks) || rocks < 1
          ? "Please enter at least 1 rock."
          : "",
  };
};

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

// One dialog for both Create (request = null) and Edit. Create posts to
// admin-create and hands off to onCreated; Edit saves in place and stays
// open so Send Email can follow.
const RockRequestsEditDialog = ({
  request,
  rocks,
  isOpen,
  onClose,
  onSave,
  onCreated,
  onEmailSent,
}) => {
  const isCreate = !request;
  const [formData, setFormData] = useState(() => buildFormData(request));
  // The last-persisted values -- compared against formData to gate "Send
  // Email" on having no unsaved changes. Updated on successful save, and
  // whenever a send-email response changes `shipped` outside the normal
  // save flow (see SendRockRequestEmailDialog's onSent below).
  const [savedFormData, setSavedFormData] = useState(() => buildFormData(request));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [rockNumberErrors, setRockNumberErrors] = useState([]);
  const [emailDt, setEmailDt] = useState(request?.email_dt || null);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [viewingRockNumber, setViewingRockNumber] = useState(null);

  const isDirty = !formsEqual(formData, savedFormData);
  const hasSavedEmail = !!savedFormData.email.trim();
  const sendEmailBlocker = isDirty
    ? "Save required to send email"
    : !hasSavedEmail
      ? "Add an email address to send email"
      : "";

  const fieldErrors = validateFields(formData);
  // Errors only show after the first Save/Create press, then update live as fields are fixed.
  const shownError = (field) => (attempted ? fieldErrors[field] : "");
  const fieldClass = (field) => (shownError(field) ? styles.invalid : undefined);
  const errorText = (field) =>
    shownError(field) && <div className={styles.fieldError}>{shownError(field)}</div>;

  useEffect(() => {
    const initial = buildFormData(request);
    setFormData(initial);
    setSavedFormData(initial);
    setError("");
    setAttempted(false);
    setRockNumberErrors([]);
    setEmailDt(request?.email_dt || null);
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
    if (saving) return;
    setError("");
    setAttempted(true);

    const numberErrors = validateRockNumbers(formData.rock_numbers, rocks, request?.rq_key);
    setRockNumberErrors(numberErrors);
    if (Object.values(fieldErrors).some(Boolean) || numberErrors.length > 0) return;

    setSaving(true);
    try {
      const res = await authFetch(
        isCreate ? "/api/rock-requests/admin-create" : `/api/rock-requests/${request.rq_key}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.details) {
          setRockNumberErrors(body.details.map((d) => `Rock ${d.rock_number}: ${d.reason}`));
        }
        throw new Error(body.error || `Failed to ${isCreate ? "create" : "save"} request`);
      }

      if (isCreate) {
        onCreated();
        return;
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
        title={isCreate ? "Create Rock Request" : "Edit Rock Request"}
        buttonPanel={
          <>
            {justSaved && <span className={styles.savedIndicator}>Saved</span>}
            {!isCreate && sendEmailBlocker && (
              <span className={styles.sendEmailHint}>{sendEmailBlocker}</span>
            )}
            {!isCreate && (
              <button
                onClick={() => setShowSendEmail(true)}
                disabled={saving || !!sendEmailBlocker}
                title={sendEmailBlocker || undefined}
                style={
                  sendEmailBlocker
                    ? { background: "#ccc", color: "#888", cursor: "not-allowed" }
                    : undefined
                }
              >
                Send Email
              </button>
            )}
            <button onClick={handleSave} disabled={saving}>
              {isCreate ? (saving ? "Creating..." : "Create") : saving ? "Saving..." : "Save"}
            </button>
            <button onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </>
        }
      >
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form className={styles.dialogForm} onSubmit={(e) => e.preventDefault()} noValidate>
          <h3 className={styles.sectionHeading}>Request</h3>
          <div className={styles.sectionBody}>
            <label htmlFor="name">
              Name <span className={styles.requiredMark}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={fieldClass("name")}
              aria-invalid={!!shownError("name")}
            />
            {errorText("name")}

            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={fieldClass("email")}
              aria-invalid={!!shownError("email")}
            />
            {errorText("email")}

            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="Street, City, State/Province, Postal Code, Country"
            />

            <label htmlFor="rocks_requested">
              # Rocks Requested <span className={styles.requiredMark}>*</span>
            </label>
            <input
              type="number"
              id="rocks_requested"
              name="rocks_requested"
              min="1"
              step="1"
              value={formData.rocks_requested}
              onChange={handleChange}
              className={fieldClass("rocks_requested")}
              aria-invalid={!!shownError("rocks_requested")}
            />
            {errorText("rocks_requested")}

            <label htmlFor="needed_by">Need Rocks By</label>
            <div className={styles.inlineRow}>
              <input
                type="date"
                id="needed_by"
                name="needed_by"
                value={formData.no_rush ? "" : formData.needed_by}
                onChange={handleChange}
                disabled={formData.no_rush}
              />
              <label htmlFor="no_rush" className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="no_rush"
                  name="no_rush"
                  checked={formData.no_rush}
                  onChange={handleChange}
                />
                No rush
              </label>
            </div>

            <label htmlFor="message">Message (from requester)</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <h3 className={styles.sectionHeading}>Admin</h3>
          <div className={styles.sectionBody}>
            <label htmlFor="tracking_number">Tracking Number</label>
            <div className={styles.inlineRow}>
              <input
                type="text"
                id="tracking_number"
                name="tracking_number"
                value={formData.tracking_number}
                onChange={handleChange}
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
            </div>

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

            <label htmlFor="comments">Notes (from admin)</label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows={3}
            />

            {!isCreate && (
              <>
                <label>Last Emailed</label>
                <div className={styles.readOnlyField}>
                  {emailDt ? emailDt.replace("T", " ").slice(0, 16) : "Never"}
                </div>
              </>
            )}
          </div>
        </form>
      </Dialog>

      {!isCreate && (
        <SendRockRequestEmailDialog
          request={{
            ...request,
            // Send Email is only enabled with no unsaved changes, so these
            // match what's in the database even after an edit + Save.
            name: savedFormData.name,
            email: savedFormData.email,
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
      )}

      <RockPopupByNumber
        rockNumber={viewingRockNumber}
        onClose={() => setViewingRockNumber(null)}
      />
    </>
  );
};

export default RockRequestsEditDialog;
