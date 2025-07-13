// TestDataComponent.jsx
import axios from "axios";
import { useState } from "react";

const TestDataComponent = () => {
  const [rowCount, setRowCount] = useState(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to fetch total number of rows
  const handleRead = async () => {
    console.log("here");
    setLoading(true);
    try {
      const response = await axios.get(`/api/testdata/count`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setRowCount(response.data.count);
      setMessage(`Total rows: ${response.data.count}`);
    } catch (err) {
      console.error("Error fetching row count:", err);
      setMessage(`Error fetching row count: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to post a new row
  const handlePost = async () => {
    if (!comment.trim()) {
      setMessage("Please enter a comment");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `/api/testdata`,
        {
          comment,
          date: new Date().toISOString(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setMessage("Row added successfully");
      setComment("");
      // Refresh row count after successful post
      await handleRead();
    } catch (err) {
      console.error("Error adding row:", err);
      setMessage(`Error adding row: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Test Data Manager</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter comment"
          style={{ marginRight: "10px", padding: "5px" }}
          disabled={loading}
        />
        <button
          onClick={handlePost}
          style={{ marginRight: "10px", padding: "5px 10px" }}
          disabled={loading}
        >
          {loading ? "Posting..." : "Post"}
        </button>
        <button
          onClick={handleRead}
          style={{ padding: "5px 10px" }}
          disabled={loading}
        >
          {loading ? "Reading..." : "Read"}
        </button>
      </div>

      {message && (
        <p style={{ color: message.includes("Error") ? "red" : "green" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default TestDataComponent;
