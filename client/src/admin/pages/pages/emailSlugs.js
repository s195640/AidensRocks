// Slugs whose page_content row represents an email template, not a real
// public page: visibility is permanently locked off (also enforced
// server-side, in routes/pagesAdmin.js's LOCKED_VISIBLE_SLUGS), the edit
// dialog shows a Subject field, and "Preview" renders an email mockup
// instead of opening a live route.
const EMAIL_SLUGS = new Set(["response-email"]);

export default EMAIL_SLUGS;
