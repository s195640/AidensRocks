import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import Table from "../../../components/simple-components/table/Table";
import { useAuth } from "../../context/AuthContext";
import { LEVEL_LABELS, LOCKED_LEVEL } from "../../utils/accessLevels";
import AccountCreateDlg from "./AccountCreateDlg";
import AccountEditDlg from "./AccountEditDlg";
import styles from "./AccountsAdmin.module.css";

const fullName = (a) => [a.first_name, a.last_name].filter(Boolean).join(" ");

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

const levelText = (a) =>
  a.is_locked
    ? `Locked (${LOCKED_LEVEL}) · ${LEVEL_LABELS[a.access_level]}`
    : `${LEVEL_LABELS[a.access_level] || "?"} (${a.access_level})`;

const columns = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    sortValue: (a) => fullName(a).toLowerCase() || null,
  },
  { key: "email", label: "Email", sortable: true },
  {
    key: "level",
    label: "Level",
    sortable: true,
    defaultWidth: 170,
    sortValue: (a) => (a.is_locked ? LOCKED_LEVEL : a.access_level),
  },
  {
    key: "artist",
    label: "Artist",
    sortable: true,
    sortValue: (a) => a.artist_name?.toLowerCase() || null,
  },
  { key: "verified", label: "Verified", sortable: true, defaultWidth: 80, sortValue: (a) => !!a.email_verified_dt },
  { key: "failed_login_count", label: "Failed", sortable: true, defaultWidth: 70 },
  { key: "follow_count", label: "Following", sortable: true, defaultWidth: 85 },
  { key: "notify", label: "Emails", sortable: true, defaultWidth: 70, sortValue: (a) => a.notify_rock_moves },
  { key: "create_dt", label: "Created", sortable: true, defaultWidth: 170 },
  { key: "last_login_dt", label: "Last Sign In", sortable: true, defaultWidth: 170 },
  { key: "last_seen_dt", label: "Last Active", sortable: true, defaultWidth: 170 },
  { key: "actions", label: "", defaultWidth: 70 },
];

const AccountsAdmin = () => {
  const { account: me } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  // Result of the last "Add Account" ({ type: 'notice' | 'error', text }).
  const [banner, setBanner] = useState(null);
  // Artists for the Creator "Linked Artist" picker (routes/users.js manages
  // the artist table).
  const [artists, setArtists] = useState([]);

  const fetchAccounts = async () => {
    try {
      const { data } = await axios.get("/api/admin/accounts");
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    axios
      .get("/api/users")
      .then(({ data }) =>
        setArtists([...data].sort((a, b) => a.display_name.localeCompare(b.display_name)))
      )
      .catch((err) => console.error("Failed to fetch artists:", err));
  }, []);

  // Artists already linked to an account other than the one being edited.
  const takenArtists = useMemo(
    () =>
      new Map(
        accounts
          .filter((a) => a.ra_key && a.id !== editing?.id)
          .map((a) => [a.ra_key, a.email])
      ),
    [accounts, editing]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? accounts.filter(
          (a) => a.email.toLowerCase().includes(q) || fullName(a).toLowerCase().includes(q)
        )
      : accounts;
  }, [accounts, search]);

  const handleCreated = (created) => {
    const { setupEmailSent, setupEmailError, ...row } = created;
    setAccounts((prev) => [row, ...prev]);
    if (setupEmailError) setBanner({ type: "error", text: setupEmailError });
    else
      setBanner({
        type: "notice",
        text: setupEmailSent
          ? `Account created for ${row.email}. A link to set their password is on its way.`
          : `Account created for ${row.email}. It stays locked until they reset their password.`,
      });
  };

  const handleSaved = (updated) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDelete = async (row) => {
    const who = fullName(row) ? `${fullName(row)} (${row.email})` : row.email;
    if (
      !window.confirm(
        `Delete the account for ${who}? Their followed rocks are removed too. This can't be undone.`
      )
    )
      return;
    try {
      await axios.delete(`/api/admin/accounts/${row.id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== row.id));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete account.");
    }
  };

  const renderCell = (row, key) => {
    switch (key) {
      case "level":
        return (
          <span className={row.is_locked ? styles.locked : ""}>{levelText(row)}</span>
        );
      case "name":
        return fullName(row) || "—";
      case "artist":
        return row.artist_name || "—";
      case "verified":
        return row.email_verified_dt ? "Yes" : "No";
      case "notify":
        return row.notify_rock_moves ? "On" : "Off";
      case "create_dt":
      case "last_login_dt":
      case "last_seen_dt":
        return formatDate(row[key]);
      case "actions":
        return (
          <div className={styles.actionsCol}>
            <FaEdit
              className={styles.editIcon}
              onClick={() => setEditing(row)}
              title="Edit"
              aria-label={`Edit ${row.email}`}
            />
            {/* Can't delete yourself (the server refuses too). */}
            {row.id !== me?.id && (
              <FaTrash
                className={styles.deleteIcon}
                onClick={() => handleDelete(row)}
                title="Delete"
                aria-label={`Delete ${row.email}`}
              />
            )}
          </div>
        );
      default:
        return row[key];
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerTop}>
        <h1>Accounts</h1>
        <div className={styles.headerActions}>
          <input
            className={styles.search}
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className={styles.addButton} onClick={() => setCreating(true)}>
            Add Account
          </button>
        </div>
      </div>

      {banner && (
        <div className={banner.type === "error" ? styles.errorMessage : styles.noticeMessage}>
          {banner.text}
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        renderCell={renderCell}
        loading={loading}
        defaultSort={{ key: "create_dt", direction: "desc" }}
      />

      <AccountCreateDlg
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
        artists={artists}
        takenArtists={takenArtists}
      />

      <AccountEditDlg
        account={editing}
        isSelf={editing?.id === me?.id}
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        artists={artists}
        takenArtists={takenArtists}
      />
    </div>
  );
};

export default AccountsAdmin;
