import React from "react";
import "./ComingSoonPopup.css";

const ComingSoonPopup = ({ onClose }) => (
  <div className="popup-overlay" onClick={onClose}>
    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <h3>Coming Soon</h3>
      <p>
        Facebook, and Instagram pages are not currently available (coming soon).<br />
        If you find Aiden's rock in the meantime, please either use the website to upload the pictures or email us!<br />
        Thank you.
      </p>
      <button onClick={onClose}>Close</button>
    </div>
  </div>
);

export default ComingSoonPopup;
