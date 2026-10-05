import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import RichText from "../../../../adminContent/RichText";
import EMAIL_TEMPLATES from "../../../../adminContent/emailTemplates";
import styles from "./EmailPreview.module.css";

// Standalone admin-only route (not part of the public nav) opened via
// PagesAdmin's "Preview" button for email-template rows (see emailSlugs.js),
// and also by the "Send Emails - Catch-up" job (SendEmailsCatchup.jsx) for a
// specific pending recipient. Shows the *draft* subject/body inside an
// email-styled mockup.
//
// Rendering happens server-side (POST /api/admin/pages/:slug/render) with
// the same code that really sends the email (server/src/utils/
// emailTemplates.js), re-rendered as values are typed. The inputs are the
// template's `fields` (adminContent/emailTemplates.js); a blank field
// leaves its raw {PLACEHOLDER} text, same as an unfilled value if sent.
//
// A field's `query` param (`rock`/`rocks`) plus `to` pre-fill the inputs
// and displayed recipient — used by SendEmailsCatchup.jsx. The fields stay
// editable either way.
const RENDER_DEBOUNCE_MS = 300;

const EmailPreview = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const fields = useMemo(() => EMAIL_TEMPLATES[slug]?.fields || [], [slug]);
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(
      fields.filter((f) => f.query).map((f) => [f.key, searchParams.get(f.query) || ""])
    )
  );
  const [rendered, setRendered] = useState(null);
  const [error, setError] = useState(false);
  const to = searchParams.get("to") || "";

  useEffect(() => {
    const values = {};
    for (const f of fields) {
      const v = (inputs[f.key] || "").trim();
      if (v) values[f.key] = v;
    }
    const timer = setTimeout(() => {
      axios
        .post(`/api/admin/pages/${slug}/render`, { values })
        .then((res) => {
          setRendered(res.data);
          setError(false);
        })
        .catch((err) => {
          console.error("Failed to render email preview:", err);
          setError(true);
        });
    }, rendered ? RENDER_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
    // `rendered` only picks the first-load delay; re-rendering on it would loop.
  }, [slug, fields, inputs]);

  if (error && !rendered) return <div className={styles.wrapper}>Failed to load preview.</div>;
  if (!rendered) return <div className={styles.wrapper}>Loading preview...</div>;

  return (
    <div className={styles.wrapper}>
      {fields.length > 0 && (
        <div className={styles.previewControls}>
          {fields.map((f) => (
            <label key={f.key} className={styles.fieldLabel}>
              <span>
                {f.label} (<code>{`{${f.key}}`}</code>)
              </span>
              <input
                type={f.type || "text"}
                min={f.type === "number" ? "1" : undefined}
                value={inputs[f.key] || ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </label>
          ))}
        </div>
      )}

      <div className={styles.emailCard}>
        <div className={styles.emailHeader}>
          <div>
            <span className={styles.headerLabel}>From:</span> Aiden&apos;s Rocks
            &lt;AidensRocks.AAA@gmail.com&gt;
          </div>
          {to && (
            <div>
              <span className={styles.headerLabel}>To:</span> {to}
            </div>
          )}
          <div>
            <span className={styles.headerLabel}>Subject:</span>{" "}
            {rendered.subject || <em>(no subject)</em>}
          </div>
        </div>
        <div className={styles.emailBody}>
          <RichText html={rendered.html} />
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
