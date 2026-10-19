import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaPen, FaPlus } from "react-icons/fa";
import styles from "./Rocks.module.css";
import LightboxRock from "../../../components/lightbox-rock/LightboxRock";
import RockCreateEditDlg from "./rock-create-edit-dlg/RockCreateEditDlg";
import RockTable from "./rock-table/RockTable";
import { ASSIGN_STATUSES } from "./assignStatuses";

const Rocks = () => {
  const [rocks, setRocks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRock, setSelectedRock] = useState(null);
  const [rockNumber, setRockNumber] = useState("");
  // Table filters, set by the header chips and the table's status dropdown.
  // Opens on available rocks -- the ones that can still be given out.
  const [statusFilter, setStatusFilter] = useState("available");
  const [recentHours, setRecentHours] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // How many rows the table is showing after its filters and search.
  const [shownCount, setShownCount] = useState(0);
  const rockNumberInputRef = useRef(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadRocks = async () => {
    const res = await axios.get("/api/rocks");
    setRocks(res.data);
  };

  const loadArtists = async () => {
    const res = await axios.get("/api/users");
    const sorted = res.data.sort((a, b) => {
      if (a.display_name === "UNKNOWN") return -1;
      if (b.display_name === "UNKNOWN") return 1;
      return a.display_name.localeCompare(b.display_name);
    });
    setArtists(sorted);
  };

  const loadRequests = async () => {
    // Used to look up a linked rock request's details by catalog.rq_key --
    // see RockTable.jsx/RockCreateEditDlg.jsx's "Linked Rock Request" link.
    const res = await axios.get("/api/rock-requests");
    setRequests(res.data);
  };

  useEffect(() => {
    loadRocks();
    loadArtists();
    loadRequests();
  }, []);

  const openDialog = (rock = null) => {
    setSelectedRock(rock);
    setDialogOpen(true);
  };

  // Leaving the Edit Rock dialog (Save, Cancel or Escape) puts the cursor
  // back in the Rock # box with its text selected, ready for the next number.
  const closeDialog = () => {
    setDialogOpen(false);
    if (selectedRock) {
      setTimeout(() => {
        rockNumberInputRef.current?.focus();
        rockNumberInputRef.current?.select();
      }, 0);
    }
  };

  const openImageDialog = (rock) => {
    setImageSrc(rock);
    setImageDialogOpen(true);
  };

  const closeImageDialog = () => {
    setImageDialogOpen(false);
    setImageSrc("");
  };

  const handleDelete = async (rock) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`/api/rocks/${rock.rc_key}`);
    await loadRocks();
  };

  // The table's in-place Status dropdown: show the change at once, take the
  // server's date (it stamps/clears assigned_dt), put the row back on failure.
  const handleStatusChange = async (rock, assign_status) => {
    const applyToRow = (patch) =>
      setRocks((rows) => rows.map((r) => (r.rc_key === rock.rc_key ? { ...r, ...patch } : r)));
    applyToRow({ assign_status });
    try {
      const res = await axios.patch(`/api/rocks/${rock.rc_key}/assign-status`, { assign_status });
      applyToRow({ assign_status: res.data.assign_status, assigned_dt: res.data.assigned_dt });
    } catch (err) {
      console.error(err);
      applyToRow({ assign_status: rock.assign_status, assigned_dt: rock.assigned_dt });
      alert(err.response?.data?.error || "Failed to update status.");
    }
  };

  const handleEditByNumber = () => {
    const rock = rocks.find((r) => r.rock_number === parseInt(rockNumber));
    if (rock) openDialog(rock);
    else alert(`Rock number ${rockNumber} not found`);
  };

  const totalRocks = rocks.length;
  const totalAvailable = rocks.filter((r) => r.assign_status === "available").length;
  const totalRocks24h = rocks.filter((r) => new Date(r.create_dt) > Date.now() - 24 * 60 * 60 * 1000).length;
  const totalRocks1h = rocks.filter((r) => new Date(r.create_dt) > Date.now() - 60 * 60 * 1000).length;

  // Each chip is a preset for both filters; it's lit while the table shows
  // exactly that preset.
  const filterChips = [
    { label: "All", count: totalRocks, status: "", hours: null },
    { label: "Available", count: totalAvailable, status: "available", hours: null },
    { label: "Last 24h", count: totalRocks24h, status: "", hours: 24 },
    { label: "Last 1h", count: totalRocks1h, status: "", hours: 1 },
  ];

  // The page fills the screen below the navbar: the header stays put and
  // only the table area scrolls (both ways on a phone), with the table's
  // header row stuck to its top. Nothing scrolls under the see-through
  // navbar. .page must stay unpositioned -- the dialogs below render inside
  // it and need to stack above the navbar.
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>
            Rocks{" "}
            <span className={styles.count}>
              {shownCount} of {totalRocks}
            </span>
          </h2>
          <div className={styles.tools}>
            <input
              ref={rockNumberInputRef}
              type="number"
              placeholder="Rock #"
              aria-label="Rock number to edit"
              className={styles.rockNumberInput}
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditByNumber()}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleEditByNumber}
              title="Edit this rock"
              aria-label="Edit this rock"
            >
              <FaPen />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.createButton}`}
              onClick={() => openDialog()}
              title="Create rocks"
              aria-label="Create rocks"
            >
              <FaPlus />
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterChips}>
            {filterChips.map(({ label, count, status, hours }) => {
              const active = statusFilter === status && recentHours === hours;
              return (
                <button
                  key={label}
                  type="button"
                  className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(status);
                    setRecentHours(hours);
                  }}
                >
                  {label} <span className={styles.chipCount}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.searchGroup}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.statusFilter}
              aria-label="Filter by status"
            >
              <option value="">all</option>
              {ASSIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search rocks, artists, comments, requests"
              aria-label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </header>

      <div className={styles.tableArea}>
        <RockTable
          rocks={rocks}
          onEdit={openDialog}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          statusFilter={statusFilter}
          recentHours={recentHours}
          searchTerm={searchTerm}
          onShownCountChange={setShownCount}
          stickyHeaderTop={0}
          openImageDialog={openImageDialog}
          requests={requests}
        />
      </div>

      <RockCreateEditDlg
        isOpen={dialogOpen}
        onClose={closeDialog}
        onSave={(num) => {
          loadRocks();
          setSuccessMessage(`Rock ${num} was successful`);
          setTimeout(() => setSuccessMessage(""), 10000);
        }}
        artists={artists}
        selectedRock={selectedRock}
        rocks={rocks}
        requests={requests}
      />

      <LightboxRock open={imageDialogOpen} onClose={closeImageDialog} imageSrc={imageSrc} />
      {successMessage && <div className={styles.successToast}>{successMessage}</div>}
    </div>
  );
};

export default Rocks;
