import BkgImage from "../../components/bkgimage/BkgImage";
import "./ShareYourRock.css";

const ShareYourRock = () => {
  const backgroundImage = `/media/bkg/rockbkg1.jpg`;

  return (
    <div className="home-container">
      <BkgImage
        backgroundImage={backgroundImage}
        scrollTargetSelector=".additional-content"
      >
        <h1>Share Your Rock</h1>
      </BkgImage>

      {/* Scrollable content section */}
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
