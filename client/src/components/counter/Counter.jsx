import axios from "axios";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useARContext } from "../../context/ARContext";

const Counter = () => {
  const { trackerData, rValue, setRValue } = useARContext();
  const [rockNumberQr, setRockNumberQr] = useState("");
  const [sessionId, setSessionId] = useState(null);

  // Generate or retrieve a session ID and rValue from session
  useEffect(() => {
    let existingSessionId = sessionStorage.getItem("session_id");
    if (!existingSessionId) {
      existingSessionId = uuidv4();
      sessionStorage.setItem("session_id", existingSessionId);
    }
    setSessionId(existingSessionId);

    const storedQr = sessionStorage.getItem("rock_num_qr");
    if (storedQr) {
      setRockNumberQr(storedQr);
      setRValue(storedQr); // keep context in sync
    }
  }, []);

  // Keep local state in sync if rValue changes later
  useEffect(() => {
    if (rValue) {
      setRockNumberQr(String(rValue));
    }
  }, [rValue]);

  // Fire tracking POST only once per session
  useEffect(() => {
    const hasPosted = sessionStorage.getItem("rock_count_sent") === "true";
    if (!trackerData || hasPosted || !sessionId) return;

    const postData = async () => {
      try {
        await axios.post("/api/rock-count", {
          rock_qr_number: rockNumberQr || "", // can be empty
          ...trackerData,
          page_url: window.location.href,
          session_id: sessionId,
        });
        sessionStorage.setItem("rock_count_sent", "true");
      } catch (error) {
        console.error("Error sending rock tracking data:", error);
      }
    };

    postData();
  }, [trackerData, rockNumberQr, sessionId]);

  return null;
};

export default Counter;
