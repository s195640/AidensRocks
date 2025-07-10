import { useEffect, useState } from "react";

const Tracker = () => {
  const [geoData, setGeoData] = useState(null);
  const [ipAddress, setIpAddress] = useState("Unknown");

  // Function to collect and log client data
  useEffect(() => {
    // Basic browser and device info
    const clientData = {
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
    };

    // Fetch IP address from backend
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/ip`)
      .then((res) => res.json())
      .then((data) => {
        setIpAddress(data.ip);
        clientData.ipAddress = data.ip; // Update clientData with IP
        console.log("Client Data:", clientData);
      })
      .catch((error) => {
        console.error("Error fetching IP:", error);
        console.log("Client Data:", clientData);
      });

    // Log basic data
    // console.log("Client Data:", clientData);

    // Geolocation (requires user permission)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setGeoData(geo);
          console.log("Geolocation:", geo);
        },
        (error) => {
          console.error("Geolocation Error:", error.message);
        }
      );
    } else {
      console.log("Geolocation not supported by this browser.");
    }
    // Track page load event
    console.log("Page Loaded:", window.location.pathname);
    return () => {};
  }, []); // Runs once on mount

  return <></>;
};

export default Tracker;
