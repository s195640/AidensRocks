// Today's date as YYYY-MM-DD in the visitor's own timezone (what an
// <input type="date"> expects). toISOString() is UTC, which in the US
// evening is already tomorrow.
export function todayLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
