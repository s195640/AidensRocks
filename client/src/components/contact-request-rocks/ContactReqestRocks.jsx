// components/contact-request-rocks/ContactReqestRocks.jsx
import React from "react";
import styles from "./ContactReqestRocks.module.css";

const ContactRequestRocks = ({ onClose }) => {
  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2>Request A Rock</h2>
        <p className={styles.callout}>
          If you would like some rocks sent to you for your upcoming trips, or
          if you have a special location in mind where you’d like to place an
          Aiden Rock, please reach out and let us know how many you would
          like and where to send them. We will send them anywhere in the world
          for free; we just want to see them take off and travel!
        </p>
        <p>
          Please send us an email at{" "}
          <a href="mailto:AidensRocks.AAA@gmail.com">AidensRocks.AAA@gmail.com</a>
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ContactRequestRocks;