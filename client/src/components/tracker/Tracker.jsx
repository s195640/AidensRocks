import axios from "axios";
import { useEffect } from "react";
import { useARContext } from "../../context/ARContext";

const Tracker = () => {
  const { setTrackerData } = useARContext();

  useEffect(() => {
    const baseClientData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language || navigator.userLanguage,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      },
      referrer: document.referrer || "Direct",
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ipAddress: "Unknown",
      geo: null,
    };

    const finalizeAndStore = (clientData) => {
      setTrackerData(clientData);
    };

    const fetchIpAndGeo = async () => {
      const clientData = { ...baseClientData };

      try {
        const response = await axios.get("/api/ip");
        clientData.ipAddress = response.data.ip || "Unknown";
      } catch (error) {
        // console.error("Error fetching IP:", error);
      }

      const handleFinalLog = () => finalizeAndStore(clientData);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clientData.geo = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            handleFinalLog();
          },
          (error) => {
            // console.error("Geolocation error:", error.message);
            handleFinalLog();
          }
        );
      } else {
        // console.warn("Geolocation not supported");
        handleFinalLog();
      }
    };

    fetchIpAndGeo();
  }, [setTrackerData]);

  return null;
};

export default Tracker;
