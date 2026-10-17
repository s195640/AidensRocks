// The Admin → Activity page's panels (Site Tracking, phase 4). Each takes
// the page's shared filters (queryKey) and refresh counter and loads its
// own /api/admin/activity/<panel>.
import { useState } from "react";
import {
  COLORS,
  DayChart,
  PLATFORM_COLORS,
  Panel,
  Segmented,
  Table,
  Tiles,
  count,
  duration,
  pct,
  ratio,
  useActivityPanel,
} from "./activityUi";
import styles from "./Activity.module.css";

const FORM_NAMES = { share_your_rock: "Share Your Rock", request_a_rock: "Request a Rock" };
const SOURCE_NAMES = {
  floating_button: "Floating button",
  page_button: "Button on the page",
  page_link: "Link in the page text",
  upload_form: "From the upload form",
  unknown: "Unknown",
};
const WAY_NAMES = { search: "Track the Rocks", highlight: "Map box", filter: "Map filter", link: "Shared link" };

// ------------------------------------------------------------------ visitors
const VISITOR_VIEWS = [
  { value: "visitors", label: "Visitors" },
  { value: "device", label: "By Device" },
];
const DEVICE_COUNTS = [
  { value: "visits", label: "Visits" },
  { value: "visitors", label: "Visitors" },
];
// Stacking order, bottom up. Matches platformFromUserAgent's names.
const DEVICES = ["Android", "iPhone", "iPad", "Mac", "Windows", "Linux", "Other"];

