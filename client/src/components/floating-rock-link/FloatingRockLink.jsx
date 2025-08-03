import { useNavigate } from "react-router-dom";
import "./FloatingRockLink.css";

const FloatingRockLink = () => {
  const navigate = useNavigate();

  return (
    <div className="floating-rock-link">
      <button onClick={() => navigate("/share-your-rock")}>
        Share Your Rock
      </button>
    </div>
  );
};

export default FloatingRockLink;
