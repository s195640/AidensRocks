import { useEffect, useState } from "react";
import axios from "axios";
import RockPopup from "./RockPopup";

// Fetches a rock's journey entries and renders the same RockPopup that
// RockImage opens when its thumbnail (top-left of a RockBanner) is
// clicked -- for call sites that only have a rock number on hand (no
// RockJourney/collections already computed nearby), e.g. the Rock Requests
// admin table. Mirrors RockJourney.jsx's/RockMapPopup.jsx's own
// totalTrips/startDate/latestDate/artists derivation from the same
// GET /api/rock-posts/:rockNumber endpoint, so the numbers shown here
// match what the public site already shows for this rock.
export default function RockPopupByNumber({ rockNumber, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!rockNumber) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setStats(null);

    axios
      .get(`/api/rock-posts/${rockNumber}`)
      .then((res) => {
        if (cancelled) return;
        const entries = res.data || [];
        setStats({
          totalTrips: entries.length,
          startDate: entries[0]?.date,
          latestDate: entries[entries.length - 1]?.date,
          artists: entries[0]?.artists || [],
        });
      })
      .catch((err) => {
        console.error("Failed to load rock data:", err);
        if (!cancelled) {
          setStats({ totalTrips: 0, startDate: undefined, latestDate: undefined, artists: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rockNumber]);

  if (!rockNumber || !stats) return null;

  return (
    <RockPopup
      rockNumber={rockNumber}
      totalTrips={stats.totalTrips}
      startDate={stats.startDate}
      latestDate={stats.latestDate}
      artists={stats.artists}
      onClose={onClose}
    />
  );
}
