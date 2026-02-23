// components/contact-request-rocks/ContactReqestRocks.jsx
import React from "react";
import styles from "./ContactReqestRocks.module.css";

const ContactReqestRocks = ({ onClose }) => {
  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
        <h2>Request A Rock</h2>
        <p className={styles.callout}>If you want to have some rocks sent to you for your other trips
          or have any other locations in mind you would like to place an Aiden
          Rock, reach out please. We will send them anywhere in the world for
          free. We just want to see them take off and see new places</p>
        <p>
          Please send us an email at{" "}
          <a href="mailto:AidensRocks.AAA@gmail.com">AidensRocks.AAA@gmail.com</a>
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ContactReqestRocks;
