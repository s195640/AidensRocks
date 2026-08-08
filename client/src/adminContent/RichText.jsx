import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import componentRegistry from "./componentRegistry";
import styles from "./RichText.module.css";

// Matches the tags/attrs TipTap's StarterKit + Link extension (Phase 5)
// actually produce, plus the chip mount points. Extend this list if a new
// TipTap node type is added later — kept explicit rather than relying on
// DOMPurify's broad defaults, since this is the one sanitization path shared
// by both the public site and the admin preview.
//
// "img" (+ src/alt/style) isn't produced by TipTap itself — it's only ever
// injected via {ROCK_IMAGE} template-placeholder substitution on
// email-template rows (adminContent/emailPlaceholders.js) before reaching
// here, so the preview can actually show it. `style` is intentionally
// allowed on top of this app's usual avoidance of inline styles: HTML email
// clients don't reliably support external/`<style>` CSS, so inline styles
// are the standard way to size an embedded image.
//
// "span" is the chip mount point going forward (ComponentChip.js) — "div"
// stays allowed too purely for already-stored content saved before that
// tag switch (a <div> mid-sentence isn't valid inside <p> and gets the
// paragraph auto-split by the browser's HTML parser; new saves emit span).
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "strong", "em", "b", "i",
    "ul", "ol", "li",
    "a",
    "div",
    "span",
    "img",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "data-component", "data-props", "src", "alt", "style"],
};

// Renders sanitized page body HTML, then walks the result for
// [data-component] nodes and mounts the matching registry component into
// each one via a portal — NOT a separate createRoot() call, which would
// start a brand-new, disconnected React tree with no access to this page's
// own context (UploadRockModalProvider, etc). A portal keeps the mounted
// component in the real component tree; only its DOM output is teleported
// into the sanitized markup.
export default function RichText({ html }) {
  const containerRef = useRef(null);
  const [mounts, setMounts] = useState([]);

  const sanitized = DOMPurify.sanitize(html || "", PURIFY_CONFIG);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mountPoints = container.querySelectorAll("[data-component]");
    const nextMounts = [];

    mountPoints.forEach((node, index) => {
      const key = node.getAttribute("data-component");
      const entry = componentRegistry[key];
      if (!entry) {
        console.warn(`RichText: unknown component "${key}" in body content`);
        return;
      }

      let props = {};
      try {
        props = JSON.parse(node.getAttribute("data-props") || "{}");
      } catch {
        console.warn(`RichText: invalid data-props for "${key}"`);
      }

      node.classList.add(styles.componentMount);
      nextMounts.push({ node, Component: entry.component, props, key: `${key}-${index}` });
    });

    setMounts(nextMounts);
  }, [sanitized]);

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: sanitized }} />
      {mounts.map(({ node, Component, props, key }) =>
        createPortal(<Component {...props} />, node, key)
      )}
    </>
  );
}
