import { useEffect, useState } from "react";
import styles from "./JourneyAdmin.module.css";

const JourneyAdmin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("rock_number");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"

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

  // Called when header clicked to set sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // toggle order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Compare function for sorting by field
  const comparePosts = (a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Normalize for undefined/null
    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    // Special case for date (string to Date)
    if (sortField === "date") {
      valA = valA ? new Date(valA) : new Date(0);
      valB = valB ? new Date(valB) : new Date(0);
    }

    // Special case for show (boolean)
    if (sortField === "show") {
      valA = valA ? 1 : 0;
      valB = valB ? 1 : 0;
    }

    // Compare numbers
    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    // Compare strings case-insensitive
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  };

  const sortedPosts = [...posts].sort(comparePosts);

  // Render sort arrow next to header
  const renderSortArrow = (field) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  // your handleToggleShow, handleDelete, handleEdit...

  return (
    <div className={styles.container}>
      <h2>Journey Posts Admin</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className={styles.albumTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort("rock_number")} style={{ cursor: "pointer" }}>
                Rock Number{renderSortArrow("rock_number")}
              </th>
              <th onClick={() => handleSort("location")} style={{ cursor: "pointer" }}>
                Location{renderSortArrow("location")}
              </th>
              <th onClick={() => handleSort("date")} style={{ cursor: "pointer" }}>
                Date{renderSortArrow("date")}
              </th>
              <th onClick={() => handleSort("comment")} style={{ cursor: "pointer" }}>
                Comment{renderSortArrow("comment")}
              </th>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Name{renderSortArrow("name")}
              </th>
              <th onClick={() => handleSort("email")} style={{ cursor: "pointer" }}>
                Email{renderSortArrow("email")}
              </th>
              <th>UUID</th>
              <th onClick={() => handleSort("show")} style={{ cursor: "pointer" }}>
                Show{renderSortArrow("show")}
              </th>
              <th onClick={() => handleSort("total_images")} style={{ cursor: "pointer" }}>
                Total Images{renderSortArrow("total_images")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center" }}>
                  No posts found
                </td>
              </tr>
            ) : (
              sortedPosts.map((post) => (
                <tr key={post.rps_key}>
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
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JourneyAdmin;
