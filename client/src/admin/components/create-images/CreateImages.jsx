import axios from "axios";
import { useState } from "react";
import "./CreateImages.css";

const CreateImages = () => {
  const [path, setPath] = useState(".");
  const [regenerate, setRegenerate] = useState(false);
  const [status, setStatus] = useState("");

  const handleStart = async () => {
    setStatus("Processing...");
    try {
      const response = await axios.post("/api/create-images", {
        path,
        regenerate,
      });
      setStatus(`✅ Success: ${response.data.message}`);
    } catch (error) {
      const errMsg = error.response?.data?.error || "Something went wrong";
      setStatus(`❌ Error: ${errMsg}`);
    }
  };

  return (
    <div className="create-images-box">
      <h2>Create Images</h2>

      <div className="form-container">
        <div className="form-group">
          <label htmlFor="path-input">Path:</label>
          <input
            id="path-input"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Enter image path"
          />
        </div>

        <div className="form-group checkbox-row">
          <input
            type="checkbox"
            id="regenerate-checkbox"
            checked={regenerate}
            onChange={() => setRegenerate(!regenerate)}
          />
          <label htmlFor="regenerate-checkbox">Regenerate Images</label>
        </div>

        <button onClick={handleStart}>Start</button>
      </div>

      {status && <p className="status-message">{status}</p>}
    </div>
  );
};

export default CreateImages;
