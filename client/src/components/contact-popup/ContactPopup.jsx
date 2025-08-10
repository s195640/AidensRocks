// components/contact-popup/ContactPopup.jsx
import React from "react";
import "./ContactPopup.css";

const ContactPopup = ({ onClose }) => {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <h2>Contact Us</h2>
        <p>Please send us an email at <a href="mailto:AidensRocks.AAA@gmail.com">AidensRocks.AAA@gmail.com</a></p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ContactPopup;
