import axios from "axios";
import { useState } from "react";
import Job from "../../components/job/Job";
import styles from "./CreateImages.module.css";

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
    <Job title="Create Images">
      <div className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label htmlFor="path-input" className={styles.label}>
            Path:
          </label>
          <input
            id="path-input"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Enter image path"
            className={styles.textInput}
          />
        </div>

        <div className={`${styles.formGroup} ${styles.checkboxRow}`}>
          <input
            type="checkbox"
            id="regenerate-checkbox"
            checked={regenerate}
            onChange={() => setRegenerate(!regenerate)}
            className={styles.checkboxInput}
          />
          <label htmlFor="regenerate-checkbox" className={styles.checkboxLabel}>
            Regenerate Images
          </label>
        </div>

        <button onClick={handleStart} className={styles.button}>
          Start
        </button>
      </div>

      {status && <p className={styles.statusMessage}>{status}</p>}
    </Job>
  );
};

export default CreateImages;
