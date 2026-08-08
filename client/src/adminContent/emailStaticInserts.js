// Ready-to-send HTML snippets insertable into an email-template body (see
// admin/pages/pages/emailSlugs.js) via the editor's Insert ▾ menu. Unlike
// emailPlaceholders.js's {TOKEN} entries, these need no send-time
// substitution — they're identical for every recipient — so they're
// inserted as real, final HTML immediately, not a token.
//
// Deliberately NOT a componentRegistry chip: chips only render via
// client-side React hydration (RichText's portal mount in a browser), which
// does nothing in a real email client. This mirrors the plain <a> markup
// adminContent/components/FacebookLink.jsx renders on the public site, so
// it looks and works the same without any JS needing to run.
const EMAIL_STATIC_INSERTS = [
  {
    key: "facebook-link",
    label: "Facebook Link",
    html: '<a href="https://www.facebook.com/groups/1733974850593785/" target="_blank" rel="noopener noreferrer">Follow us on Facebook</a>',
  },
];

export default EMAIL_STATIC_INSERTS;
