// Records a search typed into a live (no-submit) box, once the visitor
// stops typing for 1.5 seconds or leaves the box -- so typing "1", "12",
// "123" records one search for 123 (Site Tracking: rock_search on the map,
// my_rocks_search). Empty values and repeats of the last one are skipped.
// The input itself is untouched; this only watches its value.
//
// Returns a function to use as the input's onBlur.
import { useCallback, useEffect, useRef } from "react";

const IDLE_MS = 1500;

export default function useTypedSearch(value, record) {
  const last = useRef("");
  const timer = useRef(null);
  const recordRef = useRef(record);
  recordRef.current = record;

  const commit = useCallback(() => {
    clearTimeout(timer.current);
    const v = String(value ?? "").trim();
    if (!v || v === last.current) return;
    last.current = v;
    try {
      recordRef.current(v);
    } catch {
      // tracking must never break the input
    }
  }, [value]);

  useEffect(() => {
    timer.current = setTimeout(commit, IDLE_MS);
    return () => clearTimeout(timer.current);
  }, [commit]);

  return commit;
}
