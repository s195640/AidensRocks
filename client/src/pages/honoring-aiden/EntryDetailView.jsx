import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ContentEditor, ContentViewer, ContentJsonViewer } from "@s195640/content-editor";
import honoringAidenAdminApi from "../../admin/pages/honoring-aiden/honoringAidenAdminApi";
import { makeUploadCallbacks } from "../../admin/pages/honoring-aiden/contentEditorAdapters";
import UploadingDialog from "../../admin/components/uploading-dialog/UploadingDialog";
import EntryMediaTab from "../../admin/pages/honoring-aiden/entry-media-tab/EntryMediaTab";
import { useUnsavedChangesGuard } from "../../context/UnsavedChangesContext.jsx";
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
// Mobile (by request, placed right after View) is the SAME ContentViewer
// again, just wrapped in a fixed-width container instead of the page's
// normal full-width one — see MOBILE_WIDTH_DEFAULT below for why this is a
// width-constrained div, not a true device viewport (iframe) emulation.
// Public page (isAdmin=false) is untouched: no tabs, just the one
// ContentViewer it always rendered.
const TABS = [
  { key: "edit", label: "Edit" },
  { key: "view", label: "View" },
  { key: "mobile", label: "Mobile" },
  { key: "json", label: "JSON" },
  { key: "media", label: "Media" },
];

