import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaEye, FaPaintBrush, FaTrash } from "react-icons/fa";
import Table from "../../components/simple-components/table/Table";
import ToggleSwitch from "../../components/simple-components/toggle-switch/ToggleSwitch";
import LightboxRock from "../../components/lightbox-rock/LightboxRock";
import RockJourneyDialog from "../../components/rock-map/rock-journey-dialog/RockJourneyDialog";
import { useAuth } from "../../admin/context/AuthContext";
import styles from "./FollowRocks.module.css";

const MAX_RESULTS = 20;

const columns = [
  { key: "rock_number", label: "Rock #", sortable: true, defaultWidth: 80 },
  { key: "image", label: "Image", defaultWidth: 70 },
  {
    key: "artists",
    label: "Artist",
    sortable: true,
    sortValue: (r) => r.artists.map((a) => a.display_name).join(", "),
  },
  { key: "create_dt", label: "Created", sortable: true, defaultWidth: 110 },
  { key: "last_location", label: "Last Location", sortable: true },
  {
    key: "last_post_date",
    label: "Last Post",
    sortable: true,
    defaultWidth: 110,
    sortValue: (r) => (r.last_post_date ? new Date(r.last_post_date).getTime() : null),
  },
  { key: "actions", label: "", defaultWidth: 80 },
];

// last_post_date arrives as a plain "YYYY-MM-DD" (journey.date is a
// calendar date) — parse/format in UTC so it isn't shifted a day by the
// viewer's time zone.
const formatJourneyDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—";

const FollowRocks = () => {
  const { account, setAccount } = useAuth();
  const [followed, setFollowed] = useState([]);
  const [allRocks, setAllRocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [lightboxRock, setLightboxRock] = useState(null);
  const [journeyRock, setJourneyRock] = useState(null);
  const [savingNotify, setSavingNotify] = useState(false);

  const loadFollowed = async () => {
    try {
      const { data } = await axios.get("/api/follows");
      // Table keys rows by `id`.
      setFollowed(data.map((r) => ({ ...r, id: r.rock_number })));
    } catch (err) {
      console.error("Failed to load followed rocks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowed();
    axios
      .get("/api/rock-posts/allrocks")
      .then(({ data }) => setAllRocks(data))
      .catch((err) => console.error("Failed to load rocks:", err));
  }, []);

  const followedNumbers = useMemo(
    () => new Set(followed.map((r) => r.rock_number)),
    [followed]
  );

  // Matches a rock number prefix ("12" -> 12, 120, 121...) or any part of
  // an artist's name.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allRocks
      .filter(
        (r) =>
          String(r.rock_number).startsWith(q) ||
          (r.artists || "").toLowerCase().includes(q)
      )
      .sort((a, b) => a.rock_number - b.rock_number)
      .slice(0, MAX_RESULTS);
  }, [allRocks, query]);

  const handleFollow = async (rockNumber) => {
    setError(null);
    try {
      await axios.post("/api/follows", { rockNumber });
      await loadFollowed();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't follow that rock. Please try again.");
    }
  };

  const handleRemove = async (rockNumber) => {
    setError(null);
    try {
      await axios.delete(`/api/follows/${rockNumber}`);
      setFollowed((prev) => prev.filter((r) => r.rock_number !== rockNumber));
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't remove that rock. Please try again.");
    }
  };

  const toggleNotify = async () => {
    const next = !account.notifyRockMoves;
    setSavingNotify(true);
    setError(null);
    try {
      await axios.put("/api/follows/settings", { notifyRockMoves: next });
      setAccount((prev) => ({ ...prev, notifyRockMoves: next }));
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save your email setting.");
    } finally {
      setSavingNotify(false);
    }
  };

  const renderCell = (row, key) => {
    switch (key) {
      case "image":
        return (
          <img
            src={`/media/catalog/${row.rock_number}/a_sm.webp`}
            alt={`Rock ${row.rock_number}`}
            className={styles.thumb}
            onClick={() => setLightboxRock(row)}
          />
        );
      case "artists": {
        const names = row.artists.map((a) => a.display_name).join(", ") || "—";
        // A Creator's own rock (always on their list, can't be removed).
        return row.own ? (
          <span className={styles.ownArtist}>
            <span
              className={styles.ownIcon}
              title="You painted this rock"
              aria-label="You painted this rock"
              role="img"
            >
              <FaPaintBrush />
            </span>
            {names}
          </span>
        ) : (
          names
        );
      }
      case "create_dt":
        return row.create_dt ? new Date(row.create_dt).toLocaleDateString() : "—";
      case "last_location":
        return row.last_location || "Not traveled yet";
      case "last_post_date":
        return formatJourneyDate(row.last_post_date);
      case "actions":
        return (
          <div className={styles.actions}>
            <button
              className={styles.viewButton}
              onClick={() => setJourneyRock(row.rock_number)}
              title={`View rock ${row.rock_number}'s journey`}
              aria-label={`View rock ${row.rock_number}'s journey`}
            >
              <FaEye />
            </button>
            {/* A Creator's own rocks can't be removed (server refuses too). */}
            {!row.own && (
              <button
                className={styles.removeButton}
                onClick={() => handleRemove(row.rock_number)}
                title={`Stop following rock ${row.rock_number}`}
                aria-label={`Stop following rock ${row.rock_number}`}
              >
                <FaTrash />
              </button>
            )}
          </div>
        );
      default:
        return row[key];
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Follow Rocks</h1>
      <p className={styles.intro}>
        Follow the rocks that mean the most to you and see where Aiden&apos;s adventures
        take them next.
      </p>

      <div className={styles.notifyRow}>
        <span>Email me when rocks I follow move</span>
        <ToggleSwitch
          checked={!!account?.notifyRockMoves}
          onChange={toggleNotify}
          disabled={savingNotify}
        />
      </div>

      <section className={styles.section}>
        <h2>Find a rock</h2>
        <input
          className={styles.search}
          type="search"
          placeholder="Search by rock number or artist"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <ul className={styles.results}>
            {results.length === 0 && <li className={styles.noResults}>No rocks found.</li>}
            {results.map((r) => {
              const isFollowed = followedNumbers.has(r.rock_number);
              return (
                <li key={r.rock_number} className={styles.resultRow}>
                  <img
                    src={`/media/catalog/${r.rock_number}/a_sm.webp`}
                    alt=""
                    className={styles.thumb}
                  />
                  <span className={styles.resultText}>
                    <strong>Rock {r.rock_number}</strong>
                    {r.artists && <span> · {r.artists}</span>}
                  </span>
                  <button
                    className={styles.followButton}
                    onClick={() => handleFollow(r.rock_number)}
                    disabled={isFollowed}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.section}>
        <h2>Rocks you follow{!loading && ` (${followed.length})`}</h2>
        {/* Scrolls sideways inside its own box on narrow screens instead of
            widening the whole page past the background. */}
        <div className={styles.tableScroll}>
          <Table
            columns={columns}
            data={followed}
            renderCell={renderCell}
            loading={loading}
            defaultSort={{ key: "rock_number", direction: "asc" }}
          />
        </div>
      </section>

      <LightboxRock
        open={!!lightboxRock}
        onClose={() => setLightboxRock(null)}
        imageSrc={lightboxRock}
      />
      <RockJourneyDialog rockNumber={journeyRock} onClose={() => setJourneyRock(null)} />
    </div>
  );
};

export default FollowRocks;
