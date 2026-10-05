import { useEffect, useRef, useState } from "react";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import authFetch from "../../../utils/authFetch";
import loadDefaultEmail from "../../../../adminContent/loadDefaultEmail";
import styles from "./SendRockRequestEmailDialog.module.css";

const buildDefaultSubject = () => "Your Aiden's Rocks Are On The Way!";

const buildDefaultBody = (request) => {
  const rockNumbersPart = request.rock_numbers ? ` (#${request.rock_numbers})` : "";
  const trackingPart = request.tracking_number
    ? `\nTracking Number: ${request.tracking_number}\n`
    : "";

  return `Hi ${request.name},

We're so happy to let you know we've sent the rock(s) you requested${rockNumbersPart} out to you!
${trackingPart}
Thank you so much for helping us remember our son Aiden by giving these rocks a new adventure.

With love,
The Aiden's Rocks Family`;
};

const SendRockRequestEmailDialog = ({ request, isOpen, onClose, onSent }) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [markShipped, setMarkShipped] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Prefill once per open (and when a different request is opened) -- not
  // on every new `request` object. The parent rebuilds that object on each
  // render (e.g. its "Saved" indicator clearing), which used to throw away
  // whatever the admin had typed here.
  const requestRef = useRef(request);
  requestRef.current = request;
  const rqKey = request?.rq_key;

  useEffect(() => {
    if (!isOpen) return;
    const request = requestRef.current;
    let cancelled = false;
    setSubject(buildDefaultSubject());
    setBody(buildDefaultBody(request));
    // Only default the checkbox on for a request that isn't shipped yet --
    // leaving it on by default for an already-shipped request would be a
    // confusing no-op nobody asked for.
    setMarkShipped(!request.shipped);
    setError("");

    // The editable default lives in Page Details ("Rock Request Reply
    // (default)"); the built-in text above stays if it's missing/inactive.
    loadDefaultEmail("rock-request-reply-email", {
      NAME: request.name || "",
      ROCK_NUMBERS: request.rock_numbers || "not assigned yet",
      TRACKING_NUMBER: request.tracking_number || "not available yet",
    }).then((tpl) => {
      if (cancelled || !tpl) return;
      setSubject(tpl.subject);
      setBody(tpl.body);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, rqKey]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    if (!window.confirm(`Send this email to ${request.email}?`)) return;

    setSending(true);
    setError("");
    try {
      const res = await authFetch(`/api/rock-requests/${request.rq_key}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, markShipped }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");

      onSent(data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const buttonPanel = (
    <>
      <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
        {sending ? "Sending..." : "Send"}
      </button>
      <button onClick={onClose} disabled={sending}>
        Cancel
      </button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Send Email to ${request.name}`}
      buttonPanel={buttonPanel}
    >
      <div className={styles.form}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <label htmlFor="send-email-subject">Subject</label>
        <input
          id="send-email-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={sending}
        />

        <label htmlFor="send-email-body">Body</label>
        <textarea
          id="send-email-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          disabled={sending}
        />

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={markShipped}
            onChange={(e) => setMarkShipped(e.target.checked)}
            disabled={sending}
          />
          Also mark this request as Shipped
        </label>
      </div>
    </Dialog>
  );
};

export default SendRockRequestEmailDialog;
