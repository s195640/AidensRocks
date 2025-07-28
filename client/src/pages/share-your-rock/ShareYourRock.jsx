// ShareYourRock.jsx
import { useState } from "react";
import { FaFacebookSquare, FaInstagram } from "react-icons/fa";

import BkgImage from "../../components/bkgimage/BkgImage";
import UploadRockForm from "../../components/upload-rock-form/UploadRockForm";
import "./ShareYourRock.css";

const ShareYourRock = () => {
  const backgroundImage = `/media/bkg/rock_bkg.webp`;
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
          <button onClick={() => setShowForm(true)} className="upload-btn">
            Upload Your Rock
          </button>
          <p>
            Aiden had a true passion for adventure. He just loved life. His best
            life was just being outside. He loved hiking, he loved traveling, he
            loved climbing, and he loved throwing rocks.
          </p>
          <p>
            Honoring him will be honoring all those loves. So here we are,
            asking more adventurous people in all walks of life, in all parts of
            the world to share Aiden’s spirit with us.{" "}
          </p>
          <p>
            Picturing Aiden’s smile, imaging his soul grabbing laugh as these
            rocks travel…we thank you for the part you play in keeping his
            spirit alive.
          </p>
          <br></br>
          <p>
            <strong>If you found a rock, we ask a couple things of you:</strong>
          </p>
          <ol>
            <li>
              Relocate the rock. Wherever you found it, take it somewhere else.
              Take it with you on vacation, take it down the road, take it to
              your favorite public place, take it anywhere …just to help the
              rock TRAVEL. Please just leave it where someone else can find it.
              The hope is it watch and track the movements of these rocks
              throughout the world.
            </li>
            <li>
              Take a picture of the rock in the new location. Love to see where
              these rocks travel, show their whereabouts if possible in whatever
              creative way you can come up with :)
            </li>
            <li>We want to give plenty of ways/options to share your rock</li>
            <ul>
              <li>
                Upload the images directly by clicking{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForm(true);
                  }}
                >
                  here
                </a>{" "}
                and filling out the form.
              </li>
              <li>Sent us an email at AidensRocks.AAA@gmail.com</li>
              <li>
                Share and follow our Facebook:{" "}
                <a
                  href="https://www.facebook.com/AidensRocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <FaFacebookSquare size={20} className="social-icon" />
                  Aidens Rocks
                </a>
              </li>
              <li>
                Share and follow our Instagram:{" "}
                <a
                  href="https://www.instagram.com/AidensRocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <FaInstagram size={20} className="social-icon" />
                  @Aidens Rocks
                </a>
              </li>
            </ul>
          </ol>
          <br></br>
          <p>
            <strong>
              ***If you want to have some rocks sent to you for your other trips
              or have any other locations in mind you would like to place an
              Aiden Rock, Reach out please. We will send them anywhere in the
              world for free. We just want to see them take off and see new
              places****
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareYourRock;
