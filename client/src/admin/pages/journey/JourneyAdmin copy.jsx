import { useEffect, useState } from "react";
import styles from "./JourneyAdmin.module.css";
import EditJourneyDialog from "./EditJourneyDialog";

const JourneyAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popupRockNumber, setPopupRockNumber] = useState(null); // to hold rock_number for modal
  const [editingPost, setEditingPost] = useState(null);


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
        <>
          <table className={styles.albumTable}>
            <thead>
              <tr>
                <th>Image</th> {/* New image column */}
                <th>Rock Number</th>
                <th>Location</th>
                <th>Date</th>
                <th>Comment</th>
                <th>Name</th>
                <th>Email</th>
                <th>UUID</th>
                <th>Show</th>
                <th>Total Images</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center" }}>
                    No posts found
                  </td>
                </tr>
              ) : (
                posts
                  .sort((a, b) => {
                    if (a.rock_number !== b.rock_number)
                      return a.rock_number - b.rock_number;
                    return new Date(a.date) - new Date(b.date);
                  })
                  .map((post) => {
                    const thumbUrl = `/media/catalog/${post.rock_number}/a_sm.webp`;
                    const fullUrl = `/media/catalog/${post.rock_number}/a.webp`;

                    return (
                      <tr key={post.rps_key}>
                        <td>
                          <img
                            src={thumbUrl}
                            alt={`Rock ${post.rock_number}`}
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: "cover",
                              cursor: "pointer",
                              borderRadius: 4,
                            }}
                            onClick={() => openImagePopup(post.rock_number)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/placeholder-50x50.png"; // fallback placeholder
                            }}
                          />
                        </td>
                        <td>{post.rock_number}</td>
                        <td>{post.location || "-"}</td>
                        <td>{post.date ? new Date(post.date).toLocaleDateString() : "-"}</td>
                        <td>{post.comment || "-"}</td>
                        <td>{post.name || "-"}</td>
                        <td>{post.email || "-"}</td>
                        <td>{post.uuid}</td>
                        <td>{post.show ? "Yes" : "No"}</td>
                        <td>{post.total_images ?? 0}</td>
                        <td className={styles.actionsCol}>
                          <button onClick={() => handleToggleShow(post.rps_key, post.show)}>
                            {post.show ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => handleEdit(post)}>Edit</button>
                          <button onClick={() => handleDelete(post.rps_key)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>

          {/* Image popup modal */}
          {popupRockNumber && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              }}
              onClick={closeImagePopup}
            >
              <div
                style={{
                  position: "relative",
                  backgroundColor: "#fff",
                  padding: 10,
                  borderRadius: 6,
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={`/media/catalog/${popupRockNumber}/a.webp`}
                  alt={`Rock ${popupRockNumber}`}
                  style={{
                    maxWidth: "80vw",
                    maxHeight: "80vh",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/placeholder-400x400.png"; // fallback placeholder
                  }}
                />
                <button
                  onClick={closeImagePopup}
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    background: "transparent",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                  aria-label="Close full image"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </>
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

    </div>
  );
};

export default JourneyAdmin;
