// Slugs whose page_content row represents an email template, not a real
// public page: the "Active" toggle (page.visible) doubles as Active/Inactive
// rather than public-page visibility, reserved for a future automated-send
// trigger to check — the "Send" button here is a manual test-send and is
// deliberately independent of it (works regardless of Active/Inactive). The
// edit dialog also shows a Subject field, and "Preview" renders an email
// mockup instead of opening a live route.
const EMAIL_SLUGS = new Set(["response-email", "response-email-multi"]);

export default EMAIL_SLUGS;
