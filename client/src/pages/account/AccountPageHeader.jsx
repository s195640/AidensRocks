import RichText from "../../adminContent/RichText";
import styles from "./Account.module.css";

// Title + description from Page Details (useAccountPage), or the built-in
// wording until it's published.
const AccountPageHeader = ({ page }) => (
  <>
    <h2>{page.title}</h2>
    <div className={styles.subtitle}>
      {page.body ? <RichText html={page.body} /> : <p>{page.fallbackDescription}</p>}
    </div>
  </>
);

export default AccountPageHeader;
