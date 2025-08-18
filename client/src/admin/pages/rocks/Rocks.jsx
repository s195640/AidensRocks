import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./Rocks.module.css";

const Rocks = () => {
  const [rocks, setRocks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRock, setSelectedRock] = useState(null);
  const [rockNumber, setRockNumber] = useState("");
  const [selectedArtistKeys, setSelectedArtistKeys] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [comment, setComment] = useState("");
  const [sortBy, setSortBy] = useState("rock_number");
  const [sortDir, setSortDir] = useState("asc");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    loadRocks();
    loadArtists();
  }, []);

  const openDialog = (rock = null) => {
    setSelectedRock(rock);
    setRockNumber(rock?.rock_number || "");
    setSelectedArtistKeys(rock?.artists.map((a) => a.ra_key) || []);
    setImageFile(null);
    setComment(rock?.comment || "");
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);
  const openImageDialog = (rock) => {
    setImageSrc(`/media/catalog/${rock.rock_number}/a.webp`);
    setImageDialogOpen(true);
  };
  const closeImageDialog = () => {
    setImageDialogOpen(false);
    setImageSrc("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rockNumber || selectedArtistKeys.length === 0 || (!selectedRock && !imageFile)) {
      alert("All fields are required except comment.");
      return;
    }

    const formData = new FormData();
    formData.append("rock_number", rockNumber);
    formData.append("artist_keys", JSON.stringify(selectedArtistKeys));
    formData.append("comment", comment);
    if (imageFile) formData.append("image", imageFile);

    try {
      setIsSaving(true);
      if (selectedRock) {
        await axios.put(`/api/rocks/${selectedRock.rc_key}`, formData);
      } else {
        await axios.post("/api/rocks", formData);
      }
      await loadRocks();
      closeDialog();
      setSuccessMessage(`Rock ${rockNumber} was successful`);
      setTimeout(() => setSuccessMessage(""), 10000);
    } catch (err) {
      console.error(err);
      alert("Error saving rock");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rc_key) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`/api/rocks/${rc_key}`);
    loadRocks();
  };

  const handleEditByNumber = () => {
    const rock = rocks.find((r) => r.rock_number === parseInt(rockNumber));
    if (rock) {
      openDialog(rock);
    } else {
      alert(`Rock number ${rockNumber} not found`);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const sortedRocks = [...rocks].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (sortBy === "artists") {
      valA = a.artists.map((a) => a.display_name).join(", ");
      valB = b.artists.map((a) => a.display_name).join(", ");
    }
    if (valA == null) valA = "";
    if (valB == null) valB = "";
    return sortDir === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const renderSortArrow = (field) => {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const totalRocks = rocks.length;
  const totalRocks24h = rocks.filter(
    (r) => new Date(r.create_dt) > Date.now() - 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className={styles.rocksContainer}>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h2>Rock Catalog</h2>
          <div className={styles.totals}>
            <div>Total Rocks: {totalRocks}</div>
            <div>Total Rocks (last 24h): {totalRocks24h}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.createButton} onClick={() => openDialog()}>
            + Create Rock
          </button>
          <div className={styles.editRock}>
            <input
              type="number"
              placeholder="Rock Number"
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
            />
            <button onClick={handleEditByNumber}>Edit</button>
          </div>
        </div>
      </div>

      <table className={styles.rocksTable}>
        <thead>
          <tr>
            <th onClick={() => toggleSort("rock_number")}>
              Rock{renderSortArrow("rock_number")}
            </th>
            <th onClick={() => toggleSort("artists")}>
              Artists{renderSortArrow("artists")}
            </th>
            <th onClick={() => toggleSort("comment")}>
              Comment{renderSortArrow("comment")}
            </th>
            <th onClick={() => toggleSort("create_dt")}>
              Created{renderSortArrow("create_dt")}
            </th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRocks.map((rock) => (
            <tr key={rock.rc_key}>
              <td>{rock.rock_number}</td>
              <td>{rock.artists.map((a) => a.display_name).join(", ")}</td>
              <td>{rock.comment}</td>
              <td>{new Date(rock.create_dt).toLocaleDateString()}</td>
              <td>
                <img
                  src={`/media/catalog/${rock.rock_number}/a_sm.webp`}
                  alt=""
                  className={styles.rockThumb}
                  onClick={() => openImageDialog(rock)}
                  onError={(e) => (e.target.style.display = "none")}
                  style={{ cursor: "pointer" }}
                />
              </td>
              <td>
                <button onClick={() => openDialog(rock)}>Edit</button>
                <button onClick={() => handleDelete(rock.rc_key)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* dialogs remain unchanged */}
      {dialogOpen && (
        <>
          <div className={styles.dialogOverlay}></div>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <h3>{selectedRock ? "Edit Rock" : "Create Rock"}</h3>
              <button className={styles.closeButton} onClick={closeDialog}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.dialogForm}>
              <label>Rock Number*</label>
              <input
                type="number"
                value={rockNumber}
                onChange={(e) => setRockNumber(e.target.value)}
                required
                disabled={selectedRock !== null}
              />
              <label>Artists*</label>
              <select
                multiple
                value={selectedArtistKeys}
                onChange={(e) =>
                  setSelectedArtistKeys(
                    Array.from(e.target.selectedOptions, (o) => parseInt(o.value))
                  )
                }
                required
              >
                {artists.map((artist) => (
                  <option key={artist.ra_key} value={artist.ra_key}>
                    {artist.display_name}
                  </option>
                ))}
              </select>
              <label>{selectedRock ? "Replace Image" : "Image*"}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                required={!selectedRock}
              />
              {imageFile && (
                <div className={styles.previewContainer}>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className={styles.previewImage}
                  />
                </div>
              )}
              <label>Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Add optional comment here..."
              ></textarea>
              <div className={styles.dialogFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeDialog}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? <div className={styles.spinner}></div> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {imageDialogOpen && (
        <>
          <div className={styles.dialogOverlay} onClick={closeImageDialog}></div>
          <div className={styles.dialog}>
            <img src={imageSrc} alt="" style={{ width: "100%" }} />
            <div className={styles.dialogButtons}>
              <button onClick={closeImageDialog}>Close</button>
            </div>
          </div>
        </>
      )}

      {successMessage && <div className={styles.successToast}>{successMessage}</div>}
    </div>
  );
};

export default Rocks;
