import { useNavigate } from "react-router-dom";
import styles from "./FloatingRockLink.module.css";

const FloatingRockLink = () => {
  const navigate = useNavigate();

  return (
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
    </div>
  );
};

export default FloatingRockLink;
