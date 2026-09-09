import { useState } from "react";
import axios from "axios";
import Job from "../job/Job";
import styles from "./SendEmail.module.css";

// Same loose "looks like an email" check used client-side by SendEmailDialog/
// PagesAdmin -- the server (jobsAdmin.js) re-validates with its own regex
// regardless, so this is only for fast feedback before hitting the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Freeform "Send Email" job: unlike Send Emails - Catch-up (which only
// re-sends the published response-email template to rock submitters), this
// lets an admin send an arbitrary subject/message to any address -- no
// template, no journey/rock bookkeeping, nothing recorded afterward.
const SendEmail = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text }

  const trimmedTo = to.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const canSend =
    EMAIL_RE.test(trimmedTo) && trimmedSubject.length > 0 && trimmedMessage.length > 0 && !sending;

  // Gated behind window.confirm -- same convention as SendEmailsCatchup's
  // per-row/"Send All" sends: this is a real send with no undo, so it always
  // needs an explicit OK before hitting the API.
  const handleSend = async () => {
    if (!canSend) return;

    const confirmed = window.confirm(`Send this email to ${trimmedTo}?`);
    if (!confirmed) return;

    setSending(true);
    setStatus(null);
    try {
      await axios.post("/api/admin/jobs/send-email", {
        to: trimmedTo,
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      setStatus({ type: "success", text: `Email sent to ${trimmedTo}.` });
      setTo("");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Failed to send email:", err);
      setStatus({
        type: "error",
        text: err.response?.data?.error || "Failed to send email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Job title="Send Email">
      <p className={styles.description}>
        Sends a one-off email to any address -- no template, nothing recorded afterward.
      </p>
      <div className={styles.form}>
        <label htmlFor="send-email-to">To</label>
        <input
          id="send-email-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@example.com"
          className={styles.input}
          disabled={sending}
        />

        <label htmlFor="send-email-subject">Subject</label>
        <input
          id="send-email-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={styles.input}
          disabled={sending}
        />

        <label htmlFor="send-email-message">Message</label>
        <textarea
          id="send-email-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className={styles.textarea}
          disabled={sending}
        />

        {status && (
          <div className={status.type === "error" ? styles.error : styles.success}>
            {status.text}
          </div>
        )}

        <button onClick={handleSend} disabled={!canSend} className={styles.button}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </Job>
  );
};

export default SendEmail;