// Default width for the Mobile tab's preview frame — 375px (by request),
// the common baseline "small phone" width (matches an iPhone SE/12 mini's
// CSS pixel width). Admin can change it via the tab's own input; not
// persisted anywhere (resets to this default on reload) since nothing asked
// for that. NOTE: this narrows a plain container div, not a real device
// viewport — it accurately reflows the CONTENT itself (text wrapping, image
// scaling — ContentViewer's own images/media are already max-width:100%),
// but any `@media (max-width: ...)` CSS elsewhere in this app (Navbar,
// page-shell breakpoints, etc.) responds to the actual BROWSER window width,
// not this div's width, and wouldn't kick in here even at 375px — this tab
// only ever renders the bare ContentViewer anyway (same as the View tab,
// not the full page shell with Navbar/Footer), so that gap doesn't come up
// in practice for what this preview is actually showing.
const MOBILE_WIDTH_DEFAULT = 375;

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
  const [mobileWidth, setMobileWidth] = useState(MOBILE_WIDTH_DEFAULT);
  const [uploadDialog, setUploadDialog] = useState({ open: false, fileName: "", percent: 0 });

  // Reporter handed to makeUploadCallbacks so it can drive the Uploading
  // dialog below — see contentEditorAdapters.js for why uploads are queued
  // (one dialog at a time even if the editor fires several upload calls
  // close together). Rebuilt (via useMemo) whenever entry.id changes —
  // switching sidebar entries needs uploads attributed to the NEW entry,
  // not carrying over the previous one's id.
  const uploadCallbacks = useMemo(
    () =>
      makeUploadCallbacks(
        honoringAidenAdminApi.uploadMedia,
        {
          onStart: (fileName) => setUploadDialog({ open: true, fileName, percent: 0 }),
          onProgress: (percent) => setUploadDialog((s) => ({ ...s, percent })),
          onDone: () => setUploadDialog((s) => ({ ...s, open: false })),
        },
        entry?.id
      ),
    [entry?.id]
  );

  // Media tab's "Import" support. ContentEditor's onReady hands back a
  // getJSON() reader for the LIVE document (including unsaved edits) — no
  // imperative insert/command API exists (see this file's own doc comment
  // on content/active being seed-once-only), so importing a node works by
  // reading the live doc and prepending the new node client-side. That
  // merged doc is then SAVED IMMEDIATELY (handleImportMedia below), not just
  // handed to the editor as a new unsaved seed — see that function's own
  // comment for why: the package's toolbar Save button only enables itself
  // via its own internal "dirty" flag, which is flipped exclusively by a
  // real edit transaction inside the mounted editor (confirmed by reading
  // the compiled source — onUpdate sets it, nothing else can from outside).
  // Remounting with modified content as the new INITIAL seed doesn't count
  // as an edit from the editor's own point of view, so Save would stay
  // disabled forever after an Import with no way for the admin to trigger
  // it — auto-saving sidesteps that entirely. editorGetJSONRef is a ref, not
  // state, since it never needs to trigger a re-render on its own.
  const editorGetJSONRef = useRef(null);
  const [editorSeed, setEditorSeed] = useState(0);

  // Unsaved-changes guard (see context/UnsavedChangesContext.jsx): `dirty`
  // is driven by ContentEditor's `onChange` prop, which the package fires
  // in exact lockstep with its OWN internal Save-button-enabled flag
  // (confirmed by reading its compiled source — both are set from the same
  // onUpdate handler) — so this mirrors, rather than duplicates, what the
  // toolbar Save button is already tracking.
  const [dirty, setDirty] = useState(false);
  const { registerGuard, guardNavigate } = useUnsavedChangesGuard();

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
  // whatever tab was open on the previous entry selected on this one. Also
  // resets editorSeed so a fresh ContentEditor mount for the newly-loaded
  // entry doesn't inherit a stale remount count from whatever entry was
  // viewed before it.
  useEffect(() => {
    setActiveTab("edit");
    setEditorSeed(0);
    setDirty(false);
    editorGetJSONRef.current = null;
  }, [slug]);

  // Shared save primitive — throws on failure (unlike handleSaveContent
  // below), so the unsaved-changes guard's own dialog can catch it, show its
  // own error, and keep itself open rather than navigating away on a failed
  // save. Resubmits title/published unchanged alongside the edited
  // body_json, same full-replace PUT every other admin action on this entry
  // uses (see honoringAidenAdminApi.js's own comment).
  const saveContent = useCallback(
    async (content) => {
      const saved = await honoringAidenAdminApi.updateEntry(entry.id, {
        title: entry.title,
        published: entry.published,
        body_json: content,
      });
      setEntry(saved);
      setDirty(false);
      setError("");
    },
    [entry]
  );

  // Wired to ContentEditor's own toolbar Save button (onSave prop) — it
  // hands back the editor's current document JSON directly on click. The
  // package calls this synchronously and clears its OWN internal dirty flag
  // right after, regardless of whether this succeeds — a pre-existing
  // quirk, not something introduced here — so failures are only surfaced
  // via this component's own error banner, same as before.
  const handleSaveContent = async (content) => {
    try {
      await saveContent(content);
    } catch (err) {
      console.error("Failed to save entry content:", err);
      setError("Couldn't save your changes. Please try again.");
    }
  };

  // Registered with the unsaved-changes guard (context/
  // UnsavedChangesContext.jsx) so a blocked navigation's "Save" button can
  // persist the LIVE document (via editorGetJSONRef, same reader
  // handleImportMedia uses) — not just the last-known entry.body_json,
  // which could be stale by exactly the in-progress edit the guard exists
  // to protect. Left un-caught (unlike handleSaveContent) so the guard's own
  // dialog can show a real error and stay open on failure instead of
  // silently discarding the pending navigation.
  const guardOnSave = useCallback(async () => {
    const content = editorGetJSONRef.current?.() ?? entry?.body_json;
    await saveContent(content);
  }, [entry, saveContent]);

  // Bumps editorSeed to force ContentEditor to remount seeded with the
  // last-saved entry.body_json — actually reverting the unsaved edit, not
  // just marking it "not dirty" anymore. Necessary here specifically
  // because Discard is now also used for the Edit/View/JSON/Media tab
  // switch below: unlike leaving this entry entirely (where the editor
  // naturally unmounts and its in-memory edit goes with it), switching tabs
  // keeps ContentEditor mounted the whole time (see this file's own comment
  // on why — .tabPanelHidden, not a conditional unmount), so without this
  // the "discarded" edit would still be sitting there the moment the admin
  // clicked back to Edit.
  const guardOnDiscard = useCallback(() => {
    setEditorSeed((n) => n + 1);
    setDirty(false);
  }, []);

  useEffect(() => {
    registerGuard({ hasUnsavedChanges: dirty, onSave: guardOnSave, onDiscard: guardOnDiscard });
    return () => registerGuard({ hasUnsavedChanges: false, onSave: null, onDiscard: null });
  }, [dirty, guardOnSave, guardOnDiscard, registerGuard]);

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

  // Media tab's "Import" button — see this component's own doc comment on
  // editorGetJSONRef/editorSeed above for why this saves immediately rather
  // than just handing the editor new unsaved content. Builds a node
  // matching exactly what @s195640/content-editor's own upload flow would
  // have produced (attrs confirmed against its compiled node definitions —
  // image: src/alt/title/width/height, video: src/poster/duration/align/
  // width/height), prepends it to the LIVE current doc (so any unsaved
  // in-progress edit gets carried into the same save rather than discarded),
  // PUTs the result through the same full-replace endpoint every other save
  // on this entry uses, then remounts ContentEditor seeded with the
  // now-saved content — Save correctly shows disabled right after, since at
  // that instant there genuinely is nothing left unsaved. Any further edits
  // the admin makes (moving/resizing/deleting the imported node, etc.) are
  // real transactions in the remounted editor, so Save re-enables normally
  // from there on, same as always.
  const handleImportMedia = async (item) => {
    const currentDoc = editorGetJSONRef.current?.() || entry.body_json || { type: "doc", content: [] };
    const node =
      item.item_type === "video"
        ? {
            type: "video",
            attrs: {
              src: item.media_path,
              poster: item.poster_path || null,
              duration: item.duration || null,
              align: "none",
              width: item.width || null,
              height: item.height || null,
            },
          }
        : {
            type: "image",
            attrs: {
              src: item.media_path,
              alt: null,
              title: null,
              width: item.width || null,
              height: item.height || null,
            },
          };
    const nextDoc = { ...currentDoc, content: [node, ...(currentDoc.content || [])] };

    try {
      await saveContent(nextDoc);
      setEditorSeed((n) => n + 1);
      setActiveTab("edit");
    } catch (err) {
      console.error("Failed to import media into entry content:", err);
      setError("Couldn't import this media into the page. Please try again.");
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
          {/* Guarded like any other navigation (see guardNavigate/dirty
              above) even though switching tabs alone can't actually lose an
              edit — ContentEditor stays mounted underneath every tab (see
              this file's own comment below on .tabPanelHidden). Asked for
              anyway, by request, for a consistent "you have unsaved
              changes" prompt regardless of where the admin is navigating
              to; guardOnDiscard reverts the live edit for real (bumps
              editorSeed) specifically so Discard means the same thing here
              as it does when actually leaving the entry. */}
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ""}`}
              onClick={() => {
                if (tab.key === activeTab) return;
                guardNavigate(() => setActiveTab(tab.key));
              }}
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
              key={`${entry.id}-${editorSeed}`}
              content={entry.body_json}
              onSave={handleSaveContent}
              active={entry.published}
              onActiveChange={handleToggleActive}
              toolbarOffset={NAVBAR_HEIGHT}
              onReady={(getJSON) => {
                editorGetJSONRef.current = getJSON;
              }}
              onChange={() => setDirty(true)}
              {...uploadCallbacks}
            />
          </div>
          {activeTab === "view" &&
            (entry.body_json ? (
              <ContentViewer content={entry.body_json} />
            ) : (
              <p>No content yet.</p>
            ))}
          {activeTab === "mobile" && (
            <div className={styles.mobilePreview}>
              <div className={styles.mobileWidthRow}>
                <label className={styles.mobileWidthLabel} htmlFor="mobile-preview-width">
                  Width (px)
                </label>
                <input
                  type="range"
                  className={styles.mobileWidthSlider}
                  min={200}
                  max={1024}
                  value={mobileWidth}
                  onChange={(e) => setMobileWidth(Number(e.target.value))}
                  aria-label="Mobile preview width"
                />
                <input
                  id="mobile-preview-width"
                  type="number"
                  min={200}
                  max={1024}
                  value={mobileWidth}
                  onChange={(e) => setMobileWidth(Number(e.target.value) || MOBILE_WIDTH_DEFAULT)}
                />
              </div>
              <div className={styles.mobileFrame} style={{ width: `${mobileWidth}px` }}>
                {entry.body_json ? (
                  <ContentViewer content={entry.body_json} />
                ) : (
                  <p>No content yet.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "json" &&
            (entry.body_json ? (
              <ContentJsonViewer content={entry.body_json} />
            ) : (
              <p>No content yet.</p>
            ))}
          {activeTab === "media" && <EntryMediaTab entry={entry} onImport={handleImportMedia} />}
        </>
      ) : (
        entry.body_json && <ContentViewer content={entry.body_json} />
      )}

      {isAdmin && (
        <UploadingDialog
          isOpen={uploadDialog.open}
          fileName={uploadDialog.fileName}
          percent={uploadDialog.percent}
        />
      )}

      <section className={styles.commentsSection} aria-label="Comments" />
    </div>
  );
}
