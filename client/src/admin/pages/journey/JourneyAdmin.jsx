import { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import styles from "./JourneyAdmin.module.css";
import EditJourneyDialog from "./EditJourneyDialog";

const JourneyAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("coordinates");
  const [sortOrder, setSortOrder] = useState("asc");
  const [editingPost, setEditingPost] = useState(null);
  const [popupRockNumber, setPopupRockNumber] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/journey-admin");
      if (!res.ok) throw new Error("Failed to fetch journey posts");
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const comparePosts = (a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    if (sortField === "date") {
      valA = valA ? new Date(valA) : new Date(0);
      valB = valB ? new Date(valB) : new Date(0);
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    if (sortField === "show") {
      valA = valA ? 1 : 0;
      valB = valB ? 1 : 0;
    }

    if (sortField === "coordinates") {
      valA = a.latitude && a.longitude ? `${a.latitude},${a.longitude}` : "";
      valB = b.latitude && b.longitude ? `${b.latitude},${b.longitude}` : "";
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  };

  const sortedPosts = [...posts].sort(comparePosts);

  const renderSortArrow = (field) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const handleToggleShow = async (rps_key, currentShow) => {
    try {
      const res = await fetch(`/api/journey-admin/${rps_key}/toggle-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show: !currentShow }),
      });
      if (!res.ok) throw new Error("Toggle show failed");
      setPosts((posts) =>
        posts.map((post) =>
          post.rps_key === rps_key ? { ...post, show: !currentShow } : post
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (rps_key) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/journey-admin/${rps_key}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPosts((posts) => posts.filter((post) => post.rps_key !== rps_key));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
  };

  const openImagePopup = (rock_number) => {
    setPopupRockNumber(rock_number);
  };

  const closeImagePopup = () => {
    setPopupRockNumber(null);
  };

  return (
    <div className={styles.container}>
      <h2>Journey Posts Admin</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className={styles.albumTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th onClick={() => handleSort("rock_number")}>Rock{renderSortArrow("rock_number")}</th>
              <th onClick={() => handleSort("location")}>Location{renderSortArrow("location")}</th>
              <th onClick={() => handleSort("coordinates")}>Coordinates{renderSortArrow("coordinates")}</th>
              <th onClick={() => handleSort("date")}>Date{renderSortArrow("date")}</th>
              <th onClick={() => handleSort("comment")}>Comment{renderSortArrow("comment")}</th>
              <th onClick={() => handleSort("name")}>Name{renderSortArrow("name")}</th>
              <th onClick={() => handleSort("email")}>Email{renderSortArrow("email")}</th>
              <th>UUID</th>
              <th onClick={() => handleSort("show")}>Show{renderSortArrow("show")}</th>
              <th onClick={() => handleSort("total_images")}>Images{renderSortArrow("total_images")}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center" }}>
                  No posts found
                </td>
              </tr>
            ) : (
              sortedPosts.map((post) => (
                <tr key={post.rps_key}>
                  <td>
                    <img
                      src={`/media/catalog/${post.rock_number}/a_sm.webp`}
                      alt={`Rock ${post.rock_number}`}
                      className={styles.thumbnail}
                      onClick={() => openImagePopup(post.rock_number)}
                    />
                  </td>
                  <td>{post.rock_number}</td>
                  <td>{post.location || "-"}</td>
                  <td>
                    {post.latitude && post.longitude
                      ? `${post.latitude}, ${post.longitude}`
                      : "-"}
                  </td>
                  <td>{post.date ? post.date.replace("T", " ").slice(0, 16) : "-"}</td>
                  <td>{post.comment || "-"}</td>
                  <td>{post.name || "-"}</td>
                  <td>{post.email || "-"}</td>
                  <td>{post.uuid}</td>
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={post.show}
                      onChange={() => handleToggleShow(post.rps_key, post.show)}
                    />
                  </td>
                  <td>{post.total_images ?? 0}</td>
                  <td>
                    <div className={styles.actionsWrapper}>
                      <button onClick={() => handleEdit(post)} title="Edit">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(post.rps_key)} title="Delete">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {editingPost && (
        <EditJourneyDialog
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={() => {
            fetchPosts();
            setEditingPost(null);
          }}
        />
      )}

      {popupRockNumber && (
        <div className={styles.imagePopupOverlay} onClick={closeImagePopup}>
          <div className={styles.imagePopup} onClick={(e) => e.stopPropagation()}>
            <img
              src={`/media/catalog/${popupRockNumber}/a.webp`}
              alt={`Rock ${popupRockNumber}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyAdmin;
