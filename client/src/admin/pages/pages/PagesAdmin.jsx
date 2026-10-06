import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AdminContainer from "../../components/admin-base/AdminContainer";
import Table from "../../../components/simple-components/table/Table";
import ToggleSwitch from "../../../components/simple-components/toggle-switch/ToggleSwitch";
import PagesEditDialog from "./pages-edit-dlg/PagesEditDialog";
import SendEmailDialog from "./send-email-dlg/SendEmailDialog";
import PAGE_PATHS from "../../../adminContent/pagePaths";
import EMAIL_SLUGS from "./emailSlugs";
import EMAIL_TEMPLATES from "../../../adminContent/emailTemplates";
import { ACCOUNT_PAGES, ACCOUNT_PAGE_SLUGS } from "../../../adminContent/accountPages";
import styles from "./PagesAdmin.module.css";

// Only these pages were actually converted to CMS-driven body content
// (Phase 7). The other page_content rows exist purely so the navbar can be
// 100% DB-driven — those pages keep their own hardcoded JSX, so editing
// their (always-empty) body would silently do nothing. Visibility toggling
// and Preview still apply to every page, since those affect the nav.
// Email-template rows (EMAIL_SLUGS) are also editable — same draft/publish
// workflow, just no live public page.
const EDITABLE_SLUGS = new Set([
  "home",
  "share-your-rock",
  "sudc",
  "birthdays",
  ...EMAIL_SLUGS,
  ...ACCOUNT_PAGE_SLUGS,
]);

