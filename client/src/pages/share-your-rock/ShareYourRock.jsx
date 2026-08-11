import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FaFacebookSquare, FaInstagram } from "react-icons/fa";

import BkgImage from "../../components/bkgimage/BkgImage";
import ContentBody from "../../components/content-body/ContentBody";
import styles from "./ShareYourRock.module.css";
import FloatingRockLink from "../../components/floating-rock-link/FloatingRockLink";
import RichText from "../../adminContent/RichText";
import { usePageContent } from "../../adminContent/usePageContent";
import {
  UploadRockModalProvider,
  useUploadRockModal,
} from "../../adminContent/UploadRockModalProvider";

// Split out so it can call useUploadRockModal() as a descendant of the
// provider below — a component can't consume a context it renders itself.
const ShareYourRockContent = () => {
  const { open } = useUploadRockModal();
  const { body, loading } = usePageContent("share-your-rock");
  const useRichText = !loading && body;
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: the floating "Share Your Rock" button (shown on
  // other pages) sends visitors here with ?openUpload=1 so they land past
  // the header picture and straight in the upload dialog, instead of
  // having to scroll down and find the button themselves.
  useEffect(() => {
    if (!searchParams.get("openUpload")) return;
    document
      .querySelector(".additional-content")
      ?.scrollIntoView({ behavior: "smooth" });
    open();
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <ContentBody>
      {useRichText ? (
        <RichText html={body} />
      ) : (
        <>
          <h2>Aiden's Rocks</h2>
          <button onClick={open} className={styles.uploadBtn}>
            Upload Your Rock
          </button>
          <p>
            Aiden had a true passion for adventure. He just loved life. His best
            life was just being outside. He loved hiking, he loved traveling, he
            loved climbing, and he loved throwing rocks.
          </p>
          <p>
            Honoring him will be honoring all those loves. So here we are, asking
            other adventurous people in all walks of life, in all parts of the
            world to share Aiden’s spirit with us.
          </p>
          <p>
            Picturing Aiden’s smile, imagining his soul-grabbing laugh as these
            rocks travel…we thank you for the part you play in keeping his spirit
            alive.
          </p>
          <br />
          <p>
            <strong>If you found a rock, we ask a couple things of you:</strong>
          </p>
          <ol>
            <li>
              Relocate the rock. Wherever you found it, take it somewhere else.
              Take it with you on vacation, take it down the road, take it to your
              favorite public place, take it anywhere …just to help the rock
              TRAVEL. Please just leave it where someone else can find it. The
              hope is to watch and track the movements of these rocks throughout
              the world.
            </li>
            <li>
              Take a picture of the rock in the new location BEFORE you leave it for the next person to find. Love to see where
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
                    open();
                  }}
                >
                  here
                </a>{" "}
                and filling out the form.
              </li>
              <li>Send us an email at AidensRocks.AAA@gmail.com</li>
              <li>
                Share and follow our Facebook:{" "}
                <a
                  href="https://www.facebook.com/groups/1733974850593785/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  <FaFacebookSquare size={20} className={styles.socialIcon} />
                  Aidens Rocks
                </a>
              </li>
            </ul>
          </ol>
        </>
      )}
    </ContentBody>
  );
};

const ShareYourRock = () => {
  const backgroundImage = `/media/bkg/rock_bkg.webp`;

  return (
    <UploadRockModalProvider>
      <div>
        <FloatingRockLink />
        <BkgImage
          backgroundImage={backgroundImage}
          scrollTargetSelector=".additional-content"
        >
          <h1 style={{ height: "50vh" }}>Share Your Rock</h1>
        </BkgImage>

        <ShareYourRockContent />
      </div>
    </UploadRockModalProvider>
  );
};

export default ShareYourRock;
