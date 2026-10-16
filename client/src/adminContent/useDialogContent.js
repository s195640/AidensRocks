import { useEffect, useState } from "react";
import axios from "axios";
import { usePreview } from "./PreviewContext";
import { DIALOGS } from "./dialogs";

// Message + options for a dialog (see dialogs.js). Published content
// normally; the draft (admin preview endpoint) when the page is opened from
// Page Details' Preview (?preview=1). A missing row leaves `body` null (the
// caller shows fallbackMessage) and `settings` empty.
export function useDialogContent(slug) {
  const isPreview = usePreview();
  const [content, setContent] = useState({ body: "", settings: {}, loading: true });

  useEffect(() => {
    let cancelled = false;
    const url = isPreview ? `/api/admin/pages/${slug}/preview` : `/api/pages/${slug}/content`;

    axios
      .get(url)
      .then(({ data }) => {
        if (!cancelled) {
          setContent({ body: data.body || "", settings: data.settings || {}, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) setContent({ body: "", settings: {}, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isPreview]);

  return {
    body: content.body || null,
    fallbackMessage: DIALOGS[slug].fallback.message,
    settings: content.settings,
    loading: content.loading,
  };
}
