import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ContactReqestRocks from "../contact-request-rocks/ContactReqestRocks";
import styles from "./FloatingRockLink.module.css";

const FloatingRockLink = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showContactPopup, setShowContactPopup] = useState(false);

  const handleRequestClick = () => {
    setShowContactPopup(true);
  };

  // Check if the current path is exactly "/share-your-rock"
  const isSharePage = location.pathname === "/share-your-rock";

  return (
    <>
      <div className={styles.container}>
        {!isSharePage && (
          <button
            className={styles.button}
            onClick={() => {
              navigate("/share-your-rock");
              window.scrollTo(0, 0);
            }}
          >
            Share Your Rock
          </button>
        )}

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