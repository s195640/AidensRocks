import BkgImage from "../components/bkgimage/BkgImage";
import "./Home.css";

function Home() {
  const backgroundImage = `/media/background2.jpeg`;

  return (
    <div className="home-container">
      <BkgImage
        backgroundImage={backgroundImage}
        scrollTargetSelector=".additional-content"
      >
        <h1>Aiden's Rocks</h1>
        <p>In Loving Memory of Aiden Armitage</p>
        <p>9/14/2022 - 5/20/2025</p>
      </BkgImage>

      {/* Scrollable content section */}
      <div className="additional-content">
        <div className="additional-content-inner">
          <h2>Additional Content</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
