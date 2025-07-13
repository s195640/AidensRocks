import axios from "axios";
import { useState } from "react";

const TestFile = () => {
  const [filename, setFilename] = useState("");
  const [comment, setComment] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [message, setMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  const writeFile = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/write-file`, {
        filename,
        content: comment,
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.error || "Error writing file");
    }
  };

  const readFile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/read-file/${filename}`);
      setFileContent(response.data.content);
      setMessage("File read successfully");
    } catch (error) {
      setFileContent(error.response?.data?.error || "Error reading file");
    }
  };

  return (
    <div>
      <h2>File Read/Write</h2>
      <div>
        <label>
          Filename:
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g., test.txt"
          />
        </label>
      </div>
      <div>
        <label>
          Comment:
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter content to write"
          />
        </label>
      </div>
      <button onClick={writeFile}>Write File</button>
      <button onClick={readFile}>Read File</button>
      {message && <p>{message}</p>}
      {fileContent && (
        <div>
          <h3>File Content:</h3>
          <pre>{fileContent}</pre>
        </div>
      )}
    </div>
  );
};

export default TestFile;
