import { useState } from "react";
import ComingSoonPopup from "../coming-soon/ComingSoonPopup"; // adjust path if needed
import "./Footer.css";

const Footer = () => {
  const [showPopup, setShowPopup] = useState(false);

  const handleSocialClick = (e) => {
    e.preventDefault();
    setShowPopup(true);
  };

  return (
    <>
      <div className="footer-content">
        <div className="footer-content-inner">
          <ul>
            <li>
              <a href="#" onClick={handleSocialClick}>
                <div className="icon-circle">
                  <i className="fa-brands fa-facebook"></i>
                </div>
              </a>
            </li>
            <li>
              <a href="#" onClick={handleSocialClick}>
                <div className="icon-circle">
                  <i className="fa-brands fa-instagram"></i>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {showPopup && <ComingSoonPopup onClose={() => setShowPopup(false)} />}
    </>
  );
};

export default Footer;
