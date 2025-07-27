// ShareYourRock.jsx
import { useState } from "react";
import BkgImage from "../../components/bkgimage/BkgImage";
import UploadRockForm from "../../components/upload-rock-form/UploadRockForm";
import "./ShareYourRock.css";

const ShareYourRock = () => {
  const backgroundImage = `/media/bkg/rockbkg1.jpg`;
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="home-container">
      <BkgImage
        backgroundImage={backgroundImage}
        scrollTargetSelector=".additional-content"
      >
        <h1 className="share-heading" onClick={() => setShowForm(true)}>
          Share Your Rock
        </h1>
      </BkgImage>

      {showForm && <UploadRockForm onClose={() => setShowForm(false)} />}

      <div className="additional-content">
        <div className="additional-content-inner">
          <h2>Aiden's Rocks</h2>
          <p>Aiden loved rocks, add more later</p>
          <span>
            <p>Please share the rock you found! What to do!</p>
          </span>
          <ul>
            <li>TEST</li>
            <li>TEST2</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShareYourRock;
