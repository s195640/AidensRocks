// Shared pieces for the Admin → Activity page panels (Site Tracking): data
// loading, number/time formatting, a panel card, a simple table and a
// per-day chart. Data comes from /api/admin/activity/*
// (server/src/routes/activityAdmin.js).
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./Activity.module.css";

// Categorical colors, fixed per series (never by rank).
export const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];

// Fixed color per device, the same as the Dashboard's Visitors by Day, so
// hiding an empty device doesn't repaint the others. "Other" is gray.
export const PLATFORM_COLORS = {
  Android: "#2a78d6",
  iPhone: "#eb6834",
  iPad: "#1baf7a",
  Mac: "#eda100",
  Windows: "#e87ba4",
  Linux: "#008300",
  Other: "#9a9893",
};

// ------------------------------------------------------------------- data
// Loads one panel; reloads when the shared filters (queryKey) or the
// refresh counter change.
export function useActivityPanel(name, queryKey, refresh) {
  const [state, setState] = useState({ data: null, failed: false });
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/admin/activity/${name}`, { params: JSON.parse(queryKey) })
      .then(({ data }) => !cancelled && setState({ data, failed: false }))
      .catch((err) => {
        console.error(`Error loading activity ${name}:`, err);
        if (!cancelled) setState((s) => ({ ...s, failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [name, queryKey, refresh]);
  return state;
}

// ------------------------------------------------------------- formatting
export const count = (n) => (n == null ? "—" : Number(n).toLocaleString());
export const pct = (n) => (n == null ? "—" : `${Math.round(n)}%`);
export const ratio = (part, whole) => (whole ? pct((100 * part) / whole) : "—");

// 950 -> "0.9s", 42000 -> "42s", 125000 -> "2m 05s", 4000000 -> "1h 06m"
export function duration(ms) {
  if (ms == null) return "—";
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)}s`;
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

const toDate = (day) => new Date(`${day}T00:00:00`);
const shortDate = (day) => toDate(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const monthYear = (day) => toDate(day).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const longDate = (day) =>
  toDate(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

// ------------------------------------------------------------------ panel
export function Panel({ title, note, state, wide, children }) {
  return (
    <section className={`${styles.panel} ${wide ? styles.wide : ""}`}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {note && <p className={styles.panelNote}>{note}</p>}
      {state?.failed && !state.data ? (
        <div className={styles.message}>Couldn&apos;t load this.</div>
      ) : state && !state.data ? (
        <div className={styles.message}>Loading...</div>
      ) : (
        children
      )}
    </section>
  );
}

export function Tiles({ items }) {
  return (
    <div className={styles.tiles}>
      {items.map((t) => (
        <div key={t.label} className={styles.tile}>
          <div className={styles.tileValue}>{t.value}</div>
          <div className={styles.tileLabel}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// columns: [{ key, label, num?, render?(row) }]
export function Table({ columns, rows, empty = "Nothing in this range.", rowKey }) {
  if (!rows?.length) return <div className={styles.message}>{empty}</div>;
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? styles.num : ""} title={c.title}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r) : i}>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? styles.num : ""}>
                  {c.render ? c.render(r) : c.num ? count(r[c.key]) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A row of toggle buttons. options: [{ value, label }]
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? styles.segActive : styles.segBtn}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- charts
// Text stays in ink colors; the swatch carries the series color. Stacked:
// top segment first (matching the columns), empty ones skipped, and the
// day's own total (total.key) last.
function DayTooltip({ active, payload, label, stacked, total }) {
  if (!active || !payload?.length) return null;
  const rows = stacked ? [...payload].filter((p) => p.value > 0).reverse() : payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{longDate(label)}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.swatch} style={{ background: p.color }} />
          <span className={styles.tooltipName}>{p.name}</span>
          <span className={styles.tooltipValue}>{count(p.value)}</span>
        </div>
      ))}
      {total && (
        <div className={`${styles.tooltipRow} ${styles.tooltipSum}`}>
          <span className={styles.tooltipName}>{total.name}</span>
          <span className={styles.tooltipValue}>{count(payload[0].payload[total.key])}</span>
        </div>
      )}
    </div>
  );
}

const axis = { tick: { fill: "#666", fontSize: 12 }, tickLine: false, axisLine: { stroke: "#ddd" } };

// days: [{ date, ...values }]; series: [{ key, name, color? }] (colors by
// position unless given). kind "line" (default) or "stacked" columns; total
// ({ key, name }) adds the day's own total to a stacked chart's tooltip.
export function DayChart({ days, series, kind = "line", height = 260, total }) {
  if (!days?.length) return <div className={styles.message}>Nothing in this range.</div>;
  const tickFormatter = days.length > 120 ? monthYear : shortDate;
  const dots = days.length <= 31;
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis dataKey="date" tickFormatter={tickFormatter} minTickGap={24} {...axis} />
      <YAxis allowDecimals={false} {...axis} axisLine={false} />
      <Tooltip content={<DayTooltip stacked={kind !== "line"} total={total} />} cursor={kind === "line" ? { stroke: "#bbb" } : { fill: "rgba(0,0,0,0.05)" }} />
      <Legend iconType={kind === "line" ? "plainline" : "square"} wrapperStyle={{ fontSize: 13, color: "#444" }} />
    </>
  );
  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height={height}>
        {kind === "line" ? (
          <LineChart data={days} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            {common}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color ?? COLORS[i]}
                strokeWidth={2}
                dot={dots ? { r: 3, strokeWidth: 0, fill: s.color ?? COLORS[i] } : false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={days} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barCategoryGap="15%">
            {common}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="stack"
                fill={s.color ?? COLORS[i]}
                stroke="#fff"
                strokeWidth={days.length <= 90 ? 1 : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
