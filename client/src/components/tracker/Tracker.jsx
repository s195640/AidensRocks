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

      // IP-based lookup (server/src/routes/misc.js, geoip-lite) instead of
      // navigator.geolocation.getCurrentPosition() -- gives approximate
      // country/region/city/lat-lng without ever prompting the visitor for
      // location permission. Left null (its existing default) whenever the
      // IP can't be resolved (e.g. localhost/private IPs in dev), same
      // graceful-degradation shape as before.
      try {
        const geoResponse = await axios.get("/api/location");
        const { country, region, city, ll } = geoResponse.data;
        clientData.geo = {
          country: country || null,
          region: region || null,
          city: city || null,
          latitude: ll?.[0] ?? null,
          longitude: ll?.[1] ?? null,
        };
      } catch (error) {
        // console.error("Location lookup error:", error.message);
      }

      finalizeAndStore(clientData);
    };

    fetchIpAndGeo();
  }, [setTrackerData]);

  return null;
};

export default Tracker;
