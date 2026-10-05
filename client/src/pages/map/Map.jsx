import { useEffect, useState } from "react";
import axios from "axios";
import RockMap from "../../components/rock-map/RockMap";
import { useAuth } from "../../admin/context/AuthContext";
import useFollowedRocks from "../../hooks/useFollowedRocks";
import styles from "./Map.module.css";

const Map = () => {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isUser } = useAuth();
  const { followedSet } = useFollowedRocks();

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const res = await axios.get("/api/rock-posts/locations/all");
        // Transform API data into pin format expected by RockMap
        const pinData = res.data.map((row) => ({
          id: row.rps_key,
          coords: [row.latitude, row.longitude],
          label: row.rock_number.toString(),
          year: row.date ? new Date(row.date).getFullYear() : null,
        }));
        setPins(pinData);
      } catch (err) {
        console.error("Error fetching pins:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPins();
  }, []);

  return (
    <div>
      {loading && (
        <div className={styles.loadingBackdrop}>
          <div className={styles.loadingBox}>
            <div className={styles.spinner}></div>
            <p>Loading Rock Locations...</p>
          </div>
        </div>
      )}

      {!loading && (
        <RockMap pins={pins} followedSet={followedSet} canFilterFollowed={isUser} />
      )}
    </div>
  );
};

export default Map;
