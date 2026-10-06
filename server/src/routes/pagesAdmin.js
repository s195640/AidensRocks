const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const safeRollback = require("../utils/db/safeRollback");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const sendEmail = require("../utils/sendEmail");
const {
  renderEmailTemplate,
  REQUIRED_EMAIL_SLUGS,
  ADMIN_RECIPIENT_SLUGS,
} = require("../utils/emailTemplates");
const { isPlainEmail, parseSender } = require("../utils/emailAddress");
const { getContactEmail } = require("../utils/siteSettings");
const EMAIL_SLUGS = require("../utils/emailSlugs");
const { LOCKED_ON_PAGE_SLUGS } = require("../utils/accountPageSlugs");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(requireAdminAuth);

// -------------------- GET /api/admin/pages --------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT page_slug AS slug, nav_label, order_num, visible,
              draft_body, published_body,
              draft_email_subject, published_email_subject,
              draft_email_from, published_email_from,
              draft_email_reply_to, published_email_reply_to,
              draft_email_to, published_email_to,
              updated_at, published_at
       FROM page_content
       ORDER BY order_num`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin pages:", err);
    res.status(500).json({ error: "Server error fetching pages." });
  }
});

// -------------------- POST /api/admin/pages/reorder --------------------
router.post("/reorder", async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "Invalid or empty order array." });
  }

  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE page_content SET order_num = $1, updated_at = CURRENT_TIMESTAMP WHERE page_slug = $2`,
        [i, order[i]]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await safeRollback(client);
    console.error("Error reordering pages:", err);
    res.status(500).json({ error: "Server error reordering pages." });
  } finally {
    if (client) client.release();
  }
});

// -------------------- PATCH /api/admin/pages/:slug/visible --------------------
// For email-template rows (EMAIL_SLUGS) this doubles as Active/Inactive —
// POST /:slug/send checks it and refuses to send while off.
router.patch("/:slug/visible", async (req, res) => {
  const { slug } = req.params;

  if (LOCKED_ON_PAGE_SLUGS.has(slug)) {
    return res.status(400).json({ error: "The Sign In page can't be turned off." });
  }

  if (REQUIRED_EMAIL_SLUGS.has(slug)) {
    return res.status(400).json({
      error: "This email is always on and can't be turned off.",
    });
  }

  try {
    const result = await db.query(
      `UPDATE page_content
       SET visible = NOT visible, updated_at = CURRENT_TIMESTAMP
       WHERE page_slug = $1
       RETURNING visible`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({ success: true, visible: result.rows[0].visible });
  } catch (err) {
    console.error("Error toggling page visibility:", err);
    res.status(500).json({ error: "Server error toggling page visibility." });
  }
});

// Sender / Reply-To / Send To on an email template's draft. Each is
// optional in the request (undefined = leave as is); "" clears it back to
// the default. Returns { fields } with the values to store, or { error }.
function readAddressFields(slug, body) {
  const fields = {};
  const isEmail = EMAIL_SLUGS.has(slug);
  for (const key of ["email_from", "email_reply_to", "email_to"]) {
    if (body[key] === undefined) continue;
    if (!isEmail) return { error: "Sender / Reply-To / Send To only apply to email templates." };
    if (typeof body[key] !== "string") return { error: `'${key}' must be a string.` };
    fields[key] = body[key].trim() || null;
  }
  if (fields.email_from && !parseSender(fields.email_from)) {
    return { error: "Sender must be one email address, e.g. Aiden's Rocks <noreply@aidensrocks.com>." };
  }
  if (fields.email_reply_to && !isPlainEmail(fields.email_reply_to)) {
    return { error: "Reply-To must be a valid email address." };
  }
  if (fields.email_to !== undefined && !ADMIN_RECIPIENT_SLUGS.has(slug)) {
    return { error: "Send To only applies to emails sent to the family." };
  }
  if (fields.email_to && !isPlainEmail(fields.email_to)) {
    return { error: "Send To must be a valid email address." };
  }
  return { fields };
}

// -------------------- PUT /api/admin/pages/:slug/draft --------------------
router.put("/:slug/draft", async (req, res) => {
  const { slug } = req.params;
  const { body, email_subject } = req.body;

  if (typeof body !== "string") {
    return res.status(400).json({ error: "'body' must be a string." });
  }

  const { fields, error } = readAddressFields(slug, req.body);
  if (error) return res.status(400).json({ error });

  try {
    // email_subject is only meaningful for email-template rows; other pages
    // never send it, so COALESCE leaves their (always-empty) value alone.
    // The address fields are only touched when sent ($n::boolean flags), so
    // "" can clear one back to the default.
    const result = await db.query(
      `UPDATE page_content
       SET draft_body = $1,
           draft_email_subject = COALESCE($2, draft_email_subject),
           draft_email_from = CASE WHEN $4 THEN $5 ELSE draft_email_from END,
           draft_email_reply_to = CASE WHEN $6 THEN $7 ELSE draft_email_reply_to END,
           draft_email_to = CASE WHEN $8 THEN $9 ELSE draft_email_to END,
           updated_at = CURRENT_TIMESTAMP
       WHERE page_slug = $3
       RETURNING draft_body, draft_email_subject, draft_email_from, draft_email_reply_to, draft_email_to`,
      [
        body,
        email_subject ?? null,
        slug,
        "email_from" in fields,
        fields.email_from ?? null,
        "email_reply_to" in fields,
        fields.email_reply_to ?? null,
        "email_to" in fields,
        fields.email_to ?? null,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      body: row.draft_body,
      email_subject: row.draft_email_subject,
      email_from: row.draft_email_from,
      email_reply_to: row.draft_email_reply_to,
      email_to: row.draft_email_to,
    });
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ error: "Server error saving draft." });
  }
});

