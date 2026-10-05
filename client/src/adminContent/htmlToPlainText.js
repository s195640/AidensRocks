// Converts an email template's rich-text HTML into plain text for the
// freeform (plain-text) send dialogs that use a "default" template:
// paragraphs/headings become blank-line-separated blocks, <br> a newline,
// a link "text (url)", and every other tag is dropped.
export default function htmlToPlainText(html) {
  if (!html) return "";
  const withBreaks = html
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (m, href, text) =>
      text.replace(/<[^>]+>/g, "") === href ? href : `${text} (${href})`
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, "\n\n");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return (doc.body.textContent || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
