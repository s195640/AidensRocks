//MusicTable
import React, { useState, useMemo } from "react";
import Table from "../../../../components/simple-components/table/Table";
import { FaEdit, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./MusicTable.module.css";

const MusicTable = ({
  songs,
  loading,
  handleReorder,
  openFullImageDialog,
  handleDisableEnable,
  handleEdit,
  handleDelete,
}) => {
  const [lyricsDialog, setLyricsDialog] = useState({ open: false, text: "" });

  // Prepare data with truncated lyrics
  const _data = useMemo(
    () =>
      songs.map((song) => ({
        ...song,
        _lyrics:
          song.lyrics && song.lyrics.length > 150
            ? `${song.lyrics.substring(0, 150)} (...)`
            : song.lyrics,
      })),
    [songs]
  );

  const columns = [
    { key: "image", label: "Image", sortable: false, defaultWidth: 60 },
    { key: "name", label: "Title", sortable: false, defaultWidth: 120 },
    { key: "writer", label: "Writer", sortable: false, defaultWidth: 150 },
    { key: "lyrics", label: "Lyrics", sortable: false, defaultWidth: 200 },
    { key: "update_dt", label: "Date", sortable: false, defaultWidth: 65 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 100 },
  ];

  const renderCell = (song, key) => {
    switch (key) {
      case "image":
        return song.img ? (
          <div className={styles.thumbWrapper}>
            <img
              src={song.img}
              alt={song.name}
              className={styles.thumb}
              onClick={() => openFullImageDialog(song.fullImg)}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
        ) : (
          <div className={styles.thumbPlaceholder} />
        );

      case "lyrics":
        return (
          <div
            style={{ cursor: "pointer" }}
            onClick={() =>
              setLyricsDialog({ open: true, text: song.lyrics || "" })
            }
          >
            {_data.find((s) => s.m_key === song.m_key)?._lyrics || "-"}
          </div>
        );

      case "actions":
        return (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <FaEye
              size={20}
              style={{
                color: song.show ? "gray" : "#5cb85c",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => handleDisableEnable(song.m_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title={song.show ? "Disable" : "Enable"}
            />
            <FaEdit
              size={20}
              style={{ color: "#5bc0de", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleEdit(song)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title="Edit"
            />
            <FaTrash
              size={20}
              style={{ color: "red", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleDelete(song.m_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title="Delete"
            />
          </div>
        );

      case "update_dt":
        return song.update_dt ? new Date(song.update_dt).toLocaleDateString() : "";

      default:
        return song[key];
    }
  };

  return (
    <>
      <Table
        columns={columns}
        data={_data}
        renderCell={renderCell}
        enableRowDrag
        onRowReorder={(newData) => handleReorder(newData.map((i) => i.pa_key))}
        loading={loading}
      />

      <Dialog
        isOpen={lyricsDialog.open}
        onClose={() => setLyricsDialog({ open: false, text: "" })}
        title="Lyrics"
        buttonPanel={<button
          className={styles.closeButton}
          onClick={() => setLyricsDialog({ open: false, text: "" })}
        >
          ✕
        </button>}
      >
        <div className={styles.lyricsText}>
          {lyricsDialog.text || "(No lyrics)"}
        </div>
      </Dialog>
    </>
  );
};

export default MusicTable;
