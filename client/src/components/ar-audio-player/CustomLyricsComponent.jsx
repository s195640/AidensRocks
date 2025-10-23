import { FaFileAlt } from "react-icons/fa";
import { MdOutlineLyrics } from "react-icons/md";
import styles from "./CustomLyricsComponent.module.css";

const CustomLyricsComponent = ({ audioPlayerState, setOpen, setCurPlayId }) => {

  return (
    <>
      <button
        className={styles.lyricsButton}
        title="Show Lyrics"
        onClick={() => { setOpen(true); setCurPlayId(audioPlayerState.curPlayId); }}
      >
        <div style={{ marginTop: "10px" }}>
          <MdOutlineLyrics size={25} />
        </div>
      </button>
    </>
  );
};

export default CustomLyricsComponent;
