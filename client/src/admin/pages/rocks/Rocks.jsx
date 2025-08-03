import axios from "axios";
import { useEffect, useState } from "react";
import "./Rocks.css";

const Rocks = () => {
  const [rocks, setRocks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRock, setSelectedRock] = useState(null);
  const [rockNumber, setRockNumber] = useState("");
  const [selectedArtistKeys, setSelectedArtistKeys] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [comment, setComment] = useState(""); // <-- new state for comment
  const [sortBy, setSortBy] = useState("rock_number");
  const [sortDir, setSortDir] = useState("asc");

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
    setComment(rock?.comment || ""); // <-- set comment on open
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !rockNumber ||
      selectedArtistKeys.length === 0 ||
      (!selectedRock && !imageFile)
    ) {
      alert("All fields are required except comment.");
      return;
    }

    const formData = new FormData();
    formData.append("rock_number", rockNumber);
    formData.append("artist_keys", JSON.stringify(selectedArtistKeys));
    formData.append("comment", comment); // <-- append comment to formData
    if (imageFile) formData.append("image", imageFile);

    if (selectedRock) {
      await axios.put(`/api/rocks/${selectedRock.rc_key}`, formData);
    } else {
      await axios.post("/api/rocks", formData);
    }

    loadRocks();
    closeDialog();
  };

  const handleDelete = async (rc_key) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`/api/rocks/${rc_key}`);
    loadRocks();
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
    return sortDir === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  return (
    <div className="rocks-container">
      <div className="rocks-header">
        <h2>Rock Catalog</h2>
        <button className="create-button" onClick={() => openDialog(null)}>
          + Create Rock
        </button>
      </div>

      <table className="rocks-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort("rock_number")}>Rock Number</th>
            <th onClick={() => toggleSort("artists")}>Artists</th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRocks.map((rock) => (
            <tr key={rock.rc_key}>
              <td>{rock.rock_number}</td>
              <td>{rock.artists.map((a) => a.display_name).join(", ")}</td>
              <td>
                <img
                  src={`/media/catalog/${rock.rock_number}/a_sm.webp`}
                  alt=""
                  className="rock-thumb"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </td>
              <td>
                <button onClick={() => openDialog(rock)}>Edit</button>
                <button onClick={() => handleDelete(rock.rc_key)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dialogOpen && (
        <>
          <div className="dialog-overlay"></div>
          <div className="dialog">
            <h3>{selectedRock ? "Edit Rock" : "Create Rock"}</h3>
            <form onSubmit={handleSubmit}>
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
                    Array.from(e.target.selectedOptions, (o) =>
                      parseInt(o.value)
                    )
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

              <label>Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Add optional comment here..."
              ></textarea>

              <div className="dialog-buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={closeDialog}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Rocks;
