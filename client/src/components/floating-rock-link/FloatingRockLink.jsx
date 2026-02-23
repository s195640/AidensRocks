import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ContactReqestRocks from "../contact-request-rocks/ContactReqestRocks";
import styles from "./FloatingRockLink.module.css";

const FloatingRockLink = () => {
  const navigate = useNavigate();
  const [showContactPopup, setShowContactPopup] = useState(false);

  const handleRequestClick = () => {
    setShowContactPopup(true);
  };

  return (
    <>
      <div className={styles.container}>
        <button
          className={styles.button}
          onClick={() => {
            navigate("/share-your-rock");
            window.scrollTo(0, 0);
          }}
        >
          Share Your Rock
        </button>
        <button
          className={styles.button}
          onClick={handleRequestClick}
        >
          Request A Rock
        </button>
      </div>

      {showContactPopup && (
        <ContactReqestRocks onClose={() => setShowContactPopup(false)} />
      )}
    </>
  );
};

export default FloatingRockLink;