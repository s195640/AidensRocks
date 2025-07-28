// src/components/CreateImages.jsx
import axios from "axios";
import { useState } from "react";
import "./CreateImages.css";

const CreateImages = () => {
  const [path, setPath] = useState(".");
  const [status, setStatus] = useState("");

  const handleStart = async () => {
    setStatus("Processing...");
    try {
      const response = await axios.post("/api/create-images", { path });
      setStatus(`✅ Success: ${response.data.message}`);
    } catch (error) {
      const errMsg = error.response?.data?.error || "Something went wrong";
      setStatus(`❌ Error: ${errMsg}`);
    }
  };

  return (
    <div className="create-images-box">
      <h2>Create Images</h2>
      <label htmlFor="path-input">Path:</label>
      <input
        id="path-input"
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Enter image path"
      />
      <button onClick={handleStart}>Start</button>
      {status && <p className="status-message">{status}</p>}
    </div>
  );
};

export default CreateImages;