// -------------------- GET /api/admin/pages/:slug/preview --------------------
router.get("/:slug/preview", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `SELECT draft_body, draft_email_subject, visible FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      body: result.rows[0].draft_body,
      email_subject: result.rows[0].draft_email_subject,
      visible: result.rows[0].visible,
    });
  } catch (err) {
    console.error("Error fetching preview:", err);
    res.status(500).json({ error: "Server error fetching preview." });
  }
});

// Values a test send / preview may supply (the Preview and Send dialogs
// collect these per template, see client adminContent/emailTemplates.js).
// Everything else is derived server-side by utils/emailTemplates.js.
const readValues = (values) => (values && typeof values === "object" ? { ...values } : {});

// -------------------- POST /api/admin/pages/:slug/render --------------------
// Renders the *draft* subject/body with the given values, using the exact
// same code a real send uses (utils/emailTemplates.js), so Page Details'
// Preview always matches what actually goes out.
router.post("/:slug/render", async (req, res) => {
  const { slug } = req.params;
  if (!EMAIL_SLUGS.has(slug)) {
    return res.status(400).json({ error: "This page is not an email template." });
  }
  try {
    const rendered = await renderEmailTemplate(slug, readValues(req.body.values), {
      version: "draft",
    });
    if (!rendered) return res.status(404).json({ error: "Page not found." });
    res.json({
      subject: rendered.subject,
      html: rendered.html,
      from: rendered.from,
      replyTo: rendered.replyTo,
      to: rendered.to,
    });
  } catch (err) {
    console.error(`Error rendering email "${slug}":`, err);
    res.status(500).json({ error: "Failed to render email." });
  }
});

// -------------------- GET /api/admin/pages/:slug/template --------------------
// Published subject/body (raw, placeholders intact) + Active, for the
// "default" templates that pre-fill a freeform send (Rock Request reply,
// Send Email job) — the client fills in its own values. contactEmail is
// included so the client can fill {CONTACT_EMAIL} too.
router.get("/:slug/template", async (req, res) => {
  const { slug } = req.params;
  if (!EMAIL_SLUGS.has(slug)) {
    return res.status(400).json({ error: "This page is not an email template." });
  }
  try {
    const { rows } = await db.query(
      `SELECT published_email_subject AS subject, published_body AS body, visible
       FROM page_content WHERE page_slug = $1`,
      [slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Page not found." });
    res.json({ ...rows[0], contactEmail: await getContactEmail() });
  } catch (err) {
    console.error(`Error fetching template "${slug}":`, err);
    res.status(500).json({ error: "Server error fetching template." });
  }
});

// -------------------- POST /api/admin/pages/:slug/send --------------------
// Sends the *draft* content of an email-template row to a single recipient —
// the same content Preview shows (both render via utils/emailTemplates.js),
// so "what you previewed is what gets sent" holds without requiring a
// Publish step first. Only usable for EMAIL_SLUGS rows. This is a manual
// test-send — deliberately NOT gated on the row's `visible` (Active/
// Inactive) flag.
router.post("/:slug/send", async (req, res) => {
  const { slug } = req.params;
  const { to, values } = req.body;

  if (!EMAIL_SLUGS.has(slug)) {
    return res.status(400).json({ error: "This page is not an email template." });
  }

  if (typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return res.status(400).json({ error: "A valid recipient email address is required." });
  }

  try {
    const rendered = await renderEmailTemplate(slug, readValues(values), { version: "draft" });
    if (!rendered) {
      return res.status(404).json({ error: "Page not found." });
    }

    await sendEmail({
      to: to.trim(),
      from: rendered.from,
      replyTo: rendered.replyTo,
      subject: rendered.subject,
      html: rendered.html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(`Error sending email for "${slug}":`, err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// -------------------- POST /api/admin/pages/:slug/publish --------------------
router.post("/:slug/publish", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `UPDATE page_content
       SET published_body = draft_body,
           published_email_subject = draft_email_subject,
           published_email_from = draft_email_from,
           published_email_reply_to = draft_email_reply_to,
           published_email_to = draft_email_to,
           published_at = CURRENT_TIMESTAMP
       WHERE page_slug = $1
       RETURNING published_body, published_email_subject, published_email_from,
                 published_email_reply_to, published_email_to, published_at`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      success: true,
      published_body: result.rows[0].published_body,
      published_email_subject: result.rows[0].published_email_subject,
      published_email_from: result.rows[0].published_email_from,
      published_email_reply_to: result.rows[0].published_email_reply_to,
      published_email_to: result.rows[0].published_email_to,
      published_at: result.rows[0].published_at,
    });
  } catch (err) {
    console.error("Error publishing page:", err);
    res.status(500).json({ error: "Server error publishing page." });
  }
});

module.exports = router;
