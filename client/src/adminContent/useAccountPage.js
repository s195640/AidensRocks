import { useEffect, useState } from "react";
import axios from "axios";
import { usePreview } from "./PreviewContext";
import { ACCOUNT_PAGES } from "./accountPages";

// Title / description / on-off for an account page (see accountPages.js).
// Published content normally; the draft (admin preview endpoint) when the
// page is opened from Page Details' Preview (?preview=1). Falls back to the
// built-in wording when the row is missing or its Title is blank, and
// treats a missing row as "on".
export function useAccountPage(slug) {
  const isPreview = usePreview();
  const { fallback } = ACCOUNT_PAGES[slug];
  const [page, setPage] = useState({ title: "", body: "", visible: true, loading: true });

  useEffect(() => {
    let cancelled = false;
    const url = isPreview ? `/api/admin/pages/${slug}/preview` : `/api/pages/${slug}/content`;

    axios
      .get(url)
      .then(({ data }) => {
        if (cancelled) return;
        setPage({
          title: (isPreview ? data.email_subject : data.title) || "",
          body: data.body || "",
          visible: data.visible !== false,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setPage({ title: "", body: "", visible: true, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isPreview]);

  return {
    title: page.title || fallback.title,
    // null = no published description; caller shows fallback.description.
    body: page.body || null,
    fallbackDescription: fallback.description,
    visible: ACCOUNT_PAGES[slug].lockedOn ? true : page.visible,
    loading: page.loading,
  };
}
