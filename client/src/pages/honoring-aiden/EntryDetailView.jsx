import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ContentEditor, ContentViewer, ContentJsonViewer } from "@s195640/content-editor";
import honoringAidenAdminApi from "../../admin/pages/honoring-aiden/honoringAidenAdminApi";
import { makeUploadCallbacks } from "../../admin/pages/honoring-aiden/contentEditorAdapters";
import styles from "./HonoringAidenPage.module.css";

// Fixed navbar's effective height (Navbar.module.css sets no explicit
// height — it's the 50px logo with zero vertical padding) — same 50px
// constant this page's own mobile breakpoint already hardcodes for the
// identical reason (sidebar/overlay/mobileToggle sitting below the fixed
// navbar at `top: 50px`). Fed into ContentEditor's `toolbarOffset` below so
// its own sticky in-editor toolbar stops short of the navbar instead of
// scrolling underneath it.
const NAVBAR_HEIGHT = 50;

// Admin-only tab strip (by request): Edit is the live ContentEditor from
// before; View/JSON are read-only panes onto the same last-SAVED
// entry.body_json, using the package's own ContentViewer/ContentJsonViewer
// — View is exactly what the public page renders (a true preview, not a
// separate mock), JSON is the raw Tiptap document for debugging/inspection.
// Public page (isAdmin=false) is untouched: no tabs, just the one
// ContentViewer it always rendered.
const TABS = [
  { key: "edit", label: "Edit" },
  { key: "view", label: "View" },
  { key: "json", label: "JSON" },
];

const VIEW_SESSION_KEY_PREFIX = "honoring-aiden:viewed:";

