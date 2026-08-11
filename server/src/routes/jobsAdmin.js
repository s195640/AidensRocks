const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const sendEmail = require("../utils/sendEmail");
const applyTemplateValues = require("../utils/applyTemplateValues");
const buildRockImageTag = require("../utils/buildRockImageTag");
const buildRockImagesTag = require("../utils/buildRockImagesTag");
const buildRockNumbersWithLinksTag = require("../utils/buildRockNumbersWithLinksTag");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(requireAdminAuth);

// -------------------- GET /api/admin/jobs/send-emails-catchup --------------------
// Backs the "Send Emails - Catch-up" job's confirmation dialog: one row per
// recipient email address with unsent rock-journey responses, aggregating
// every unsent rock number for that address into a single row. `template`
// picks which page_content email template (see emailSlugs.js) that row
// would go out with -- "response-email-multi" once an address has more than
// one unsent rock, "response-email" for exactly one -- mirroring the same
// single/multi split SendEmailDialog.jsx and EmailPreview.jsx already use
// for those two templates.
//
// Grouped case-insensitively (lower(email)): "Foo@Bar.com" and
// "foo@bar.com" are the same mailbox, so two submissions that only differ
// by casing must land in one row (one email, one combined rock list)
// instead of silently splitting into two separate catch-up entries. The
// lowercased form is what's returned and re-sent below.
router.get("/send-emails-catchup", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT email,
              string_agg(rock_number::text, ', ' ORDER BY rock_number) AS rocks,
              count(*) AS rock_count
       FROM (
         SELECT DISTINCT rock_number, lower(email) AS email
         FROM journey
         WHERE email != '' AND rock_number > 0 AND email_sent = false
       ) t
       GROUP BY email
       ORDER BY 3 DESC`
    );

    const rows = result.rows.map((row) => {
      const count = Number(row.rock_count);
      return {
        email: row.email,
        rocks: row.rocks,
        count,
        template: count > 1 ? "response-email-multi" : "response-email",
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching send-emails catch-up list:", err);
    res.status(500).json({ error: "Server error fetching catch-up list." });
  }
});

// -------------------- POST /api/admin/jobs/send-emails-catchup/send --------------------
// Sends one catch-up row's actual response email and, only once it succeeds,
// marks every matching journey row as sent -- this is a real send (unlike
// pagesAdmin.js's POST /:slug/send, which is an admin's own manual draft
// test), so it follows sendRockResponseEmail.js's convention instead:
// *published* body/subject, gated on the template being Active
// (page_content.visible), never draft content nor a client-supplied
// template slug.
//
// Body: { email, rocks } -- rocks is the same comma/space-separated string
// GET /send-emails-catchup returned for this row (row.rocks); re-parsed and
// re-counted here rather than trusting a client-supplied template slug, so
// the single/multi template choice can't be spoofed independently of the
// actual rock count.
router.post("/send-emails-catchup/send", async (req, res) => {
  const { email, rocks } = req.body;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: "A valid recipient email address is required." });
  }

  const rockNumbers = String(rocks ?? "")
    .split(/[,\s]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => n > 0);

  if (rockNumbers.length === 0) {
    return res.status(400).json({ error: "At least one rock number is required." });
  }

  const trimmedEmail = email.trim();
  const isMulti = rockNumbers.length > 1;
  const slug = isMulti ? "response-email-multi" : "response-email";

  const templateValues = isMulti
    ? {
        ROCK_NUMBERS: rockNumbers.join(", "),
        ROCK_IMAGES: buildRockImagesTag(rockNumbers),
        ROCK_NUMBERS_WITH_LINKS: buildRockNumbersWithLinksTag(rockNumbers),
      }
    : {
        ROCK_NUMBER: rockNumbers[0],
        ROCK_IMAGE: buildRockImageTag(rockNumbers[0]),
      };

  try {
    const templateRes = await db.query(
      `SELECT published_body, published_email_subject, visible
       FROM page_content
       WHERE page_slug = $1`,
      [slug]
    );

    if (templateRes.rowCount === 0) {
      return res.status(404).json({ error: "Email template not found." });
    }

    const { published_body, published_email_subject, visible } = templateRes.rows[0];

    if (!visible) {
      return res.status(400).json({
        error: `The "${isMulti ? "Response Email Multi" : "Response Email"}" template is Inactive -- activate it on Page Details before sending.`,
      });
    }

    await sendEmail({
      to: trimmedEmail,
      subject: applyTemplateValues(published_email_subject, templateValues) || "(No subject)",
      html: applyTemplateValues(published_body, templateValues),
    });

    // Case-insensitive match: GET /send-emails-catchup lowercases email for
    // grouping/display, so the row this came from may not be spelled the
    // same as it's stored on individual journey rows (e.g. "Foo@Bar.com").
    const updateRes = await db.query(
      `UPDATE journey
       SET email_sent = true, email_dt = CURRENT_TIMESTAMP
       WHERE lower(email) = $1 AND rock_number = ANY($2::int[]) AND email_sent = false`,
      [trimmedEmail.toLowerCase(), rockNumbers]
    );

    res.json({ success: true, updated: updateRes.rowCount });
  } catch (err) {
    console.error(`Error sending catch-up email to ${trimmedEmail}:`, err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

module.exports = router;