export function VisitorsPanel({ queryKey, refresh }) {
  const state = useActivityPanel("visitors", queryKey, refresh);
  const [view, setView] = useState("visitors");
  const [deviceCount, setDeviceCount] = useState("visits");
  const d = state.data;

  // "By Device": each day's visits or visitors stacked by device, leaving out
  // devices with none in this range. The tooltip adds the day's own total.
  const devices = d ? DEVICES.filter((p) => d.days.some((day) => day.platforms[p]?.[deviceCount] > 0)) : [];
  const deviceDays = d
    ? d.days.map((day) => ({
        date: day.date,
        total: day[deviceCount],
        ...Object.fromEntries(devices.map((p) => [p, day.platforms[p]?.[deviceCount] ?? 0])),
      }))
    : [];
  return (
    <Panel
      title="Visitors"
      note="A visitor is one device; a visit ends after 30 minutes without activity. Every page of the site counts, not just Home."
      state={state}
      wide
    >
      {d && (
        <>
          <Tiles
            items={[
              { label: "Visitors", value: count(d.totals.visitors) },
              { label: "Visits", value: count(d.totals.visits) },
              { label: "Page views", value: count(d.totals.page_views) },
              { label: "Avg visit length", value: duration(d.totals.avg_visit_ms) },
              { label: "Avg time on screen", value: duration(d.totals.avg_engaged_ms) },
              { label: "Returning visits", value: ratio(d.totals.returning_visits, d.totals.visits) },
            ]}
          />
          <div className={styles.chartControls}>
            <Segmented options={VISITOR_VIEWS} value={view} onChange={setView} label="Chart" />
            {view === "device" && (
              <Segmented options={DEVICE_COUNTS} value={deviceCount} onChange={setDeviceCount} label="Count" />
            )}
          </div>
          {view === "visitors" ? (
            <DayChart
              days={d.days}
              series={[
                { key: "visitors", name: "Visitors" },
                { key: "visits", name: "Visits" },
              ]}
            />
          ) : (
            <DayChart
              days={deviceDays}
              kind="stacked"
              series={devices.map((p) => ({ key: p, name: p, color: PLATFORM_COLORS[p] }))}
              total={{ key: "total", name: deviceCount === "visits" ? "All visits" : "All visitors" }}
            />
          )}
          <h3 className={styles.subTitle}>Visitors by device</h3>
          <Table
            rows={d.platforms}
            rowKey={(r) => r.platform}
            columns={[
              { key: "platform", label: "Device" },
              { key: "visitors", label: "Visitors", num: true },
              { key: "share", label: "Share", num: true, render: (r) => ratio(r.visitors, d.totals.visitors) },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// --------------------------------------------------------------------- rocks
// The range's top artists get their own color; the rest share "Other
// artists". Colors go by rank in the range, since artists aren't a fixed list.
const TOP_ARTISTS = COLORS.length;
const OTHER_ARTISTS_COLOR = "#9a9893";
const NO_ARTIST_COLOR = "#cfccc6";

export function RocksCreatedPanel({ queryKey, refresh }) {
  const state = useActivityPanel("rocks", queryKey, refresh);
  const d = state.data;

  // Each day's rocks stacked by artist. Recharts keys are
  // a0, a1... (an artist's name could contain a "." it would read as a path).
  const named = d ? d.artists.filter((a) => a.artist != null) : [];
  const top = named.slice(0, TOP_ARTISTS);
  const hasOthers = named.length > TOP_ARTISTS;
  const hasNone = d ? d.artists.some((a) => a.artist == null) : false;
  const artistSeries = [
    ...top.map((a, i) => ({ key: `a${i}`, name: a.artist, color: COLORS[i] })),
    ...(hasOthers ? [{ key: "others", name: "Other artists", color: OTHER_ARTISTS_COLOR }] : []),
    ...(hasNone ? [{ key: "none", name: "No artist", color: NO_ARTIST_COLOR }] : []),
  ];
  const artistDays = d
    ? d.days.map((day) => {
        const row = { date: day.date, rocks: day.rocks, others: 0, none: day.artists[""] ?? 0 };
        top.forEach((a, i) => (row[`a${i}`] = day.artists[a.artist] ?? 0));
        for (const [name, n] of Object.entries(day.artists)) {
          if (name && !top.some((a) => a.artist === name)) row.others += n;
        }
        return row;
      })
    : [];

  return (
    <Panel
      title="Rocks Created"
      note="Rocks added to the Rock Catalog, by artist. A rock by two artists counts for each. Include admins / internal don't apply here."
      state={state}
      wide
    >
      {d && (
        <>
          <Tiles
            items={[
              { label: "Rocks created", value: count(d.totals.rocks) },
              { label: "Artists", value: count(d.totals.artists) },
            ]}
          />
          <DayChart
            days={artistDays}
            kind="stacked"
            series={artistSeries}
            total={{ key: "rocks", name: "Rocks created" }}
          />
          <h3 className={styles.subTitle}>Rocks by artist</h3>
          <Table
            rows={d.artists}
            rowKey={(r) => r.artist ?? ""}
            columns={[
              { key: "artist", label: "Artist", render: (r) => r.artist ?? "No artist" },
              { key: "rocks", label: "Rocks", num: true },
              { key: "share", label: "Share", num: true, render: (r) => ratio(r.rocks, d.totals.rocks) },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ activity
export function ActivityByDayPanel({ queryKey, refresh }) {
  const state = useActivityPanel("activity", queryKey, refresh);
  const d = state.data;
  return (
    <Panel title="Activity by Day" note="Song plays, Honoring Aiden entries read, QR codes scanned and bad links followed." state={state} wide>
      {d && (
        <>
          <Tiles
            items={[
              { label: "Song plays", value: count(d.totals.song_play) },
              { label: "Honoring Aiden reads", value: count(d.totals.entry_view) },
              { label: "QR scans", value: count(d.totals.qr_scan) },
              { label: "Bad links", value: count(d.totals.not_found) },
            ]}
          />
          <DayChart
            days={d.days}
            series={[
              { key: "song_play", name: "Song plays" },
              { key: "entry_view", name: "Honoring Aiden reads" },
              { key: "qr_scan", name: "QR scans" },
              { key: "not_found", name: "Bad links" },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// --------------------------------------------------------------------- forms
export function FormsPanel({ queryKey, refresh }) {
  const state = useActivityPanel("forms", queryKey, refresh);
  const d = state.data;
  return (
    <Panel
      title="Forms"
      note="Abandoned = opened but never submitted (including closing the tab with the form open). Nothing typed into the forms is recorded."
      state={state}
      wide
    >
      {d && (
        <>
          <Table
            rows={d.forms}
            rowKey={(r) => r.form}
            columns={[
              { key: "form", label: "Form", render: (r) => FORM_NAMES[r.form] || r.form },
              { key: "opened", label: "Opened", num: true },
              { key: "started", label: "Started typing", num: true },
              { key: "submitted", label: "Submitted", num: true },
              { key: "abandoned", label: "Abandoned", num: true },
              { key: "abandoned_after_start", label: "Gave up after typing", num: true },
              { key: "rate", label: "Submit rate", num: true, render: (r) => ratio(r.submitted, r.opened) },
            ]}
          />
          <h3 className={styles.subTitle}>Submitted vs abandoned by day</h3>
          <DayChart
            kind="stacked"
            height={220}
            days={d.days}
            series={[
              { key: "submitted", name: "Submitted" },
              { key: "abandoned", name: "Abandoned" },
            ]}
          />
          <div className={styles.split}>
            <div>
              <h3 className={styles.subTitle}>Where they were opened from</h3>
              <Table
                rows={d.sources}
                columns={[
                  { key: "form", label: "Form", render: (r) => FORM_NAMES[r.form] || r.form },
                  { key: "source", label: "From", render: (r) => SOURCE_NAMES[r.source] || r.source },
                  { key: "opened", label: "Opened", num: true },
                  { key: "rate", label: "Submitted", num: true, render: (r) => ratio(r.submitted, r.opened) },
                ]}
              />
            </div>
            <div>
              <h3 className={styles.subTitle}>Why submits were rejected</h3>
              <Table
                rows={d.errors}
                empty="No rejected submits."
                columns={[
                  { key: "form", label: "Form", render: (r) => FORM_NAMES[r.form] || r.form },
                  { key: "reason", label: "Reason", render: (r) => r.reason?.replace(/^validation:/, "Missing / invalid: ").replace(/,/g, ", ") },
                  { key: "count", label: "Times", num: true },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

// -------------------------------------------------------------------- albums
export function AlbumsPanel({ queryKey, refresh }) {
  const state = useActivityPanel("albums", queryKey, refresh);
  const d = state.data;
  return (
    <Panel title="Albums" note="Photos and Birthdays. Time counts only while the album is on screen." state={state}>
      {d && (
        <>
          <Table
            rows={d.albums}
            rowKey={(r) => r.album_id}
            columns={[
              { key: "display_name", label: "Album" },
              { key: "opens", label: "Opens", num: true },
              { key: "visitors", label: "Visitors", num: true },
              { key: "avg_ms", label: "Avg time", num: true, render: (r) => duration(r.avg_ms) },
              { key: "total_ms", label: "Total time", num: true, render: (r) => duration(r.total_ms) },
              { key: "photos_opened", label: "Photos opened", num: true },
            ]}
          />
          <h3 className={styles.subTitle}>Most viewed photos</h3>
          <Table
            rows={d.photos}
            rowKey={(r) => r.photo_id}
            columns={[
              {
                key: "display_name",
                label: "Photo",
                render: (r) => (
                  <>
                    {r.display_name || r.file || `#${r.photo_id}`}
                    {r.is_video && " (video)"}
                    <div className={styles.muted}>{r.album}</div>
                  </>
                ),
              },
              { key: "views", label: "Views", num: true },
              { key: "avg_ms", label: "Avg time", num: true, render: (r) => duration(r.avg_ms) },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ searches
export function SearchesPanel({ queryKey, refresh }) {
  const state = useActivityPanel("searches", queryKey, refresh);
  const d = state.data;
  return (
    <Panel title="Rock Searches" note="Rock numbers searched for, and opened from shared links." state={state}>
      {d && (
        <>
          <Table
            rows={d.rocks}
            rowKey={(r) => r.rock}
            columns={[
              { key: "rock", label: "Rock #" },
              { key: "searches", label: "Searches", num: true },
              { key: "visitors", label: "Visitors", num: true },
              {
                key: "how",
                label: "How",
                render: (r) =>
                  [
                    r.from_search && `${r.from_search} Track the Rocks`,
                    r.from_map_box && `${r.from_map_box} map box`,
                    r.from_map_filter && `${r.from_map_filter} map filter`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—",
              },
              {
                key: "links",
                label: "Link opens",
                num: true,
                render: (r) => (r.links ? `${r.links}${r.email_links ? ` (${r.email_links} email)` : ""}` : "—"),
              },
              { key: "found", label: "Found", render: (r) => (r.found ? "Yes" : "No") },
            ]}
          />
          <h3 className={styles.subTitle}>Searches that found nothing</h3>
          <Table
            rows={d.notFound}
            rowKey={(r) => r.rock}
            empty="Every search found its rock."
            columns={[
              { key: "rock", label: "Rock #" },
              { key: "count", label: "Times", num: true },
              { key: "ways", label: "From", render: (r) => (r.ways || []).map((w) => WAY_NAMES[w] || w).join(", ") },
              { key: "last_seen", label: "Last", render: (r) => new Date(r.last_seen).toLocaleDateString() },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ journeys
export function JourneysPanel({ queryKey, refresh }) {
  const state = useActivityPanel("journeys", queryKey, refresh);
  return (
    <Panel title="Rock Journeys" note="Journeys opened from a search, a shared link, a map pin or My Rocks." state={state}>
      {state.data && (
        <Table
          rows={state.data}
          rowKey={(r) => r.rock}
          columns={[
            { key: "rock", label: "Rock #" },
            { key: "opens", label: "Opens", num: true },
            { key: "visitors", label: "Visitors", num: true },
            { key: "avg_ms", label: "Avg time", num: true, render: (r) => duration(r.avg_ms) },
            { key: "photos", label: "Photos", num: true },
            { key: "locations", label: "Locations", num: true },
            { key: "comments", label: "Comments", num: true },
            {
              key: "from",
              label: "Opened from",
              render: (r) =>
                [
                  r.from_search && `${r.from_search} search`,
                  r.from_link && `${r.from_link} link`,
                  r.from_map && `${r.from_map} map`,
                  r.from_my_rocks && `${r.from_my_rocks} My Rocks`,
                ]
                  .filter(Boolean)
                  .join(", ") || "Track the Rocks list",
            },
          ]}
        />
      )}
    </Panel>
  );
}

// --------------------------------------------------------------------- music
export function MusicListeningPanel({ queryKey, refresh }) {
  const state = useActivityPanel("music", queryKey, refresh);
  return (
    <Panel title="Music Listening" note="Listened = how much of the song played on average. A pause and resume counts as a new play." state={state}>
      {state.data && (
        <Table
          rows={state.data}
          rowKey={(r) => r.m_key}
          columns={[
            { key: "name", label: "Song", render: (r) => r.name || `Song #${r.m_key}` },
            { key: "plays", label: "Plays", num: true },
            { key: "listeners", label: "Listeners", num: true },
            { key: "avg_listened_ms", label: "Avg listened", num: true, render: (r) => duration(r.avg_listened_ms) },
            { key: "listen_through_pct", label: "Listened", num: true, render: (r) => pct(r.listen_through_pct) },
            { key: "completed_pct", label: "Finished", num: true, render: (r) => pct(r.completed_pct) },
            { key: "skips", label: "Skips", num: true },
          ]}
        />
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ outbound
export function OutboundPanel({ queryKey, refresh }) {
  const state = useActivityPanel("outbound", queryKey, refresh);
  const d = state.data;
  return (
    <Panel title="Links Out" note="Clicks on links that leave the site, and Contact opens." state={state}>
      {d && (
        <>
          <Tiles items={[{ label: "Contact popup opens", value: count(d.contact.opens) }]} />
          <Table
            rows={d.links}
            rowKey={(r) => r.target}
            columns={[
              { key: "target", label: "Link", render: (r) => (r.target === "mailto" ? "Contact email" : r.target) },
              { key: "clicks", label: "Clicks", num: true },
              { key: "visitors", label: "Visitors", num: true },
              { key: "places", label: "Where", render: (r) => (r.places || []).filter(Boolean).join(", ") },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

// -------------------------------------------------------------------- scroll
export function ScrollPanel({ queryKey, refresh }) {
  const state = useActivityPanel("scroll", queryKey, refresh);
  return (
    <Panel title="Scroll Depth" note="How far down each page visitors got. Reached bottom = 90% or more." state={state}>
      {state.data && (
        <Table
          rows={state.data}
          rowKey={(r) => r.path}
          columns={[
            { key: "path", label: "Page" },
            { key: "views", label: "Views", num: true },
            { key: "avg_scroll_pct", label: "Avg depth", num: true, render: (r) => pct(r.avg_scroll_pct) },
            { key: "reached_bottom_pct", label: "Reached bottom", num: true, render: (r) => pct(r.reached_bottom_pct) },
            { key: "avg_engaged_ms", label: "Avg time", num: true, render: (r) => duration(r.avg_engaged_ms) },
          ]}
        />
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ top lists
export function TopListsPanel({ queryKey, refresh }) {
  const state = useActivityPanel("top", queryKey, refresh);
  const d = state.data;
  return (
    <Panel title="Top Lists" state={state} wide>
      {d && (
        <div className={styles.split}>
          <div>
            <h3 className={styles.subTitle}>Pages</h3>
            <Table
              rows={d.pages}
              rowKey={(r) => r.path}
              columns={[
                { key: "path", label: "Page" },
                { key: "views", label: "Views", num: true },
                { key: "visitors", label: "Visitors", num: true },
              ]}
            />
          </div>
          <div>
            <h3 className={styles.subTitle}>Where visits came from</h3>
            <Table
              rows={d.referrers}
              rowKey={(r) => r.source}
              columns={[
                { key: "source", label: "Source" },
                { key: "visits", label: "Visits", num: true },
              ]}
            />
          </div>
          <div>
            <h3 className={styles.subTitle}>Honoring Aiden entries</h3>
            <Table
              rows={d.entries}
              rowKey={(r) => r.slug}
              columns={[
                { key: "title", label: "Entry", render: (r) => r.title || r.slug },
                { key: "views", label: "Reads", num: true },
                { key: "visitors", label: "Visitors", num: true },
              ]}
            />
          </div>
          <div>
            <h3 className={styles.subTitle}>QR codes scanned</h3>
            <Table
              rows={d.qr}
              rowKey={(r) => r.rock}
              columns={[
                { key: "rock", label: "Rock #", render: (r) => r.rock || "(no number)" },
                { key: "scans", label: "Scans", num: true },
                { key: "visitors", label: "Visitors", num: true },
              ]}
            />
          </div>
          <div>
            <h3 className={styles.subTitle}>Rocks followed</h3>
            <Table
              rows={d.follows}
              rowKey={(r) => r.rock}
              columns={[
                { key: "rock", label: "Rock #" },
                { key: "follows", label: "Follows", num: true },
                { key: "unfollows", label: "Unfollows", num: true },
              ]}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
