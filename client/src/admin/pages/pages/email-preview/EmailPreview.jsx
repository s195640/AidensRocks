import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import RichText from "../../../../adminContent/RichText";
import applyTemplateValues from "../../../../adminContent/applyTemplateValues";
import styles from "./EmailPreview.module.css";

// Standalone admin-only route (not part of the public nav) opened via
// PagesAdmin's "Preview" button for email-template rows (see emailSlugs.js).
// Reuses the same admin preview endpoint as real pages (draft_body, here
// alongside draft_email_subject) so it always reflects unsaved-but-draft
// content, just rendered inside an email-styled mockup instead of the site.
//
// {ROCK_NUMBER} etc. are substituted live, client-side, as the value is
// typed — leaving a field blank shows the raw placeholder text, same as
// what an unfilled value looks like if actually sent. Add more fields here
// (and to `values` below) alongside SendEmailDialog.jsx as more
// placeholders get introduced.
const MULTI_SLUG = "response-email-multi";
const EmailPreview = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [rockNumber, setRockNumber] = useState("");
  const [rockNumbers, setRockNumbers] = useState("");
  const isMulti = slug === MULTI_SLUG;

  useEffect(() => {
    axios
      .get(`/api/admin/pages/${slug}/preview`)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Failed to load email preview:", err);
        setError(true);
      });
  }, [slug]);

  if (error) return <div className={styles.wrapper}>Failed to load preview.</div>;
  if (!data) return <div className={styles.wrapper}>Loading preview...</div>;

  // Mirrors the same {ROCK_IMAGE}/{ROCK_IMAGES}/{ROCK_NUMBERS_WITH_LINKS}
  // construction as the server's POST /:slug/send (routes/pagesAdmin.js),
  // so what's previewed here matches what actually gets sent.
  const rockNum = parseInt(rockNumber, 10);
  const parsedRockNumbers = rockNumbers
    .split(/[,\s]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => n > 0);
  let values = {};
  if (isMulti) {
    if (parsedRockNumbers.length > 0) {
      values = {
        ROCK_NUMBERS: parsedRockNumbers.join(", "),
        ROCK_IMAGES: parsedRockNumbers
          .map(
            (n) =>
              `<div style="display:inline-block;margin:4px;"><img src="https://aidensrocks.com/media/catalog/${n}/a.webp" alt="Rock ${n}" style="max-width:100%;border-radius:8px;" /></div>`
          )
          .join(""),
        ROCK_NUMBERS_WITH_LINKS: parsedRockNumbers
          .map((n) => `<a href="https://aidensrocks.com/track-the-rocks?rock=${n}">${n}</a>`)
          .join(", "),
      };
    }
  } else if (rockNum > 0) {
    values = {
      ROCK_NUMBER: rockNum,
      ROCK_IMAGE: `<img src="https://aidensrocks.com/media/catalog/${rockNum}/a.webp" alt="Rock ${rockNum}" style="max-width:100%;border-radius:8px;" />`,
    };
  }
  const subject = applyTemplateValues(data.email_subject, values);
  const body = applyTemplateValues(data.body, values);

  return (
    <div className={styles.wrapper}>
      <div className={styles.previewControls}>
        {isMulti ? (
          <>
            <label htmlFor="preview-rock-numbers">
              Rock numbers (fills in <code>{"{ROCK_NUMBERS}"}</code> and{" "}
              <code>{"{ROCK_IMAGES}"}</code>)
            </label>
            <input
              id="preview-rock-numbers"
              type="text"
              value={rockNumbers}
              onChange={(e) => setRockNumbers(e.target.value)}
              placeholder="123, 124, 125"
            />
          </>
        ) : (
          <>
            <label htmlFor="preview-rock-number">
              Rock number (fills in <code>{"{ROCK_NUMBER}"}</code> and{" "}
              <code>{"{ROCK_IMAGE}"}</code>)
            </label>
            <input
              id="preview-rock-number"
              type="number"
              min="1"
              value={rockNumber}
              onChange={(e) => setRockNumber(e.target.value)}
              placeholder="123"
            />
          </>
        )}
      </div>

      <div className={styles.emailCard}>
        <div className={styles.emailHeader}>
          <div>
            <span className={styles.headerLabel}>From:</span> Aiden&apos;s Rocks
            &lt;AidensRocks.AAA@gmail.com&gt;
          </div>
          <div>
            <span className={styles.headerLabel}>Subject:</span>{" "}
            {subject || <em>(no subject)</em>}
          </div>
        </div>
        <div className={styles.emailBody}>
          <RichText html={body} />
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
