// Placeholder tokens insertable into an email-template page_content row's
// Subject/body (see admin/pages/pages/emailSlugs.js). Derived from each
// template's `tokens` in emailTemplates.js.
//
// These are deliberately NOT component-registry chips (componentRegistry.js
// / ComponentChip): chips only render via client-side React hydration
// (RichText's portal mount in a browser), which works for the live public
// site and this admin's own preview, but does nothing in a real email
// client — there's no JS running there, so a chip would show up as a blank
// empty <div> in someone's inbox. Placeholders instead insert as plain
// {TOKEN} text, substituted into real HTML server-side
// (server/src/utils/emailTemplates.js) before the email is ever rendered by
// a mail client.
//
// `pages` mirrors componentRegistry.js's own filter: an array scoping each
// token to the templates that support it.
import EMAIL_TEMPLATES from "./emailTemplates";

const byToken = new Map();
for (const [slug, { tokens = [] }] of Object.entries(EMAIL_TEMPLATES)) {
  for (const [token, label] of tokens) {
    if (!byToken.has(token)) {
      byToken.set(token, {
        key: token.slice(1, -1).toLowerCase().replace(/_/g, "-"),
        label,
        token,
        pages: [],
      });
    }
    byToken.get(token).pages.push(slug);
  }
}

const EMAIL_PLACEHOLDERS = Array.from(byToken.values());

export default EMAIL_PLACEHOLDERS;
