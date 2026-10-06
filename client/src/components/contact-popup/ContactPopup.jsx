// components/contact-popup/ContactPopup.jsx
import { useSiteSettings } from "../../context/SiteSettingsContext";
import styles from "./ContactPopup.module.css";

const ContactPopup = ({ onClose }) => {
  // From Admin → Settings; never hard-coded.
  const { contactEmail } = useSiteSettings();
  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2>Contact Us</h2>
        <p>
          {contactEmail ? (
            <>
              Please send us an email at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          ) : (
            "Loading contact details…"
          )}
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ContactPopup;