// Counts this page as viewed at most once per browser tab session (by
// request: "only count 1 time per session (per page)") — sessionStorage is
// the natural fit for "session" here: this app has no server-side session
// concept of its own to hook into (see routes/honoringAiden.js's own POST
// /entries/:slug/view doc comment), and a simple view counter doesn't need
// one. Only ever called for the public page (see `load` below) — never for
// isAdmin, so opening/editing/previewing an entry in /admin can't record a
// view even if this function were somehow called there too.
//
// Marks the session BEFORE the POST resolves, not after — React 18
// StrictMode double-invokes effects in dev, so `load` (and this) can run
// twice for one real page load; marking only on success would let both
// invocations see "not yet counted" and both fire, double-counting.
// Wrapped in try/catch: sessionStorage can throw in some private-browsing
// configurations, and a missed view count isn't worth crashing the page
// load over.
function recordViewOnce(slug) {
  const key = `${VIEW_SESSION_KEY_PREFIX}${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }

  axios.post(`/api/honoring-aiden/entries/${slug}/view`).catch((err) => {
    console.error(`Failed to record honoring-aiden view for "${slug}":`, err);
  });
}

// Shared entry detail pane for both /honoring-aiden/:slug (read-only) and
// /admin/honoring-aiden/:slug (editable) — see HonoringAidenPage.jsx for why
// this is one component rather than two.
//
// No title section here at all (by request — "we do not need to save any
// space for the Title... this will not be maintained"): the title only
// ever reaches the page as a one-time seed into body_json itself (a
// centered Heading 1, written once at creation — see
// routes/honoringAidenAdmin.js's seedTitleDoc). `entry.title` still exists
// as a column (used for the sidebar nav label and the rename dialog), but
// this component never reads or renders it — renaming happens entirely via
// the sidebar's own pencil icon (HonoringAidenPage.jsx's AdminEditableBlock
// wrapping each NavLink, opening the SAME EntryFormModal this page used to
// render a second copy of), and deliberately does NOT touch body_json, so
// editing the title after the fact never rewrites whatever the admin has
// since written on the page itself.
//
// What's left is just: a visibility toggle (admin only) and ONE
// @s195640/content-editor document for the entire page body — see
// summary-issue-log.md for the full history of what this page used to be
// (an ordered stack of journal_entry/journal_entry_item blocks) before two
// separate simplification passes collapsed it down to this.
//
// Save/visibility now both live INSIDE ContentEditor's own toolbar
// (0.2.0+'s onSave/active/onActiveChange props) rather than a second,
// hand-built Save button + checkbox rendered alongside it — that older pair
// is gone now that the package ships the real thing, since keeping both
// would mean two Save buttons and two on/off switches racing to PUT the
// same entry. IMPORTANT caveat this wiring has to account for:
// ContentEditor treats `content`/`active` as INITIAL values only (seeded
// once into internal state, per its own source — not re-synced if the
// props change later), so `key={entry.id}` below is load-bearing, not
// decorative: without it, clicking a different sidebar entry would reuse
// the same mounted editor instance and keep showing the previous entry's
// content/toggle state.
export default function EntryDetailView({ isAdmin = false, onEntryChanged }) {
  const { slug } = useParams();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("edit");

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    setError("");

    const request = isAdmin
      ? honoringAidenAdminApi.fetchEntryBySlug(slug)
      : axios.get(`/api/honoring-aiden/entries/${slug}`).then((r) => r.data);

    return request
      .then((data) => {
        setEntry(data);
        if (!isAdmin) recordViewOnce(slug);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          console.error(`Failed to load honoring-aiden entry "${slug}":`, err);
        }
        setEntry(null);
      })
      .finally(() => setLoading(false));
  }, [slug, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching sidebar entries should always land back on Edit, not leave
  // whatever tab was open on the previous entry selected on this one.
  useEffect(() => {
    setActiveTab("edit");
  }, [slug]);

  // Wired to ContentEditor's own toolbar Save button (onSave prop) — it
  // hands back the editor's current document JSON directly on click, so
  // there's no separate draft-state tracking needed on this side anymore;
  // the editor tracks its own "dirty" state and keeps its Save button
  // disabled until something actually changed. Resubmits title/published
  // unchanged alongside the edited body_json, same full-replace PUT every
  // other admin action on this entry uses (see honoringAidenAdminApi.js's
  // own comment).
  const handleSaveContent = async (content) => {
    try {
      const saved = await honoringAidenAdminApi.updateEntry(entry.id, {
        title: entry.title,
        published: entry.published,
        body_json: content,
      });
      setEntry(saved);
      setError("");
    } catch (err) {
      console.error("Failed to save entry content:", err);
      setError("Couldn't save your changes. Please try again.");
    }
  };

  // Wired to the same toolbar's Active on/off switch — this IS the entry's
  // visibility control (replaces the old standalone checkbox this page used
  // to render above the editor). The switch flips immediately in its own
  // local state regardless of what happens here (see this component's own
  // doc comment on `active` being an initial value only, not controlled),
  // so on failure this reloads the entry from the server and surfaces an
  // error rather than leaving the switch showing a state that was never
  // actually saved.
  const handleToggleActive = async (nextActive) => {
    try {
      const saved = await honoringAidenAdminApi.updateEntry(entry.id, {
        title: entry.title,
        published: nextActive,
        body_json: entry.body_json,
      });
      setEntry(saved);
      setError("");
      onEntryChanged?.();
    } catch (err) {
      console.error("Failed to toggle entry visibility:", err);
      setError("Couldn't change visibility. Please try again.");
      load();
    }
  };

  // Only blank out on the true initial load — an inline save shouldn't
  // unmount/remount this tree, losing the editor's own internal state,
  // mid-edit.
  if (loading && !entry) return null;

  if (notFound || !entry) {
    return <p>This page couldn&apos;t be found.</p>;
  }

  return (
    <div>
      {error && <p className={styles.errorMessage}>{error}</p>}

      {isAdmin && (
        <div className={styles.tabBar} role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isAdmin ? (
        <>
          {/* Always mounted, just hidden on the other tabs — never
              conditionally rendered on activeTab, since ContentEditor only
              seeds its content/active state once on mount (see this file's
              own doc comment); unmounting it on tab-away and remounting on
              tab-back would silently discard any unsaved in-progress edit. */}
          <div className={activeTab === "edit" ? undefined : styles.tabPanelHidden}>
            <ContentEditor
              key={entry.id}
              content={entry.body_json}
              onSave={handleSaveContent}
              active={entry.published}
              onActiveChange={handleToggleActive}
              toolbarOffset={NAVBAR_HEIGHT}
              {...makeUploadCallbacks(honoringAidenAdminApi.uploadMedia)}
            />
          </div>
          {activeTab === "view" &&
            (entry.body_json ? (
              <ContentViewer content={entry.body_json} />
            ) : (
              <p>No content yet.</p>
            ))}
          {activeTab === "json" &&
            (entry.body_json ? (
              <ContentJsonViewer content={entry.body_json} />
            ) : (
              <p>No content yet.</p>
            ))}
        </>
      ) : (
        entry.body_json && <ContentViewer content={entry.body_json} />
      )}

      <section className={styles.commentsSection} aria-label="Comments" />
    </div>
  );
}
