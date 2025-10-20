import React from "react";
import Table from "../../../../components/simple-components/table/Table";
import { FaEdit, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./AlbumsTable.module.css";

const AlbumsTable = ({
  albums,
  handleToggleShow,
  handleDelete,
  handleEdit,
  handleReorder,
  openFullImageDialog,
  loading,
  openImagesLightbox
}) => {
  const columns = [
    { key: "image", label: "Image", sortable: false, defaultWidth: 60 },
    { key: "name", label: "Name", sortable: false, defaultWidth: 120 },
    { key: "display_name", label: "Display Name", sortable: false, defaultWidth: 150 },
    { key: "desc", label: "Description", sortable: false, defaultWidth: 200 },
    { key: "show", label: "Show", sortable: false, defaultWidth: 60 },
    { key: "count", label: "Count", sortable: false, defaultWidth: 60 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 120 },
  ];

  const renderCell = (album, key) => {
    switch (key) {
      case "image":
        const imageUrl = album.first_image_name
          ? `/media/albums/${album.name}/webp300x300/${album.first_image_name}`
          : null;
        return imageUrl ? (
          <div className={styles.thumbWrapper}>
            <img
              src={imageUrl}
              alt={album.display_name || album.name}
              className={styles.thumb}
              onClick={() => openFullImageDialog(album)}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
        ) : (
          <div className={styles.thumbPlaceholder} />
        );

      case "show":
        return album.show ? "Yes" : "No";

      case "actions":
        return (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <FaEye
              size={20}
              style={{
                color: album.show ? "gray" : "#5cb85c",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => handleToggleShow(album.pa_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title={album.show ? "Disable" : "Enable"}
            />
            <FaEdit
              size={20}
              style={{ color: "#5bc0de", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleEdit(album)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title="Edit"
            />
            <FaTrash
              size={20}
              style={{ color: "red", cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => handleDelete(album.pa_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              title="Delete"
            />
          </div>
        );

      case "count":
        return (
          <div className={styles.countCol}>
            {album.count > 0 ? (
              <button
                className={styles.imageButton}
                onClick={() => openImagesLightbox(album)}
              >
                Images {album.count}
              </button>
            ) : (
              "-"
            )}
          </div>
        );

      default:
        return album[key];
    }
  };

  return (
    <Table
      columns={columns}
      data={albums}
      renderCell={renderCell}
      enableRowDrag
      onRowReorder={(newData) => handleReorder(newData.map(i => i.pa_key))}
      loading={loading}
    />
  );
};

export default AlbumsTable;
