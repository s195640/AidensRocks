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
const EMAIL_PLACEHOLDERS = [
  { key: "rock-number", label: "Rock Number", token: "{ROCK_NUMBER}" },
  { key: "rock-image", label: "Rock Image", token: "{ROCK_IMAGE}" },
];

export default EMAIL_PLACEHOLDERS;
