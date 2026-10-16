// src/admin/components/visitors-by-day/VisitorsByDay.jsx
import { useCallback, useEffect, useState } from "react";
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
import { FiRefreshCw } from "react-icons/fi";
import styles from "./VisitorsByDay.module.css";

// Dashboard panel: visits per calendar day (in the admin's own timezone)
// from GET /api/statistics/daily. "Visitors" plots total visits and unique
// IPs; "By Platform" stacks the day's visits by platform (same user-agent
// detection as the Statistics panel's Visitors by Platform table).
const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All" },
];

const VIEWS = [
  { value: "visitors", label: "Visitors" },
  { value: "platform", label: "By Platform" },
];

const COUNTS = [
  { value: "total", label: "Total" },
  { value: "unique", label: "Unique" },
];

// Fixed color per platform (never by rank), so hiding an empty platform
// doesn't repaint the others. "Other" is the neutral gray.
const PLATFORM_COLORS = {
  Android: "#2a78d6",
  iPhone: "#eb6834",
  iPad: "#1baf7a",
  Mac: "#eda100",
  Windows: "#e87ba4",
  Linux: "#008300",
  Other: "#9a9893",
};

const TOTAL_COLOR = "#2a78d6";
const UNIQUE_COLOR = "#eb6834";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const toDate = (day) => new Date(`${day}T00:00:00`);
const shortDate = (day) => toDate(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const monthYear = (day) => toDate(day).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const longDate = (day) =>
  toDate(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

const Segmented = ({ options, value, onChange, label }) => (
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

// Text stays in ink colors; the swatch beside it carries the series color.
const ChartTooltip = ({ active, payload, label, stacked }) => {
  if (!active || !payload?.length) return null;
  // Stacked: top segment first, matching the bars; skip empty platforms.
  const rows = stacked ? [...payload].filter((p) => p.value > 0).reverse() : payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{longDate(label)}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.swatch} style={{ background: p.color }} />
          <span className={styles.tooltipName}>{p.name}</span>
          <span className={styles.tooltipValue}>{p.value.toLocaleString()}</span>
        </div>
      ))}
      {stacked && (
        <div className={`${styles.tooltipRow} ${styles.tooltipSum}`}>
          <span className={styles.tooltipName}>All platforms</span>
          <span className={styles.tooltipValue}>{payload[0].payload.allPlatforms.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

const VisitorsByDay = () => {
  const [range, setRange] = useState("30");
  const [view, setView] = useState("visitors");
  const [count, setCount] = useState("total");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchDaily = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const { data } = await axios.get("/api/statistics/daily", { params: { range, tz: TZ } });
      setData(data);
    } catch (err) {
      console.error("Error fetching visitors by day:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  const days = data?.days ?? [];
  const longRange = days.length > 120;
  const tickFormatter = longRange ? monthYear : shortDate;

  const rangeTotal = days.reduce((s, d) => s + d.total, 0);
  const busiest = days.reduce((best, d) => (!best || d.total > best.total ? d : best), null);

  // Flatten platforms to top-level keys for Recharts, and drop platforms
  // with nothing in this range. allPlatforms is the day's own figure (an IP
  // seen on two platforms is still one unique visitor), not the stack's sum.
  const platforms = (data?.platforms ?? []).filter((p) => days.some((d) => d.platforms[p][count] > 0));
  const platformRows = days.map((d) => ({
    date: d.date,
    allPlatforms: d[count],
    ...Object.fromEntries(platforms.map((p) => [p, d.platforms[p][count]])),
  }));

  const axisProps = {
    tick: { fill: "#666", fontSize: 12 },
    tickLine: false,
    axisLine: { stroke: "#ddd" },
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>Visitors by Day</h2>
        <button className={styles.refreshBtn} onClick={fetchDaily} disabled={loading} title="Refresh">
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.controls}>
        <Segmented options={RANGES} value={range} onChange={setRange} label="Range" />
        <div className={styles.controlsRight}>
          <Segmented options={VIEWS} value={view} onChange={setView} label="View" />
          {view === "platform" && <Segmented options={COUNTS} value={count} onChange={setCount} label="Count" />}
        </div>
      </div>

      {error && !data ? (
        <div className={styles.message}>Couldn&apos;t load visitors by day.</div>
      ) : !data ? (
        <div className={styles.message}>Loading Visitors by Day...</div>
      ) : (
        <>
          <div className={styles.summary}>
            <span>
              <strong>{rangeTotal.toLocaleString()}</strong> visits over {days.length.toLocaleString()}{" "}
              {days.length === 1 ? "day" : "days"}
            </span>
            {busiest && busiest.total > 0 && (
              <span>
                Busiest: <strong>{shortDate(busiest.date)}</strong> ({busiest.total.toLocaleString()})
              </span>
            )}
          </div>

          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={280}>
              {view === "visitors" ? (
                <LineChart data={days} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} minTickGap={24} {...axisProps} />
                  <YAxis allowDecimals={false} tickFormatter={compact} {...axisProps} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#bbb", strokeWidth: 1 }} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: "#444" }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke={TOTAL_COLOR}
                    strokeWidth={2}
                    dot={days.length <= 31 ? { r: 3, strokeWidth: 0, fill: TOTAL_COLOR } : false}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="unique"
                    name="Unique"
                    stroke={UNIQUE_COLOR}
                    strokeWidth={2}
                    dot={days.length <= 31 ? { r: 3, strokeWidth: 0, fill: UNIQUE_COLOR } : false}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={platformRows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barCategoryGap="15%">
                  <CartesianGrid vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={tickFormatter} minTickGap={24} {...axisProps} />
                  <YAxis allowDecimals={false} tickFormatter={compact} {...axisProps} axisLine={false} />
                  <Tooltip content={<ChartTooltip stacked />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 13, color: "#444" }} />
                  {platforms.map((p) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      name={p}
                      stackId="platform"
                      fill={PLATFORM_COLORS[p]}
                      stroke="#fff"
                      strokeWidth={days.length <= 90 ? 1 : 0}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default VisitorsByDay;
