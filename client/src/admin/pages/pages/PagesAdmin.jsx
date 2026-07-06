import { useEffect, useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import AdminContainer from "../../components/admin-base/AdminContainer";
import Table from "../../../components/simple-components/table/Table";
import PagesEditDialog from "./pages-edit-dlg/PagesEditDialog";
import PAGE_PATHS from "../../../adminContent/pagePaths";
import styles from "./PagesAdmin.module.css";

// Only these pages were actually converted to CMS-driven body content
// (Phase 7). The other page_content rows exist purely so the navbar can be
// 100% DB-driven — those pages keep their own hardcoded JSX, so editing
// their (always-empty) body would silently do nothing. Visibility toggling
// and Preview still apply to every page, since those affect the nav.
const EDITABLE_SLUGS = new Set(["home", "share-your-rock", "sudc", "birthdays"]);

const PagesAdmin = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [publishingSlug, setPublishingSlug] = useState(null);

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
            ? { ...p, published_body: res.data.published_body, published_at: res.data.published_at }
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
      });
      setPages((prev) =>
        prev.map((p) => (p.slug === page.slug ? { ...p, draft_body: res.data.body } : p))
      );
    } catch (err) {
      console.error("Failed to discard draft:", err);
      alert("Failed to discard draft.");
    }
  };

  const openPreview = (slug) => {
    const path = PAGE_PATHS[slug] || "/";
    const separator = path.includes("?") ? "&" : "?";
    window.open(`${path}${separator}preview=1`, "_blank", "noopener,noreferrer");
  };

  const handleReorder = async (newData) => {
    setLoading(true);
    try {
      await axios.post("/api/admin/pages/reorder", {
        order: newData.map((p) => p.slug),
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
    { key: "visible", label: "Visible", sortable: false, defaultWidth: 80 },
    { key: "updated_at", label: "Last Updated", sortable: false, defaultWidth: 180 },
    { key: "published_at", label: "Last Published", sortable: false, defaultWidth: 180 },
    { key: "actions", label: "Actions", sortable: false, defaultWidth: 320 },
  ];

  const renderCell = (page, key) => {
    switch (key) {
      case "visible":
        return page.visible ? (
          <FaEye
            size={20}
            className={styles.visibilityIcon}
            style={{ color: "gray" }}
            onClick={() => handleToggleVisible(page.slug)}
            title="Visible — click to hide"
          />
        ) : (
          <FaEyeSlash
            size={20}
            className={styles.visibilityIcon}
            style={{ color: "#5cb85c" }}
            onClick={() => handleToggleVisible(page.slug)}
            title="Hidden — click to show"
          />
        );

      case "updated_at":
        return page.updated_at ? new Date(page.updated_at).toLocaleString() : "-";

      case "published_at":
        return page.published_at ? new Date(page.published_at).toLocaleString() : "Never";

      case "actions": {
        const isEditable = EDITABLE_SLUGS.has(page.slug);
        const hasUnpublishedChanges = page.draft_body !== page.published_body;
        return (
          <div className={styles.actionsCol}>
            {isEditable && <button onClick={() => setEditingPage(page)}>Edit</button>}
            <button onClick={() => openPreview(page.slug)}>Preview</button>
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
      <Table
        columns={columns}
        data={pages}
        renderCell={renderCell}
        loading={loading}
        enableRowDrag
        onRowReorder={handleReorder}
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
    </AdminContainer>
  );
};

export default PagesAdmin;
