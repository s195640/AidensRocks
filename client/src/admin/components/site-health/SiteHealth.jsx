// src/admin/components/site-health/SiteHealth.jsx
import { Fragment, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiRefreshCw, FiChevronDown, FiChevronRight, FiCopy, FiCheck } from "react-icons/fi";
import { formatLocalDateTime } from "../../../utils/localDate";
import styles from "./SiteHealth.module.css";

// Dashboard panel (Site Tracking, error tracking): every kind of error
// visitors ran into, from the browser and the server, grouped, with each
// group's recent occurrences (readable stack, what the visitor did just
// before), a New / Known / Fixed status, slow requests and page load speed.
// Data: /api/admin/site-health/* (server/src/routes/siteHealthAdmin.js).
const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All" },
];

const TYPE_LABELS = {
  client_error: "JavaScript error",
  render_crash: "Page crash",
  error_shown: "Message shown",
  media_error: "Broken media",
  map_tile_error: "Map tiles",
  load_error: "Failed request",
  server_request: "Server error",
  server_background: "Background job",
  server_email: "Email failed",
  server_process: "Server crash",
};

const STATUS_LABELS = { new: "New", known: "Known", fixed: "Fixed" };

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const seconds = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)} s`);

const EVENT_LABELS = {
  page_view: "Opened",
  page_leave: "Left",
  outbound_click: "Clicked link",
  contact_open: "Opened Contact",
  qr_scan: "Scanned QR",
  not_found: "Bad link",
};

function trailText(t) {
  const label = EVENT_LABELS[t.type] || TYPE_LABELS[t.type] || t.type;
  return `${label} ${t.target_id ? `${t.target_id} ` : ""}${t.path ? `(${t.path})` : ""}`.trim();
}

// The exact file a broken-media occurrence failed on (the group title only
// has the pattern), plus the browser's error code for audio/video.
const mediaFileText = (o) => `File: ${o.target_id}${o.meta?.code != null ? ` (error code ${o.meta.code})` : ""}`;

// A group's heading lines, for the copied text.
const groupHeaderLines = (group, fallbackTitle = "") => [
  `${TYPE_LABELS[group.type] || group.type || "Error"}: ${group.title || fallbackTitle}`.trim(),
  `First seen ${formatLocalDateTime(group.first_seen)}${group.fixed_in_version ? ` · marked fixed in ${group.fixed_in_version}` : ""}`,
  `Status: ${STATUS_LABELS[group.status] || group.status}`,
];

// Everything shown for one occurrence, as plain text for pasting into a bug
// report or a chat.
function occurrenceText(group, o) {
  return [...groupHeaderLines(group, o.message || ""), "", ...occurrenceLines(group, o)].join("\n");
}

function occurrenceLines(group, o) {
  const lines = [
    [
      formatLocalDateTime(o.created_at),
      o.page || "—",
      o.platform || "—",
      `v${o.version || "?"}`,
      o.account_email,
      o.status && `${o.method} → ${o.status}`,
    ]
      .filter(Boolean)
      .join(" · "),
  ];
  if (o.message) lines.push(o.message);
  if (group.type === "media_error" && o.target_id) lines.push(mediaFileText(o));
  if (o.meta?.component_stack) lines.push("", "Component stack", o.meta.component_stack.trim());
  if (o.stack) {
    lines.push("", `Stack${o.source === "client" && !o.resolved ? " (minified: no source map for this version)" : ""}`, o.stack);
  }
  if (o.user_agent) lines.push(`User agent: ${o.user_agent}`);
  if (o.trail?.length > 0) {
    lines.push("", "What they did just before");
    o.trail.forEach((t) => lines.push(`${trailText(t)} ${formatLocalDateTime(t.created_at)}`));
  }
  return lines;
}

// "Copy all errors": every listed group (`rows`, as in the Errors table)
// with its recent occurrences, as one plain-text report. Details are
// fetched a few groups at a time so a long list doesn't swamp the server.
async function allErrorsText(rows, params, filterText) {
  const details = new Array(rows.length);
  let next = 0;
  const worker = async () => {
    while (next < rows.length) {
      const i = next++;
      try {
        const { data } = await axios.get(`/api/admin/site-health/errors/${rows[i].fingerprint}`, { params });
        details[i] = data;
      } catch {
        details[i] = null;
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  const out = [`Site Health errors (${rows.length}) · ${filterText} · copied ${formatLocalDateTime(new Date().toISOString())}`];
  rows.forEach((row, i) => {
    const group = details[i]?.group || row;
    out.push(
      "",
      "=".repeat(60),
      `${i + 1}. ${groupHeaderLines(group).join("\n")}`,
      `${row.count} times · ${row.visitors} visitors · last seen ${formatLocalDateTime(row.last_seen)}`
    );
    if (row.pages?.length) out.push(`Pages: ${row.pages.join(", ")}`);
    if (row.platforms?.length) out.push(`Platforms: ${row.platforms.join(", ")}`);
    if (row.versions?.length) out.push(`Versions: ${row.versions.join(", ")}`);
    if (group.note) out.push(`Note: ${group.note}`);
    if (!details[i]) {
      out.push("", "(Couldn't load this error's occurrences.)");
      return;
    }
    const occ = details[i].occurrences;
    occ.forEach((o, n) => out.push("", `--- Occurrence ${n + 1} of ${occ.length}`, ...occurrenceLines(group, o)));
  });
  return out.join("\n");
}

// navigator.clipboard only exists on https/localhost, so fall back to a
// hidden textarea for plain-http (LAN) admin sessions.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("copy failed");
}

const CopyButton = ({ getText, label = "Copy", title = "Copy all details to the clipboard" }) => {
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (state === "idle" || state === "copying") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      className={styles.copyBtn}
      title={title}
      disabled={state === "copying"}
      onClick={async () => {
        try {
          setState("copying");
          const text = getText();
          // Text still being fetched: hand the clipboard the promise, so
          // the write stays tied to this click (Safari refuses a write
          // made after the fetches finish).
          if (text instanceof Promise && window.ClipboardItem && navigator.clipboard?.write) {
            const blob = text.then((t) => new Blob([t], { type: "text/plain" }));
            await navigator.clipboard.write([new window.ClipboardItem({ "text/plain": blob })]);
          } else {
            await copyText(await text);
          }
          setState("copied");
        } catch {
          setState("failed");
        }
      }}
    >
      {state === "copied" ? <FiCheck /> : <FiCopy />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : state === "copying" ? "Copying..." : label}
    </button>
  );
};

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

const ErrorDetail = ({ fingerprint, queryKey, onStatus }) => {
  const [detail, setDetail] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/admin/site-health/errors/${fingerprint}`, { params: JSON.parse(queryKey) })
      .then(({ data }) => !cancelled && setDetail(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [fingerprint, queryKey]);

  if (failed) return <div className={styles.message}>Couldn&apos;t load this error.</div>;
  if (!detail) return <div className={styles.message}>Loading...</div>;
  const { group, occurrences } = detail;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <span>
          First seen {formatLocalDateTime(group.first_seen)}
          {group.fixed_in_version && ` · marked fixed in ${group.fixed_in_version}`}
        </span>
        <div className={styles.statusButtons}>
          {["new", "known", "fixed"].map((s) => (
            <button
              key={s}
              type="button"
              className={group.status === s ? styles.segActive : styles.segBtn}
              onClick={async () => {
                const { data } = await axios.put(`/api/admin/site-health/errors/${fingerprint}`, { status: s });
                setDetail((d) => ({ ...d, group: data }));
                onStatus(fingerprint, s);
              }}
            >
              {s === "new" ? "New" : s === "known" ? "Known" : "Fixed"}
            </button>
          ))}
        </div>
      </div>

      {occurrences.length === 0 && <div className={styles.message}>No occurrences match the current filters.</div>}
      {occurrences.map((o) => (
        <div key={o.id} className={styles.occurrence}>
          <div className={styles.occMeta}>
            <strong>{formatLocalDateTime(o.created_at)}</strong>
            <span>{o.page || "—"}</span>
            <span>{o.platform || "—"}</span>
            <span>v{o.version || "?"}</span>
            {o.account_email && <span>{o.account_email}</span>}
            {o.status && <span>{o.method} → {o.status}</span>}
            <CopyButton getText={() => occurrenceText(group, o)} />
          </div>
          {o.message && <div className={styles.occMessage}>{o.message}</div>}
          {group.type === "media_error" && o.target_id && <div className={styles.occMessage}>{mediaFileText(o)}</div>}
          {o.meta?.component_stack && (
            <pre className={styles.stack}>{o.meta.component_stack.trim()}</pre>
          )}
          {o.stack && (
            <>
              <div className={styles.stackLabel}>
                Stack{o.source === "client" && !o.resolved && " (minified: no source map for this version)"}
              </div>
              <pre className={styles.stack}>{o.stack}</pre>
            </>
          )}
          {o.trail?.length > 0 && (
            <>
              <div className={styles.stackLabel}>What they did just before</div>
              <ol className={styles.trail}>
                {o.trail.map((t, i) => (
                  <li key={i}>
                    {trailText(t)} <span className={styles.trailTime}>{formatLocalDateTime(t.created_at)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const SiteHealth = () => {
  const [range, setRange] = useState("7");
  const [includeAdmins, setIncludeAdmins] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(false);
  const [hideFixed, setHideFixed] = useState(true);
  const [errors, setErrors] = useState(null);
  const [slow, setSlow] = useState([]);
  const [speed, setSpeed] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const query = { range, tz: TZ, includeAdmins: includeAdmins ? 1 : 0, includeInternal: includeInternal ? 1 : 0 };
  const queryKey = JSON.stringify(query);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFailed(false);
      const params = JSON.parse(queryKey);
      const [e, s, p] = await Promise.all([
        axios.get("/api/admin/site-health/errors", { params }),
        axios.get("/api/admin/site-health/slow", { params }),
        axios.get("/api/admin/site-health/speed", { params }),
      ]);
      setErrors(e.data);
      setSlow(s.data);
      setSpeed(p.data);
    } catch (err) {
      console.error("Error loading site health:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (fingerprint, status) =>
    setErrors((rows) => rows.map((r) => (r.fingerprint === fingerprint ? { ...r, status } : r)));

  const newCount = errors?.filter((e) => e.status === "new").length ?? 0;
  const shownErrors = (errors || []).filter((e) => !hideFixed || e.status !== "fixed");
  const filterText = [
    RANGES.find((r) => r.value === range)?.label,
    hideFixed ? "New and Known" : "all statuses",
    includeAdmins && "admins included",
    includeInternal && "internal included",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.header}>
          Site Health
          {newCount > 0 && <span className={styles.newBadge}>{newCount} new</span>}
        </h2>
        <button className={styles.refreshBtn} onClick={load} disabled={loading} title="Refresh">
          <FiRefreshCw className={loading ? styles.spin : ""} />
        </button>
      </div>

      <div className={styles.controls}>
        <Segmented options={RANGES} value={range} onChange={setRange} label="Range" />
        <div className={styles.toggles}>
          <label>
            <input type="checkbox" checked={includeAdmins} onChange={(e) => setIncludeAdmins(e.target.checked)} /> Include admins
          </label>
          <label>
            <input type="checkbox" checked={includeInternal} onChange={(e) => setIncludeInternal(e.target.checked)} /> Include internal
          </label>
          <label>
            <input type="checkbox" checked={hideFixed} onChange={(e) => setHideFixed(e.target.checked)} /> Hide fixed
          </label>
        </div>
      </div>

      {failed && !errors ? (
        <div className={styles.message}>Couldn&apos;t load site health.</div>
      ) : !errors ? (
        <div className={styles.message}>Loading Site Health...</div>
      ) : (
        <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Errors</h3>
            {shownErrors.length > 0 && (
              <CopyButton
                label="Copy all errors"
                title="Copy every error listed, with its recent occurrences, to the clipboard"
                getText={() => allErrorsText(shownErrors, JSON.parse(queryKey), filterText)}
              />
            )}
          </div>
          {shownErrors.length === 0 ? (
            <div className={styles.message}>
              {errors.length > 0 ? "No unfixed errors in this range." : "No errors in this range."}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Error</th>
                    <th>Times</th>
                    <th>Visitors</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {shownErrors.map((e) => (
                    <Fragment key={e.fingerprint}>
                      <tr
                        className={styles.errorRow}
                        onClick={() => setOpen(open === e.fingerprint ? null : e.fingerprint)}
                      >
                        <td className={styles.chevron}>
                          {open === e.fingerprint ? <FiChevronDown /> : <FiChevronRight />}
                        </td>
                        <td>
                          <span className={`${styles.status} ${styles[`status_${e.status}`]}`}>
                            {STATUS_LABELS[e.status]}
                          </span>
                          <span className={styles.typeLabel}>{TYPE_LABELS[e.type] || e.type}</span>
                          <div className={styles.errorTitle}>{e.title}</div>
                          <div className={styles.errorWhere}>
                            {[...(e.pages || []).slice(0, 3), ...(e.platforms || [])].join(" · ")}
                          </div>
                        </td>
                        <td className={styles.num}>{e.count.toLocaleString()}</td>
                        <td className={styles.num}>{e.visitors.toLocaleString()}</td>
                        <td className={styles.when}>{formatLocalDateTime(e.last_seen)}</td>
                      </tr>
                      {open === e.fingerprint && (
                        <tr>
                          <td colSpan={5} className={styles.detailCell}>
                            <ErrorDetail fingerprint={e.fingerprint} queryKey={queryKey} onStatus={setStatus} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {slow.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>Slow requests (over 10 s)</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Times</th>
                      <th>Typical</th>
                      <th>Slowest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slow.map((s) => (
                      <tr key={`${s.method} ${s.path}`}>
                        <td className={styles.code}>
                          {s.method} {s.path}
                        </td>
                        <td className={styles.num}>{s.count}</td>
                        <td className={styles.num}>{seconds(s.median_ms)}</td>
                        <td className={styles.num}>{seconds(s.max_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h3 className={styles.sectionTitle}>Page load speed (first page of each visit)</h3>
          {speed.length === 0 ? (
            <div className={styles.message}>No page loads in this range.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Visits</th>
                    <th title="When the main content appeared (Largest Contentful Paint)">Content shown</th>
                    <th>Slowest 10%</th>
                    <th>Fully loaded</th>
                  </tr>
                </thead>
                <tbody>
                  {speed.map((p) => (
                    <tr key={p.platform}>
                      <td>{p.platform}</td>
                      <td className={styles.num}>{p.count.toLocaleString()}</td>
                      <td className={styles.num}>{seconds(p.lcp_median)}</td>
                      <td className={styles.num}>{seconds(p.lcp_p90)}</td>
                      <td className={styles.num}>{seconds(p.load_median)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SiteHealth;
