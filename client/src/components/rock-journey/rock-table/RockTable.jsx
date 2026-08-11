// src/components/RockTable.jsx
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import RockJourney from "../RockJourney";
import "./RockTable.css";

const PAGE_SIZE = 25;

const RockTable = () => {
  const [groupedRocks, setGroupedRocks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRocks, setTotalRocks] = useState(null);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef(null);

  // Fetch one page at a time, appending onto what's already loaded (page 1
  // replaces, since it's also the "start over" case for a fresh mount).
  useEffect(() => {
    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/rock-posts", {
          params: { page, pageSize: PAGE_SIZE },
        });
        if (cancelled) return;

        const { rows, totalRocks: total } = res.data;
        const grouped = new Map();
        rows.forEach((entry) => {
          if (!grouped.get(entry.rock_number)) {
            grouped.set(entry.rock_number, []);
          }
          grouped
            .get(entry.rock_number)
            .push({ ...entry, path: `/media/rocks/${entry.rock_number}/${entry.uuid}` });
        });
        const pageRocks = Array.from(grouped).map(([key, value]) => ({ key, value }));

        setGroupedRocks((prev) => (page === 1 ? pageRocks : [...prev, ...pageRocks]));
        setTotalRocks(total);
      } catch (error) {
        console.error("Error fetching rock post data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const hasMore = totalRocks === null || groupedRocks.length < totalRocks;

  // Advance to the next page once the sentinel at the bottom of the list
  // scrolls into view. Re-armed whenever loading/hasMore change so it keeps
  // pulling in more pages back-to-back if the sentinel is still on-screen
  // right after a page finishes loading (e.g. a tall viewport).
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div>
      <div className="rock-table">
        {groupedRocks.map((i) => (
          <RockJourney key={i.key} rockNumber={i.key} collections={i.value} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="rock-table-sentinel">
          {loading && (
            <span className="rock-table-loading">
              {groupedRocks.length === 0 ? "Loading rocks…" : "Loading more rocks…"}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RockTable;
