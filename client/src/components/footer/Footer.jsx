import { useState } from "react";
import ComingSoonPopup from "../coming-soon/ComingSoonPopup";
import ContactPopup from "../contact-popup/ContactPopup";
import styles from "./Footer.module.css";
import ARAudioPlayer from "../ar-audio-player/ARAudioPlayer";

const Footer = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);

  const handleSocialClick = (e) => {
    e.preventDefault();
    setShowPopup(true);
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    setShowContactPopup(true);
  };

  return (
    <>
      <div className={styles.footerContent}>
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
      <ARAudioPlayer />

      {showPopup && <ComingSoonPopup onClose={() => setShowPopup(false)} />}
      {showContactPopup && <ContactPopup onClose={() => setShowContactPopup(false)} />}
    </>
  );
};

export default Footer;
