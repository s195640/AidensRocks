import { useMemo, useState } from "react";
import Table from "../../../../components/simple-components/table/Table";
import { FaEdit, FaTrash } from "react-icons/fa";
import Dialog from "../../../../components/simple-components/dialog/Dialog";
import styles from "./JourneyAdminTable.module.css";

const JourneyAdminTable = ({
  posts,
  handleToggleShow,
  handleDelete,
  handleEdit,
  openImageDialog,
  openImagesLightbox,
}) => {
  const [commentDialog, setCommentDialog] = useState({ open: false, text: "" });

  const _data = posts.map((u) => ({
    ...u,
    _coordinates:
      u.latitude && u.longitude
        ? `${Math.trunc(u.latitude * 1e2) / 1e2}, ${Math.trunc(
          u.longitude * 1e2
        ) / 1e2}`
        : "",
    _comment:
      u.comment && u.comment.length > 150
        ? `${u.comment.substring(0, 150)} (...)`
        : u.comment,
  }));

  const columns = useMemo(
    () => [
      { key: "image", label: "Image", defaultWidth: 50, sortable: false },
      { key: "rock_number", label: "Rock", defaultWidth: 60, sortable: true },
      { key: "location", label: "Location", sortable: true },
      {
        key: "coordinates",
        label: "Coordinates",
        sortable: true,
        sortValue: (row) => row._coordinates,
      },
      { key: "date", label: "Date", defaultWidth: 120, sortable: true },
      {
        key: "comment",
        label: "Comment",
        sortable: true,
        sortValue: (row) => row._comment,
      },
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "show", label: "Show", defaultWidth: 50, sortable: true },
      {
        key: "total_images",
        label: "Images",
        defaultWidth: 80,
        sortable: true,
      },
      { key: "actions", label: "Actions", defaultWidth: 80, sortable: false },
    ],
    []
  );

  const renderCell = (post, colKey) => {
    switch (colKey) {
      case "image":
        return (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <img
              src={`/media/catalog/${post.rock_number}/a_sm.webp`}
              alt=""
              className={styles.thumb}
              onClick={() => openImageDialog(post.rock_number)}
              onError={(e) => (e.target.style.display = "none")}
              style={{ cursor: "pointer" }}
            />
          </div>
        );

      case "total_images":
        return (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            {post.total_images > 0 ? (
              <button
                className={styles.imageButton}
                onClick={() => openImagesLightbox(post)}
                style={{ fontSize: "0.65rem" }}
              >
                Images {post.total_images}
              </button>
            ) : (
              "-"
            )}
          </div>
        );

      case "coordinates":
        return post._coordinates;

      case "comment":
        return (
          <div
            onClick={() =>
              setCommentDialog({ open: true, text: post.comment || "" })
            }
            style={{ cursor: "pointer" }}
          >
            {post._comment || "-"}
          </div>
        );

      case "date":
        return post.date ? post.date.replace("T", " ").slice(0, 16) : "-";

      case "show":
        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={post.show}
              onChange={() => handleToggleShow(post.rps_key, post.show)}
              className={styles.checkboxCell}
            />
          </div>
        );

      case "actions":
        return (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <FaEdit
              size={20}
              style={{
                color: "#5bc0de",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => handleEdit(post)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
            <FaTrash
              size={20}
              style={{
                color: "red",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => handleDelete(post.rps_key)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>
        );

      default:
        return post[colKey] ?? "-";
    }
  };

  return (
    <>
      <Table
        columns={columns}
        data={_data}
        renderCell={renderCell}
        fontSize={"0.65rem"}
        defaultSort={{ key: "coordinates", direction: "asc" }}
      />

      <Dialog
        isOpen={commentDialog.open}
        onClose={() => setCommentDialog({ open: false, text: "" })}
      >
        <div className={styles.commentDialog}>
          <div className={styles.commentDialogHeader}>
            <h3>Full Comment</h3>
            <button
              className={styles.closeButton}
              onClick={() => setCommentDialog({ open: false, text: "" })}
            >
              ✕
            </button>
          </div>
          <div className={styles.commentDialogContent}>
            {commentDialog.text || "(No comment)"}
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default JourneyAdminTable;
