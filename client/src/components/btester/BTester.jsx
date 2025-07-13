import axios from "axios";
import { useState } from "react";

const BTester = () => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testBackend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const response = await axios.get(`/api/test`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setResponse(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <button onClick={testBackend} disabled={loading}>
        {loading ? "Testing..." : "Test Backend"}
      </button>
      {response && (
        <div>
          <h3>Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div style={{ color: "red" }}>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default BTester;
