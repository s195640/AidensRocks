// Today's date as YYYY-MM-DD in the visitor's own timezone (what an
// <input type="date"> expects). toISOString() is UTC, which in the US
// evening is already tomorrow.
export function todayLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// A timestamptz from the API (UTC ISO string) as "YYYY-MM-DD HH:MM" in the
// viewer's own timezone. Slicing the raw string shows UTC, hours ahead in
// the US. Not for "timestamp without time zone" columns (e.g. journey.date),
// which have no offset to convert.
export function formatLocalDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${todayLocal(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
