// Slugs whose page_content row represents an email template, not a real
// public page: the "Active" toggle (page.visible) doubles as Active/Inactive
// rather than public-page visibility (the automated senders check it;
// required templates are always on). The "Send" button here is a manual
// test-send and is deliberately independent of it. The edit dialog also
// shows a Subject field, and "Preview" renders an email mockup instead of
// opening a live route. Per-template details live in
// adminContent/emailTemplates.js. Server mirror:
// server/src/utils/emailSlugs.js.
import EMAIL_TEMPLATES from "../../../adminContent/emailTemplates";

const EMAIL_SLUGS = new Set(Object.keys(EMAIL_TEMPLATES));

export default EMAIL_SLUGS;
