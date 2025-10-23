import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./MusicAdmin.module.css";
import MusicTable from "./music-table/MusicTable";
import AdminContainer from "../../components/admin-base/AdminContainer";
import MusicSingleLightbox from "./music-single-lightbox/MusicSingleLightbox";
import MusicCreateEditDlg from "./music-create-edit-dlg/MusicCreateEditDlg";

const MusicAdmin = () => {
  const [fullImage, setFullImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/music");
      setSongs(data);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const openFullImageDialog = (fullImg) => setFullImage(fullImg);

  const openDialog = (song = null) => {
    setEditingSong(song);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingSong(null);
    setDialogOpen(false);
  };

  // centralized save method
  const handleSave = async ({ m_key = null, data, toggleShow = null }) => {
    setLoading(true);
    try {
      if (toggleShow !== null) {
        // toggle show
        await axios.put(`/api/music/${m_key}/toggle-show`, { show: toggleShow });
      } else if (m_key) {
        // update existing song
        await axios.put(`/api/music/${m_key}`, data, {
          headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
        });
      } else {
        // create new song
        await axios.post("/api/music", data, {
          headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
        });
      }

      await fetchSongs(); // refresh list
    } catch (err) {
      console.error("Failed to save song:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (order) => {
    setLoading(true);
    try {
      // await axios.post(`/api/music/reorder`, { order });
      await fetchSongs();
    } catch (err) {
      console.error("Failed to reorder songs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableEnable = async (m_key) => {
    const song = songs.find((s) => s.m_key === m_key);
    if (!song) return;
    await handleSave({ m_key, toggleShow: !song.show });
  };

  const handleDelete = async (m_key) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      setLoading(true);
      await axios.delete(`/api/music/${m_key}`);
      await fetchSongs(); // refresh list
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminContainer>
      <div className={styles.container}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h1>Music Dashboard</h1>
          </div>

          <div className={styles.headerRight}>
            <button className={styles.createButton} onClick={() => openDialog()}>
              + New Music
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <MusicTable
            songs={songs}
            loading={loading}
            handleReorder={handleReorder}
            openFullImageDialog={openFullImageDialog}
            handleDisableEnable={handleDisableEnable}
            handleEdit={openDialog}
            handleDelete={handleDelete}
          />
        )}

        <MusicCreateEditDlg
          isOpen={dialogOpen}
          onClose={closeDialog}
          onSave={handleSave}
          selectedSong={editingSong}
        />

        <MusicSingleLightbox open={fullImage} onClose={() => setFullImage(null)} imageSrc={fullImage} />
      </div>
    </AdminContainer>
  );
};

export default MusicAdmin;
