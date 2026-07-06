import { useEffect, useState } from "react";
import axios from "axios";
import { usePreview } from "./PreviewContext";

// Fetches a page's live published content normally, or its draft (via the
// admin preview endpoint) when ?preview=1 is present. Callers should fall
// back to their current hardcoded copy when `body` comes back empty — only
// pages that have actually been edited through the admin screen have content
// here.
export function usePageContent(slug) {
  const isPreview = usePreview();
  const [body, setBody] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const url = isPreview
      ? `/api/admin/pages/${slug}/preview`
      : `/api/pages/${slug}/content`;

    axios
      .get(url)
      .then((res) => {
        if (!cancelled) setBody(res.data.body || "");
      })
      .catch((err) => {
        console.error(`Failed to load page content for "${slug}":`, err);
        if (!cancelled) setBody("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isPreview]);

  return { body, loading };
}
