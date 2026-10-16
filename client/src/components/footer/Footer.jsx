import { useState } from "react";
import ContactPopup from "../contact-popup/ContactPopup";
import styles from "./Footer.module.css";
import ARAudioPlayer from "../ar-audio-player/ARAudioPlayer";
import { track } from "../../utils/activity";
import ErrorBoundary from "../error-boundary/ErrorBoundary";

const Footer = () => {
  const [showContactPopup, setShowContactPopup] = useState(false);

  const handleContactClick = (e) => {
    e.preventDefault();
    setShowContactPopup(true);
    track("contact_open");
  };

  return (
    <>
      <div className={styles.footerContent} data-activity-where="footer">
        <div className={styles.footerContentInner}>
          <ul>
            <li>
              <a
                href="https://www.facebook.com/groups/1733974850593785/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.iconCircle}>
                  <i className="fa-brands fa-facebook"></i>
                </div>
              </a>
            </li>
            <li>
              <a href="#" onClick={handleContactClick} aria-label="Contact Me">
                <div className={styles.iconCircle}>
                  <i className="fa-solid fa-envelope"></i>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
      {/* A broken player quietly disappears rather than taking the page down. */}
      <ErrorBoundary where="music" variant="hidden">
        <ARAudioPlayer />
      </ErrorBoundary>

      {showContactPopup && <ContactPopup onClose={() => setShowContactPopup(false)} />}
    </>
  );
};

export default Footer;
