import styles from "./AdminEditableBlock.module.css";

// Hover edit-affordance layer (pencil / drag handle / trash) used across the
// /admin/honoring-aiden page's in-context editor — sidebar entries, the
// title section, journal entries. No auth check of its own: this whole page
// is only reachable behind PrivateRoute (see HonoringAidenAdmin.jsx), unlike
// the earlier version of this component that lived directly on the public
// page and had to self-gate on AuthContext. The public page
// (pages/honoring-aiden/) renders the exact same template components with
// none of this wrapped around them — what's edited here is exactly what
// renders there.
//
// `placement`: "corner" (default — top-right overlay on top of the block's
// own content, unchanged), "left" (by request, for EntryDetailView.jsx's
// per-journal-entry controls specifically: sits in the page's margin
// outside the 1000px content card entirely, vertically centered, instead
// of overlaid on the content — see .toolbarLeft in the CSS module and
// summary-issue-log.md), or "above" (by request, for JournalEntry.jsx's
// text items specifically: the default "corner" overlay sits directly on
// top of the text editor's own toolbar (@s195640/content-editor's
// ContentEditor, formerly an in-house JournalEntryTextEditor.jsx) while a
// text item is being edited — same top-right corner, same moment it actually matters —
// so "above" floats this entirely above the block's own top edge instead,
// same `bottom: calc(100% + Npx)` technique ImageInlineToolbar.module.css
// already uses to float above the image it controls). Kept as a variant on
// this shared component rather than a one-off in each caller, but the
// positioning itself lives entirely in THIS component's own stylesheet
// rather than being passed in as an external className — this app has a
// documented, real pitfall with letting a second CSS Module's class try to
// override a first one's positioning (cascade order between separate CSS
// Modules isn't reliable enough to depend on; see
// ImageInlineToolbar.module.css's `.toolbar` comment for the fullest
// writeup of that footgun) — so a caller can pick between the built-in
// placements, but can't inject a new one this way.
//
// `isSelected` (optional, by request — text/gallery items specifically,
// see JournalEntry.jsx): the toolbar's default reveal is purely CSS-driven
// (`:hover`/`:focus-within`), which drops it the instant the mouse leaves
// or focus moves elsewhere — e.g. clicking one of THIS toolbar's own
// buttons doesn't blur anything, but clicking a DIFFERENT control nearby
// (a gallery image's own remove-x, a rich-text toolbar button) can. Passing
// `isSelected` adds a THIRD, JS-driven way to keep it visible — a `.selected`
// class alongside the existing hover/focus-within CSS rules, not instead of
// them, so hovering an unselected block still works exactly as before. Same
// idea ImageInlineToolbar.jsx's own `isSelected` prop already implements
// for images; this brings AdminEditableBlock's usages up to the same
// standard. Omitted (`undefined`/`false`) by callers that have no
// selection concept at all (the title section, sidebar entries, journal
// entries) — hover/focus-within alone, unchanged for them.
const PLACEMENT_CLASSES = {
  left: "toolbarLeft",
  above: "toolbarAbove",
};

export default function AdminEditableBlock({
  onEdit,
  onDelete,
  onAddChild,
  onMove,
  dragHandleProps,
  // `innerRef`/`draggableProps` come straight from @hello-pangea/dnd's
  // Draggable render prop and must land on this exact element — not a
  // wrapper — or e.g. a sidebar <li> ends up wrapped in an extra <div>
  // directly inside a <ul>, which is invalid HTML the browser "fixes" by
  // hoisting the <div> out, breaking the list's flex layout entirely.
  innerRef,
  draggableProps,
  children,
  as: Tag = "div",
  className = "",
  placement = "corner",
  isSelected = false,
}) {
  const toolbarClassName = `${styles.toolbar} ${styles[PLACEMENT_CLASSES[placement]] || ""}`;
  return (
    <Tag
      ref={innerRef}
      {...draggableProps}
      className={`${styles.editable} ${isSelected ? styles.selected : ""} ${className}`}
    >
      {children}
      <div className={toolbarClassName}>
        {dragHandleProps && (
          <span className={styles.iconButton} title="Drag to reorder" {...dragHandleProps}>
            ⠿
          </span>
        )}
        {onEdit && (
          <button type="button" className={styles.iconButton} onClick={onEdit} title="Edit">
            ✎
          </button>
        )}
        {onAddChild && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onAddChild}
            title="Add sub-entry"
          >
            +
          </button>
        )}
        {onMove && (
          <button type="button" className={styles.iconButton} onClick={onMove} title="Move to...">
            ⇄
          </button>
        )}
        {onDelete && (
          <button type="button" className={styles.iconButton} onClick={onDelete} title="Delete">
            🗑
          </button>
        )}
      </div>
    </Tag>
  );
}
