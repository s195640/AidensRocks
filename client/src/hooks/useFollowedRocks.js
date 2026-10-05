import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../admin/context/AuthContext";

// The signed-in account's followed rock numbers as a Set<number> (empty and
// no request when signed out / below user level). Shared by the map
// (orange pins, "only rocks I follow" filter) and the Follow Rocks page.
export default function useFollowedRocks() {
  const { isUser } = useAuth();
  const [followedSet, setFollowedSet] = useState(() => new Set());

  const reload = useCallback(async () => {
    if (!isUser) {
      setFollowedSet(new Set());
      return;
    }
    try {
      const { data } = await axios.get("/api/follows/ids");
      setFollowedSet(new Set(data.map(Number)));
    } catch (err) {
      console.error("Failed to load followed rocks:", err);
    }
  }, [isUser]);

  useEffect(() => {
    reload();
  }, [reload]);

  const follow = useCallback(async (rockNumber) => {
    await axios.post("/api/follows", { rockNumber });
    setFollowedSet((prev) => new Set(prev).add(Number(rockNumber)));
  }, []);

  const unfollow = useCallback(async (rockNumber) => {
    await axios.delete(`/api/follows/${rockNumber}`);
    setFollowedSet((prev) => {
      const next = new Set(prev);
      next.delete(Number(rockNumber));
      return next;
    });
  }, []);

  return { followedSet, follow, unfollow, reload };
}
