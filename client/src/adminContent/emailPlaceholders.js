// Placeholder tokens insertable into an email-template page_content row's
// Subject/body (see admin/pages/pages/emailSlugs.js).
//
// These are deliberately NOT component-registry chips (componentRegistry.js
// / ComponentChip): chips only render via client-side React hydration
// (RichText's portal mount in a browser), which works for the live public
// site and this admin's own preview, but does nothing in a real email
// client — there's no JS running there, so a chip would show up as a blank
// empty <div> in someone's inbox. Placeholders instead insert as plain
// {TOKEN} text, substituted into real HTML server-side (routes/pagesAdmin.js)
// before the email is ever rendered by a mail client, and mirrored
// client-side (adminContent/applyTemplateValues.js) for live preview.
//
// `pages` mirrors componentRegistry.js's own filter: null means available
// on every email template, an array scopes it to specific slugs — used here
// so "Response Email" (single rock) doesn't offer the multi-rock tokens and
// vice versa.
const EMAIL_PLACEHOLDERS = [
  { key: "rock-number", label: "Rock Number", token: "{ROCK_NUMBER}", pages: ["response-email"] },
  { key: "rock-image", label: "Rock Image", token: "{ROCK_IMAGE}", pages: ["response-email"] },
  {
    key: "rock-numbers",
    label: "Rock Numbers",
    token: "{ROCK_NUMBERS}",
    pages: ["response-email-multi"],
  },
  {
    key: "rock-images",
    label: "Rock Images",
    token: "{ROCK_IMAGES}",
    pages: ["response-email-multi"],
  },
  {
    key: "rock-numbers-with-links",
    label: "Rock Numbers (with links)",
    token: "{ROCK_NUMBERS_WITH_LINKS}",
    pages: ["response-email-multi"],
  },
];

export default EMAIL_PLACEHOLDERS;
