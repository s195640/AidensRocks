import { useState } from "react";
import ComingSoonPopup from "../coming-soon/ComingSoonPopup"; // adjust path if needed
import ContactPopup from "../contact-popup/ContactPopup"; // import new component
import "./Footer.css";

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
      <div className="footer-content">
        <div className="footer-content-inner">
          <ul>
            <li>
              <a
                href="https://www.facebook.com/groups/1733974850593785/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="icon-circle">
                  <i className="fa-brands fa-facebook"></i>
                </div>
              </a>
            </li>
            <li>
              <a href="#" onClick={handleContactClick} aria-label="Contact Me">
                <div className="icon-circle">
                  <i className="fa-solid fa-envelope"></i> {/* envelope icon */}
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {showPopup && <ComingSoonPopup onClose={() => setShowPopup(false)} />}
      {showContactPopup && <ContactPopup onClose={() => setShowContactPopup(false)} />}
    </>
  );
};

export default Footer;