const PagesAdmin = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [publishingSlug, setPublishingSlug] = useState(null);
  const [sendingPage, setSendingPage] = useState(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/pages");
      setPages(res.data.map((p) => ({ ...p, id: p.slug })));
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleToggleVisible = async (slug) => {
    try {
      const res = await axios.patch(`/api/admin/pages/${slug}/visible`);
      setPages((prev) =>
        prev.map((p) => (p.slug === slug ? { ...p, visible: res.data.visible } : p))
      );
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
    }
  };

  const handlePublish = async (slug) => {
    setPublishingSlug(slug);
    try {
      const res = await axios.post(`/api/admin/pages/${slug}/publish`);
      setPages((prev) =>
        prev.map((p) =>
          p.slug === slug
            ? {
              ...p,
              published_body: res.data.published_body,
              published_email_subject: res.data.published_email_subject,
              published_at: res.data.published_at,
            }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to publish page:", err);
      alert("Failed to publish page.");
    } finally {
      setPublishingSlug(null);
    }
  };

  const handleDiscardDraft = async (page) => {
    if (
      !window.confirm(
        `Discard unpublished changes to "${page.nav_label}"? This cannot be undone.`
      )
    )
      return;

    try {
      const res = await axios.put(`/api/admin/pages/${page.slug}/draft`, {
        body: page.published_body,
        email_subject: page.published_email_subject,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.slug === page.slug
            ? { ...p, draft_body: res.data.body, draft_email_subject: res.data.email_subject }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to discard draft:", err);
      alert("Failed to discard draft.");
    }
  };

  const openPreview = (slug) => {
    // The sign-in token lives in localStorage, so the new tab is signed in
    // on its own; "noopener" just cuts its link back to this window.
    if (EMAIL_SLUGS.has(slug)) {
      window.open(`/admin/preview-email/${slug}`, "_blank", "noopener");
      return;
    }
    const path = PAGE_PATHS[slug] || "/";
    const separator = path.includes("?") ? "&" : "?";
    window.open(`${path}${separator}preview=1`, "_blank", "noopener");
  };

  // Pages and email templates share page_content.order_num, but only real
  // pages are drag-reorderable (that order is the public nav). Email rows
  // are appended after them so they keep sorting last.
  // Memoized: Table resets its internal row state whenever `data` changes
  // identity, so these must stay stable across unrelated re-renders.
  const sitePages = useMemo(
    () => pages.filter((p) => !EMAIL_SLUGS.has(p.slug) && !ACCOUNT_PAGE_SLUGS.has(p.slug)),
    [pages]
  );
  const accountPages = useMemo(() => pages.filter((p) => ACCOUNT_PAGE_SLUGS.has(p.slug)), [pages]);
  const emailPages = useMemo(() => pages.filter((p) => EMAIL_SLUGS.has(p.slug)), [pages]);

  const handleReorder = async (newData) => {
    setLoading(true);
    try {
      await axios.post("/api/admin/pages/reorder", {
        order: [...newData, ...accountPages, ...emailPages].map((p) => p.slug),
      });
      await fetchPages();
    } catch (err) {
      console.error("Failed to reorder pages:", err);
    } finally {
      setLoading(false);
    }
  };

  // sortable off on every column, same as AlbumsTable's convention — sorting
  // and drag-reorder both reshuffle the same displayed row order, and mixing
  // the two would let a column sort silently become the new nav order.
  const columns = [
    { key: "nav_label", label: "Page", sortable: false, defaultWidth: 160 },
    { key: "visible", label: "Active", sortable: false, defaultWidth: 80 },
    { key: "updated_at", label: "Last Updated", sortable: false, defaultWidth: 180 },
    { key: "published_at", label: "Last Published", sortable: false, defaultWidth: 180 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 380 },
  ];

  const emailColumns = [
    { key: "nav_label", label: "Email", sortable: false, defaultWidth: 160 },
    { key: "used_for", label: "Used For", sortable: false, defaultWidth: 240 },
    { key: "published_email_subject", label: "Subject", sortable: false },
    ...columns.slice(1),
  ];

  // Account pages: Title is stored in the email-subject columns.
  const accountColumns = [
    { key: "nav_label", label: "Page", sortable: false, defaultWidth: 160 },
    { key: "published_email_subject", label: "Title", sortable: false },
    ...columns.slice(1),
  ];

  const renderCell = (page, key) => {
    switch (key) {
      case "used_for":
        return EMAIL_TEMPLATES[page.slug]?.description || "";

      case "visible": {
        const isEmail = EMAIL_SLUGS.has(page.slug);
        const isAccountPage = ACCOUNT_PAGE_SLUGS.has(page.slug);
        const isRequired =
          !!EMAIL_TEMPLATES[page.slug]?.required || !!ACCOUNT_PAGES[page.slug]?.lockedOn;
        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ToggleSwitch
              checked={isRequired || page.visible}
              onChange={() => handleToggleVisible(page.slug)}
              disabled={isRequired}
              title={
                isRequired
                  ? isAccountPage
                    ? "Always on: the Sign In page can't be turned off"
                    : `Always on: ${
                        EMAIL_TEMPLATES[page.slug]?.requiredReason ||
                        "needed for sign-up / password reset"
                      }`
                  : isAccountPage
                    ? page.visible
                      ? "On — click to turn off (hides its link on Sign In)"
                      : "Off — click to turn on"
                  : isEmail
                  ? page.visible
                    ? "Active — click to mark inactive"
                    : "Inactive — click to mark active"
                  : page.visible
                    ? "Visible — click to hide"
                    : "Hidden — click to show"
              }
            />
          </div>
        );
      }

      case "updated_at":
        return page.updated_at ? new Date(page.updated_at).toLocaleString() : "-";

      case "published_at":
        return page.published_at ? new Date(page.published_at).toLocaleString() : "Never";

      case "actions": {
        const isEditable = EDITABLE_SLUGS.has(page.slug);
        const isEmail = EMAIL_SLUGS.has(page.slug);
        const hasUnpublishedChanges =
          page.draft_body !== page.published_body ||
          page.draft_email_subject !== page.published_email_subject;
        return (
          <div className={styles.actionsCol}>
            {isEditable && <button onClick={() => setEditingPage(page)}>Edit</button>}
            <button onClick={() => openPreview(page.slug)}>Preview</button>
            {isEmail && EMAIL_TEMPLATES[page.slug]?.kind !== "default" && (
              <button onClick={() => setSendingPage(page)}>Send</button>
            )}
            {isEditable && (
              <>
                <button
                  onClick={() => handlePublish(page.slug)}
                  disabled={!hasUnpublishedChanges || publishingSlug === page.slug}
                >
                  {publishingSlug === page.slug ? "Publishing..." : "Publish"}
                </button>
                <button
                  onClick={() => handleDiscardDraft(page)}
                  disabled={!hasUnpublishedChanges}
                >
                  Discard Draft
                </button>
              </>
            )}
          </div>
        );
      }

      default:
        return page[key];
    }
  };

  return (
    <AdminContainer>
      <h2>Page Details</h2>

      <h3 className={styles.sectionHeading}>Pages</h3>
      <Table
        columns={columns}
        data={sitePages}
        renderCell={renderCell}
        loading={loading}
        enableRowDrag
        onRowReorder={handleReorder}
      />

      <h3 className={styles.sectionHeading}>Account Pages</h3>
      <Table
        columns={accountColumns}
        data={accountPages}
        renderCell={renderCell}
        loading={loading}
      />

      <h3 className={styles.sectionHeading}>Emails</h3>
      <Table
        columns={emailColumns}
        data={emailPages}
        renderCell={renderCell}
        loading={loading}
      />

      {editingPage && (
        <PagesEditDialog
          page={editingPage}
          onClose={() => setEditingPage(null)}
          onSaved={() => {
            fetchPages();
            setEditingPage(null);
          }}
        />
      )}

      {sendingPage && (
        <SendEmailDialog page={sendingPage} onClose={() => setSendingPage(null)} />
      )}
    </AdminContainer>
  );
};

export default PagesAdmin;
