import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import EntryDetailView from "./EntryDetailView";
import AdminEditableBlock from "../../admin/pages/honoring-aiden/AdminEditableBlock";
import AddBlockButton from "../../admin/pages/honoring-aiden/AddBlockButton";
import EntryFormModal from "../../admin/pages/honoring-aiden/EntryFormModal";
import MoveEntryModal from "../../admin/pages/honoring-aiden/MoveEntryModal";
import honoringAidenAdminApi from "../../admin/pages/honoring-aiden/honoringAidenAdminApi";
import styles from "./HonoringAidenPage.module.css";

// Shared shell for both the public /honoring-aiden page and the protected
// /admin/honoring-aiden page (HonoringAiden.jsx and
// admin/pages/honoring-aiden/HonoringAidenAdmin.jsx are both thin wrappers
// around this) — one implementation so the two can't drift out of sync.
// `isAdmin` toggles: which entries endpoint feeds the sidebar (all
// non-archived, including drafts, vs. published-only), and whether edit
// affordances (pencil/drag/trash/"+") render at all.
//
// The sidebar itself is a hard-capped two-level menu — main (top-level)
// entries, each optionally with sub-entries nested under it (by request).
// Every entry, at either level, is a full page (its own title/content/
// publish toggle via EntryDetailView.jsx) — nesting is purely a menu
// grouping, not a "folder vs. page" distinction. See this file's own
// `topLevelEntries`/`childEntriesOf` for how the flat `entries` list (one
// row per entry, `parent_id` NULL = top-level) gets turned into that tree,
// and `parent_id`'s own doc comment in
// data/sql/migrations/add_honoring_aiden_entries.sql for why the cap is
// enforced in application code rather than the schema.
export default function HonoringAidenPage({ isAdmin = false }) {
  const basePath = isAdmin ? "/admin/honoring-aiden" : "/honoring-aiden";

  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef();
  const toggleRef = useRef();

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [formEntry, setFormEntry] = useState(undefined); // undefined = closed, null = create, object = edit
  // Only meaningful when formEntry === null (create mode): the top-level
  // entry a new sub-entry is being added under, from a row's own "+" —
  // null means the modal is creating a top-level entry instead (the
  // sidebar's own "Add Entry" button). See EntryFormModal.jsx's own
  // `parentEntry` prop doc.
  const [createUnderParent, setCreateUnderParent] = useState(null);
  // Entry currently open in MoveEntryModal, or null when it's closed.
  const [moveEntryTarget, setMoveEntryTarget] = useState(null);

  const loadEntries = useCallback(() => {
    setEntriesLoading(true);
    const request = isAdmin
      ? honoringAidenAdminApi.fetchEntries()
      : axios.get("/api/honoring-aiden/entries").then((r) => r.data);

    return request
      .then((rows) => setEntries(isAdmin ? rows.filter((e) => !e.archived) : rows))
      .catch((err) => {
        console.error("Failed to load honoring-aiden entries:", err);
        setEntries([]);
      })
      .finally(() => setEntriesLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Same click-outside/scroll-lock pattern as Navbar.jsx's mobile menu.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Route change (item click) should always close the mobile drawer.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Two-level tree, rebuilt fresh from the flat `entries` list on every
  // render — a hand-authored memorial site's entry count, not CMS scale, so
  // no memoization. `parent_id` NULL = top-level; a child whose parent_id
  // doesn't match any id actually present in `entries` (its parent got
  // archived/unpublished out of this same fetch — see
  // routes/honoringAiden.js's own comment on the public endpoint) is
  // silently dropped here rather than shown orphaned at the top level: it
  // just never gets attached under anything since `topLevelEntries` is
  // drawn from that same filtered list.
  const topLevelEntries = entries.filter((e) => !e.parent_id);
  const childEntriesOf = (parentId) => entries.filter((e) => e.parent_id === parentId);

  // `source.droppableId` is "top" for the main list, or "sub-<parentId>"
  // for a sub-entry list (see the Droppable ids below) — each level/parent
  // reorders independently against its own siblings, never against the
  // full flat list, since sort_order is only ever compared within one
  // parent_id group (see routes/honoringAidenAdmin.js's POST /entries).
  // Droppable `type` scoping already stops a cross-list drop before this
  // ever runs; the droppableId equality check is just belt-and-suspenders.
  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.droppableId !== destination.droppableId) return;
    if (destination.index === source.index) return;

    const parentId = source.droppableId === "top" ? null : Number(source.droppableId.slice(4));
    const siblings = parentId === null ? topLevelEntries : childEntriesOf(parentId);
    const reordered = Array.from(siblings);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    honoringAidenAdminApi
      .reorderEntries(reordered.map((e) => e.id))
      .then(loadEntries)
      .catch((err) => console.error("Failed to reorder entries:", err));
  };

  const handleArchive = (entry) => {
    // Archiving a top-level entry cascades to its sub-entries server-side
    // (routes/honoringAidenAdmin.js) — surface that in the confirm so it's
    // not a silent side effect, and navigate away if the currently-open
    // page is either the entry itself or one of the sub-entries going with
    // it.
    const children = childEntriesOf(entry.id);
    const message =
      children.length > 0
        ? `Archive "${entry.title}" and its ${children.length} sub-entr${children.length === 1 ? "y" : "ies"}? They will no longer be visible anywhere.`
        : `Archive "${entry.title}"? It will no longer be visible anywhere.`;
    if (!window.confirm(message)) return;

    const archivedSlugs = [entry.slug, ...children.map((c) => c.slug)];
    honoringAidenAdminApi
      .archiveEntry(entry.id)
      .then(() => {
        loadEntries();
        if (archivedSlugs.some((slug) => location.pathname.endsWith(`/${slug}`))) navigate(basePath);
      })
      .catch((err) => console.error("Failed to archive entry:", err));
  };

  const handleEntrySaved = (saved) => {
    loadEntries();
    // New entry (formEntry was null, i.e. "create") — take the admin
    // straight to it so they can start adding journal entries.
    if (formEntry === null) navigate(`${basePath}/${saved.slug}`);
  };

  return (
    <div className={styles.page}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-controls="honoring-aiden-sidebar"
      >
        <i className={menuOpen ? "fas fa-times" : "fas fa-bars"}></i>
        <span>Menu</span>
      </button>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

      <aside
        id="honoring-aiden-sidebar"
        ref={sidebarRef}
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        {!entriesLoading && entries.length === 0 && (
          <p className={styles.menuEmpty}>No entries yet.</p>
        )}

        {isAdmin ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="top" type="top-level">
              {(provided) => (
                <ul
                  className={styles.menuList}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {topLevelEntries.map((entry, index) => {
                    const children = childEntriesOf(entry.id);
                    return (
                      <Draggable key={entry.slug} draggableId={entry.slug} index={index}>
                        {(draggableProvided) => (
                          <AdminEditableBlock
                            as="li"
                            onEdit={() => {
                              setFormEntry(entry);
                              setCreateUnderParent(null);
                            }}
                            onAddChild={() => {
                              setFormEntry(null);
                              setCreateUnderParent(entry);
                            }}
                            // Omitted (no icon) rather than shown-but-blocked
                            // when this entry already has sub-entries of its
                            // own — see routes/honoringAidenAdmin.js's PATCH
                            // /entries/:id/move: it could only ever move to
                            // "Top Level" (a no-op, it's already there), so
                            // a live Move icon here would just be a dead
                            // click every time.
                            onMove={children.length === 0 ? () => setMoveEntryTarget(entry) : undefined}
                            onDelete={() => handleArchive(entry)}
                            dragHandleProps={draggableProvided.dragHandleProps}
                            innerRef={draggableProvided.innerRef}
                            draggableProps={draggableProvided.draggableProps}
                          >
                            <NavLink
                              to={entry.slug}
                              className={({ isActive }) =>
                                `${styles.menuLink} ${isActive ? styles.menuLinkActive : ""}`
                              }
                            >
                              {entry.title}
                              {!entry.published && (
                                <span className={styles.draftBadge}>draft</span>
                              )}
                            </NavLink>

                            {/* Sub-entry level — own Droppable per parent
                                (`type` scoped to this parent's id) so a drag
                                can only reorder within these siblings, never
                                cross into another parent's list or the
                                top-level one. Hard two-level cap means these
                                never themselves get an "+"/nested list. */}
                            {children.length > 0 && (
                              <Droppable droppableId={`sub-${entry.id}`} type={`sub-${entry.id}`}>
                                {(subProvided) => (
                                  <ul
                                    className={styles.subMenuList}
                                    ref={subProvided.innerRef}
                                    {...subProvided.droppableProps}
                                  >
                                    {children.map((child, childIndex) => (
                                      <Draggable
                                        key={child.slug}
                                        draggableId={child.slug}
                                        index={childIndex}
                                      >
                                        {(childProvided) => (
                                          <AdminEditableBlock
                                            as="li"
                                            onEdit={() => {
                                              setFormEntry(child);
                                              setCreateUnderParent(null);
                                            }}
                                            onMove={() => setMoveEntryTarget(child)}
                                            onDelete={() => handleArchive(child)}
                                            dragHandleProps={childProvided.dragHandleProps}
                                            innerRef={childProvided.innerRef}
                                            draggableProps={childProvided.draggableProps}
                                          >
                                            <NavLink
                                              to={child.slug}
                                              className={({ isActive }) =>
                                                `${styles.menuLink} ${styles.subMenuLink} ${isActive ? styles.menuLinkActive : ""}`
                                              }
                                            >
                                              {child.title}
                                              {!child.published && (
                                                <span className={styles.draftBadge}>draft</span>
                                              )}
                                            </NavLink>
                                          </AdminEditableBlock>
                                        )}
                                      </Draggable>
                                    ))}
                                    {subProvided.placeholder}
                                  </ul>
                                )}
                              </Droppable>
                            )}
                          </AdminEditableBlock>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <ul className={styles.menuList}>
            {topLevelEntries.map((entry) => {
              const children = childEntriesOf(entry.id);
              return (
                <li key={entry.slug}>
                  <NavLink
                    to={entry.slug}
                    className={({ isActive }) =>
                      `${styles.menuLink} ${isActive ? styles.menuLinkActive : ""}`
                    }
                  >
                    {entry.title}
                  </NavLink>
                  {children.length > 0 && (
                    <ul className={styles.subMenuList}>
                      {children.map((child) => (
                        <li key={child.slug}>
                          <NavLink
                            to={child.slug}
                            className={({ isActive }) =>
                              `${styles.menuLink} ${styles.subMenuLink} ${isActive ? styles.menuLinkActive : ""}`
                            }
                          >
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isAdmin && (
          <AddBlockButton
            label="Add Entry"
            onClick={() => {
              setFormEntry(null);
              setCreateUnderParent(null);
            }}
          />
        )}
      </aside>

      <div className={styles.content}>
        <Routes>
          <Route
            index
            element={
              // By request — default to the first (top-level) entry rather
              // than showing a "select something" placeholder, whenever
              // there's actually an entry to land on. `replace` so this
              // redirect doesn't itself become a back-button stop (landing
              // on /honoring-aiden, bouncing to /honoring-aiden/<slug>,
              // hitting Back should return wherever the admin/visitor came
              // from, not bounce right back through the index route again).
              // Waits out `entriesLoading` first — redirecting before the
              // very first fetch resolves would always hit the "nothing
              // yet" fallback below even when entries do exist.
              entriesLoading ? null : topLevelEntries.length > 0 ? (
                <Navigate to={topLevelEntries[0].slug} replace />
              ) : (
                <p>
                  {isAdmin
                    ? "Select an entry from the menu to edit it."
                    : "Select a topic from the menu to learn more."}
                </p>
              )
            }
          />
          <Route
            path=":slug"
            element={<EntryDetailView isAdmin={isAdmin} onEntryChanged={loadEntries} />}
          />
        </Routes>
      </div>

      {isAdmin && (
        <EntryFormModal
          isOpen={formEntry !== undefined}
          onClose={() => {
            setFormEntry(undefined);
            setCreateUnderParent(null);
          }}
          entry={formEntry || null}
          parentEntry={createUnderParent}
          onSaved={handleEntrySaved}
        />
      )}

      {isAdmin && (
        <MoveEntryModal
          isOpen={moveEntryTarget !== null}
          onClose={() => setMoveEntryTarget(null)}
          entry={moveEntryTarget}
          topLevelEntries={topLevelEntries}
          onMoved={loadEntries}
        />
      )}
    </div>
  );
}
