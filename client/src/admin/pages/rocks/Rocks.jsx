import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./Rocks.module.css";
import AdminContainer from "../../components/admin-base/AdminContainer";
import LightboxRock from "../../../components/lightbox-rock/LightboxRock";
import RockCreateEditDlg from "./rock-create-edit-dlg/RockCreateEditDlg";
import RockTable from "./rock-table/RockTable";

const Rocks = () => {
  const [rocks, setRocks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRock, setSelectedRock] = useState(null);
  const [rockNumber, setRockNumber] = useState("");
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

  useEffect(() => {
    loadRocks();
    loadArtists();
  }, []);

  const openDialog = (rock = null) => {
    setSelectedRock(rock);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

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

  const handleEditByNumber = () => {
    const rock = rocks.find((r) => r.rock_number === parseInt(rockNumber));
    if (rock) openDialog(rock);
    else alert(`Rock number ${rockNumber} not found`);
  };

  const totalRocks = rocks.length;
  const totalRocks24h = rocks.filter((r) => new Date(r.create_dt) > Date.now() - 24 * 60 * 60 * 1000).length;
  const totalRocks1h = rocks.filter((r) => new Date(r.create_dt) > Date.now() - 60 * 60 * 1000).length;

  return (
    <AdminContainer>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h2>Rock Catalog</h2>
          <div className={styles.totals}>
            <div>Total Rocks: {totalRocks}</div>
            <div>Total Rocks (last 24h): {totalRocks24h}</div>
            <div>Total Rocks (last 1h): {totalRocks1h}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.createButton} onClick={() => openDialog()}>+ Create Rock</button>
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

      <RockTable rocks={rocks} onEdit={openDialog} onDelete={handleDelete} openImageDialog={openImageDialog} />

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
      />

      <LightboxRock open={imageDialogOpen} onClose={closeImageDialog} imageSrc={imageSrc} />
      {successMessage && <div className={styles.successToast}>{successMessage}</div>}
    </AdminContainer>
  );
};

export default Rocks;
