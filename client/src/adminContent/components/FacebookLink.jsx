import { FaFacebookSquare } from "react-icons/fa";
import styles from "./FacebookLink.module.css";

export default function FacebookLink() {
  return (
    <a
      href="https://www.facebook.com/groups/1733974850593785/"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.socialLink}
    >
      <FaFacebookSquare size={20} className={styles.socialIcon} />
      Aidens Rocks
    </a>
  );
}
