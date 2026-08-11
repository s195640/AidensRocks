import { useMemo, useState } from "react";
import axios from "axios";
import { FaEye, FaPaperPlane } from "react-icons/fa";
import Job from "../job/Job";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import Table from "../../../components/simple-components/table/Table";
import styles from "./SendEmailsCatchup.module.css";

// Human labels for the two email templates GET /api/admin/jobs/send-emails-catchup
// can assign a row (see emailSlugs.js on the server / client) -- mirrors the
// nav_label these slugs have in page_content (add_response_email_page.sql /
// add_response_email_multi_page.sql).
const TEMPLATE_LABELS = {
  "response-email": "Response Email",
  "response-email-multi": "Response Email Multi",
};

// Icon-button hover treatment shared by both row actions -- same
// scale-on-hover convention as RockTable/MusicTable's FaEdit/FaTrash icons.
const iconStyle = { cursor: "pointer", transition: "transform 0.2s" };
const growOnHover = (e) => (e.currentTarget.style.transform = "scale(1.2)");
const shrinkOnHover = (e) => (e.currentTarget.style.transform = "scale(1)");

// Job UI for catching up every rock-post response email that's never been
// sent (journey.email_sent = false). Both the per-row send icon and
// "Send N" (selected rows) actually send, one at a time, with a progress
// bar while a "Send N" batch is running.
const SendEmailsCatchup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendingIds, setSendingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Non-null while "Send N" is working through its batch -- {done, total}
  // drives the progress bar and gates everything else that could interfere
  // with an in-flight batch (Close, Send All itself, row checkboxes/send
  // icons).
  const [bulkProgress, setBulkProgress] = useState(null);
  const isBulkSending = bulkProgress !== null;

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError("");
    setSearchTerm("");
    try {
      const res = await axios.get("/api/admin/jobs/send-emails-catchup");
      const loadedRows = res.data.map((row, idx) => ({ ...row, id: idx }));
      setRows(loadedRows);
      // Nothing pre-checked -- an admin opting into "Send All" should be a
      // deliberate select-everything click, not a default.
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to load send-emails catch-up list:", err);
      setError("Failed to load catch-up list.");
    } finally {
      setLoading(false);
    }
  };

  // Filters on email or rock number -- same substring-match convention as
  // RockTable's own search box. Selections aren't touched by filtering, so
  // a row checked before narrowing the search is still checked if the
  // filter is cleared again.
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) => row.email.toLowerCase().includes(term) || row.rocks.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // "Select all" only acts on the currently filtered rows, so it can't
  // silently select/deselect rows the search has hidden.
  const allSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((row) => (allSelected ? next.delete(row.id) : next.add(row.id)));
      return next;
    });
  };

  // Opens the same email-preview mockup Page Details' own "Preview" button
  // uses (EmailPreview.jsx), pre-filled with this row's rock number(s) and
  // recipient via query params instead of requiring them to be re-typed.
  //
  // Deliberately no "noopener"/"noreferrer" here: both sever the new tab's
  // opener relationship, which is what lets a same-origin window.open() tab
  // inherit a copy of sessionStorage -- without it the new tab has no admin
  // token and PrivateRoute bounces to /login. Safe to omit since this URL is
  // built entirely from a hardcoded path plus this row's own template slug/
  // email/rocks, never arbitrary user input.
  const handlePreview = (row) => {
    const params = new URLSearchParams({ to: row.email });
    if (row.template === "response-email-multi") {
      params.set("rocks", row.rocks);
    } else {
      params.set("rock", row.rocks);
    }
    window.open(`/admin/preview-email/${row.template}?${params.toString()}`, "_blank");
  };

  // Shared by handleSendRow and handleSendAll: sends this row's actual
  // response email (published template content, server-derived single/multi
  // choice -- see POST .../send in jobsAdmin.js) and, only once that
  // succeeds, the server marks the matching journey rows email_sent/
  // email_dt. On success the row is dropped from the list and unchecked --
  // it's no longer pending.
  const sendRow = async (row) => {
    await axios.post("/api/admin/jobs/send-emails-catchup/send", {
      email: row.email,
      rocks: row.rocks,
    });
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  };

  // Gated behind a plain window.confirm (same convention as PagesAdmin.jsx's
  // handleDiscardDraft) rather than a custom Dialog -- this is a real send
  // with no undo, so it always needs an explicit OK before hitting the API.
  const handleSendRow = async (row) => {
    const confirmed = window.confirm(
      `Sending email ${TEMPLATE_LABELS[row.template] || row.template} to ${row.email} for rocks ${row.rocks}`
    );
    if (!confirmed) return;

    setSendingIds((prev) => new Set(prev).add(row.id));
    try {
      await sendRow(row);
    } catch (err) {
      console.error("Failed to send catch-up email:", err);
      alert(err.response?.data?.error || "Failed to send email.");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  // Sends every selected row one at a time (not in parallel -- keeps this a
  // predictable, throttled stream of real emails rather than a burst), with
  // bulkProgress driving the spinner/progress bar for the whole batch. A
  // single row failing doesn't stop the rest; failures are collected and
  // reported together once the batch finishes.
  const handleSendAll = async () => {
    const toSend = rows.filter((row) => selectedIds.has(row.id));
    if (toSend.length === 0) return;

    const confirmed = window.confirm(
      `Send ${toSend.length} email${toSend.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    setBulkProgress({ done: 0, total: toSend.length });
    const failedEmails = [];

    for (const row of toSend) {
      setSendingIds((prev) => new Set(prev).add(row.id));
      try {
        await sendRow(row);
      } catch (err) {
        console.error(`Failed to send catch-up email to ${row.email}:`, err);
        failedEmails.push(row.email);
      } finally {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
        setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    setBulkProgress(null);
    if (failedEmails.length > 0) {
      alert(`Failed to send to: ${failedEmails.join(", ")}`);
    }
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          disabled={isBulkSending}
          title={allSelected ? "Deselect all" : "Select all"}
        />
      ),
      sortable: false,
      defaultWidth: 36,
    },
    { key: "email", label: "Email", sortable: false, defaultWidth: 240 },
    { key: "rocks", label: "Rocks", sortable: false },
    { key: "template", label: "Email Template", sortable: false, defaultWidth: 190 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 80 },
  ];

  const renderCell = (row, key) => {
    switch (key) {
      case "select":
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleRow(row.id)}
            disabled={isBulkSending}
          />
        );
      case "template":
        return TEMPLATE_LABELS[row.template] || row.template;
      case "actions": {
        // Disabled while this row is sending (either its own icon was
        // clicked, or it's this row's turn in a "Send All" batch) or while
        // any other row is mid-batch -- prevents a second manual send
        // racing the batch's own send for the same row/others.
        const rowBusy = sendingIds.has(row.id) || isBulkSending;
        return (
          <div className={styles.actionIcons}>
            <FaEye
              size={18}
              style={{ ...iconStyle, color: "#5bc0de" }}
              onClick={() => handlePreview(row)}
              onMouseEnter={growOnHover}
              onMouseLeave={shrinkOnHover}
              title="Preview"
            />
            <FaPaperPlane
              size={16}
              style={{
                ...iconStyle,
                color: "#4caf50",
                opacity: rowBusy ? 0.5 : 1,
                pointerEvents: rowBusy ? "none" : "auto",
              }}
              onClick={() => handleSendRow(row)}
              onMouseEnter={growOnHover}
              onMouseLeave={shrinkOnHover}
              title={sendingIds.has(row.id) ? "Sending..." : "Send"}
            />
          </div>
        );
      }
      default:
        return row[key];
    }
  };

  return (
    <Job title="Send Emails - Catch-up">
      <p className={styles.description}>
        Lists every rock-post recipient who hasn&apos;t been sent a response email yet, grouped by
        address, with the template each one would use.
      </p>
      <button onClick={handleOpen} className={styles.button}>
        Review Catch-up Emails
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Send Emails - Catch-up"
        buttonPanel={
          <>
            <button
              onClick={handleSendAll}
              disabled={selectedIds.size === 0 || isBulkSending}
              className={styles.sendAllButton}
            >
              Send {selectedIds.size}
            </button>
            <button onClick={() => setIsOpen(false)} disabled={isBulkSending}>
              Close
            </button>
          </>
        }
        closeOnOutsideClick={!isBulkSending}
        // Fixes the dialog's own height so it doesn't grow/shrink as the row
        // count changes (loading vs. loaded, filtered down, rows removed by
        // sending) -- dialogContent's own overflow-y: auto (Dialog.module.css)
        // scrolls a tall table inside this fixed box instead of the whole
        // dialog resizing to fit it.
        className={styles.dialogFixedHeight}
      >
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {isBulkSending && (
              <div className={styles.progressWrap}>
                <div className={styles.spinner} />
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
                <span className={styles.progressLabel}>
                  {bulkProgress.done} / {bulkProgress.total}
                </span>
              </div>
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by email or rock number..."
              className={styles.searchInput}
            />
            <div className={styles.summary}>
              {loading
                ? "Loading..."
                : `${filteredRows.length}${filteredRows.length !== rows.length ? ` of ${rows.length}` : ""} recipient${rows.length === 1 ? "" : "s"} pending · ${selectedIds.size} selected`}
            </div>
            <Table columns={columns} data={filteredRows} renderCell={renderCell} loading={loading} />
          </>
        )}
      </Dialog>
    </Job>
  );
};

export default SendEmailsCatchup;
