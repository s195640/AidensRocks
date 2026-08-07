import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import RichText from "../../../../adminContent/RichText";
import styles from "./EmailPreview.module.css";

// Standalone admin-only route (not part of the public nav) opened via
// PagesAdmin's "Preview" button for email-template rows (see emailSlugs.js).
// Reuses the same admin preview endpoint as real pages (draft_body, here
// alongside draft_email_subject) so it always reflects unsaved-but-draft
// content, just rendered inside an email-styled mockup instead of the site.
const EmailPreview = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

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

  return (
    <div className={styles.wrapper}>
      <div className={styles.emailCard}>
        <div className={styles.emailHeader}>
          <div>
            <span className={styles.headerLabel}>From:</span> Aiden&apos;s Rocks
            &lt;AidensRocks.AAA@gmail.com&gt;
          </div>
          <div>
            <span className={styles.headerLabel}>Subject:</span>{" "}
            {data.email_subject || <em>(no subject)</em>}
          </div>
        </div>
        <div className={styles.emailBody}>
          <RichText html={data.body} />
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
