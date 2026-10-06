import { useEffect, useState } from "react";
import axios from "axios";
import AdminContainer from "../../components/admin-base/AdminContainer";
import { useSiteSettings } from "../../../context/SiteSettingsContext";
import styles from "./SettingsAdmin.module.css";

// Admin → Settings: site-wide values stored in the `setting` table
// (GET/PUT /api/admin/settings/:name). Anything public here must also be in
// the allow-list in server/src/utils/siteSettings.js to reach visitors.
const CONTACT_EMAIL_SETTING = "contact-email";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SettingsAdmin = () => {
  const { refresh } = useSiteSettings();
  const [contactEmail, setContactEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  useEffect(() => {
    axios
      .get(`/api/admin/settings/${CONTACT_EMAIL_SETTING}`)
      .then((res) => {
        const value = typeof res.data.value === "string" ? res.data.value : "";
        setContactEmail(value);
        setSavedEmail(value);
      })
      .catch((err) => {
        // 404 = never saved; leave the field blank for the admin to fill in.
        if (err.response?.status !== 404) {
          console.error("Failed to load settings:", err);
          setMessage({ type: "error", text: "Couldn't load settings." });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const trimmed = contactEmail.trim();
  const isValid = EMAIL_PATTERN.test(trimmed);
  const isDirty = trimmed !== savedEmail;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`/api/admin/settings/${CONTACT_EMAIL_SETTING}`, {
        value: trimmed,
        type: "site",
      });
      setSavedEmail(trimmed);
      setContactEmail(trimmed);
      setMessage({ type: "ok", text: "Saved." });
      refresh(); // so the public site in this tab picks it up right away
    } catch (err) {
      console.error("Failed to save contact email:", err);
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminContainer>
      <h2>Settings</h2>
      <form className={styles.card} onSubmit={handleSave} noValidate>
        <label htmlFor="contact-email" className={styles.label}>
          Contact email
        </label>
        <p className={styles.hint}>
          Shown to visitors in Contact Us, in the &quot;please email us&quot; error messages, by the
          Contact Email chip in page text, and by <code>{"{CONTACT_EMAIL}"}</code> in email
          templates.
        </p>
        <div className={styles.row}>
          <input
            id="contact-email"
            type="email"
            className={styles.input}
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              setMessage(null);
            }}
            disabled={loading}
            placeholder="aidensfamily@aidensrocks.com"
          />
          <button type="submit" disabled={loading || saving || !isDirty}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {message && (
          <div className={message.type === "ok" ? styles.ok : styles.error}>{message.text}</div>
        )}
      </form>
    </AdminContainer>
  );
};

export default SettingsAdmin;
