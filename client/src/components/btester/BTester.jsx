import { useState } from "react";

const BTester = () => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testBackend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    console.log(import.meta.env.VITE_API_URL);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/test`, {
        method: "GET", // or 'POST', depending on your backend
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
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
