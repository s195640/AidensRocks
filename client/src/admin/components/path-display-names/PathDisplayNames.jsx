// src/admin/components/path-display-names/PathDisplayNames.jsx
import { useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";
import Job from "../job/Job";
import Dialog from "../../../components/simple-components/dialog/Dialog";
import Table from "../../../components/simple-components/table/Table";
import styles from "./PathDisplayNames.module.css";

const EMPTY_FORM = { id: null, urlPattern: "", displayName: "" };

// Job UI for managing the path_display_name lookup table: maps a hit's
// full URL (or a "*" wildcard pattern, e.g. "/qr?r=*") to a human-readable
// label shown on the admin dashboard's Path Hits widget
// (client/src/admin/components/path-hits-panel/PathHitsPanel.jsx) in place
// of the raw URL. A hit that matches nothing shows there as "Unknown".
const PathDisplayNames = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/api/admin/path-display-names");
      setRows(data);
    } catch (err) {
      console.error("Failed to load path display names:", err);
      setError("Failed to load mappings.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setForm(EMPTY_FORM);
    fetchRows();
  };

  const handleEdit = (row) => {
    setError("");
    setForm({ id: row.id, urlPattern: row.url_pattern, displayName: row.display_name });
  };

  const handleCancelEdit = () => {
    setError("");
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the mapping for "${row.url_pattern}"?`)) return;
    setDeletingId(row.id);
    try {
      await axios.delete(`/api/admin/path-display-names/${row.id}`);
      if (form.id === row.id) setForm(EMPTY_FORM);
      await fetchRows();
    } catch (err) {
      console.error("Failed to delete path display name:", err);
      setError(err.response?.data?.error || "Failed to delete mapping.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const urlPattern = form.urlPattern.trim();
    const displayName = form.displayName.trim();
    if (!urlPattern || !displayName) {
      setError("Both a URL pattern and a display name are required.");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/admin/path-display-names/${form.id}`, { urlPattern, displayName });
      } else {
        await axios.post("/api/admin/path-display-names", { urlPattern, displayName });
      }
      setForm(EMPTY_FORM);
      await fetchRows();
    } catch (err) {
      console.error("Failed to save path display name:", err);
      setError(err.response?.data?.error || "Failed to save mapping.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "url_pattern", label: "URL Pattern", sortable: false },
    { key: "display_name", label: "Display Name", sortable: false, defaultWidth: 180 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 80 },
  ];

  const renderCell = (row, key) => {
    switch (key) {
      case "actions":
        return (
          <div className={styles.actionIcons}>
            <FaEdit
              size={18}
              className={styles.editIcon}
              onClick={() => handleEdit(row)}
              title="Edit"
            />
            <FaTrash
              size={16}
              className={styles.deleteIcon}
              style={{ opacity: deletingId === row.id ? 0.5 : 1 }}
              onClick={() => (deletingId ? null : handleDelete(row))}
              title="Delete"
            />
          </div>
        );
      default:
        return row[key];
    }
  };

  return (
    <Job title="Path Display Names">
      <p className={styles.description}>
        Maps a path hit&apos;s full URL to a display name shown on the Path Hits widget. Use{" "}
        <code>*</code> as a wildcard to match any value, e.g. <code>/qr?r=*</code> &rarr;{" "}
        <code>Rock</code>. Anything with no mapping shows as &quot;Unknown&quot;.
      </p>
      <button onClick={handleOpen} className={styles.button}>
        Manage Display Names
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Path Display Names"
        buttonPanel={<button onClick={() => setIsOpen(false)}>Close</button>}
        closeOnOutsideClick
        className={styles.dialogFixedHeight}
      >
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={form.urlPattern}
            onChange={(e) => setForm((f) => ({ ...f, urlPattern: e.target.value }))}
            placeholder="URL pattern, e.g. /qr?r=*"
            className={styles.input}
          />
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Display name, e.g. Rock"
            className={styles.input}
          />
          <button type="submit" disabled={saving} className={styles.saveButton}>
            {saving ? "Saving..." : form.id ? "Update" : "Add"}
          </button>
          {form.id && (
            <button type="button" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </button>
          )}
        </form>

        <Table columns={columns} data={rows} renderCell={renderCell} loading={loading} />
      </Dialog>
    </Job>
  );
};

export default PathDisplayNames;
