import axios from "axios";
import AudioPlayer from "react-modern-audio-player";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import CustomCloseComponent from "./CustomCloseComponent";
import CustomLyricsComponent from "./CustomLyricsComponent";
import PlayCountTracker from "./PlayCountTracker";
import PlayGuard from "./PlayGuard";
import Dialog from "../simple-components/dialog/Dialog";
import styles from "./ARAudioPlayer.module.css";

const mobile = {
  trackTimeCurrent: "row1-1",
  progress: "row1-2",
  trackInfo: "row1-2",
  trackTimeDuration: "row1-3",


  artwork: "row2-1",
  //  playerLyricsComponent: "row2-2",

  playButton: "row2-3",
  repeatType: "row2-4",
  volume: "row2-5",
  playList: "row2-6",
};
const cmobile = {
  playerCustomComponent: "row1-10",
  playerLyricsComponent: "row2-2",
};

const fullwidth = {
  artwork: "row1-1",
  //  playerLyricsComponent row1-2
  trackInfo: "row1-3",
  playButton: "row1-4",
  trackTimeCurrent: "row1-5",
  trackTimeDuration: "row1-6",
  progress: "row1-7",
  repeatType: "row1-8",
  volume: "row1-9",
  playList: "row1-10",
  //  playerCustomComponent row1-11
};
const cfullwidth = {
  playerCustomComponent: "row1-11",
  playerLyricsComponent: "row1-2",
};


// react-modern-audio-player seeks on a progress-bar tap/drag with
// `tapX / barWidth * audio.duration` and no guard, so a 0-width bar or a
// non-finite duration (NaN/Infinity) throws "The provided double value is
// non-finite" from the currentTime setter. Swallow those events before
// React's root listener hands them to the library.
const blockBadSeek = (e) => {
  const bar = e.target.closest?.(".bar-progress-wrapper");
  if (!bar) return;
  const audio = e.currentTarget.querySelector("audio");
  const duration = audio?.duration;
  if (!Number.isFinite(duration) || duration <= 0 || bar.clientWidth <= 0) {
    e.stopPropagation();
  }
};

const ARAudioPlayer = () => {
  const playerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [windowSize, setWindowSize] = useState("full");
  const [interfacePlacement, setInterfacePlacement] = useState(fullwidth);
  const [customComponentsArea, setCustomComponentsArea] = useState(cfullwidth);
  const [showPlayer, setShowPlayer] = useState(true);
  const [curPlayId, setCurPlayId] = useState(0);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/music");

      // Filter out hidden songs
      const visibleSongs = Array.isArray(data)
        ? data.filter(song => song.show !== false)
        : [];

      setSongs(visibleSongs);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const updatePlacement = () => {
      if (window.innerWidth < 700) {
        setWindowSize("mobile");
        setInterfacePlacement(mobile);
        setCustomComponentsArea(cmobile);
      } else {
        setWindowSize("full");
        setInterfacePlacement(fullwidth);
        setCustomComponentsArea(cfullwidth);
      }
    };
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, []);

  useEffect(() => {
    fetchSongs();
  }, []);

  const playerMounted = !loading && showPlayer && songs.length > 0;

  // The player sits in the footer of every page and gives its <audio> no
  // preload, so every page view downloaded the first song's mp3 even when
  // nobody pressed play (mobile data, and a "Broken audio" report whenever
  // a phone's connection dropped mid-download). react-modern-audio-player
  // has no preload option. A layout effect runs in the same task as the
  // commit that set src, before the browser starts fetching, so "none"
  // takes effect. Pressing play loads the song; the duration shows once it
  // has.
  useLayoutEffect(() => {
    const audio = playerRef.current?.querySelector("audio");
    if (audio) audio.preload = "none";
  }, [playerMounted]);
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    el.addEventListener("click", blockBadSeek, true);
    el.addEventListener("mousemove", blockBadSeek, true);
    return () => {
      el.removeEventListener("click", blockBadSeek, true);
      el.removeEventListener("mousemove", blockBadSeek, true);
    };
  }, [playerMounted]);

  if (loading) return null;
  if (!showPlayer) return null;
  if (songs.length <= 0) return null;

  return (
    <>
      <div ref={playerRef} className={styles.playerGuard}>
      <AudioPlayer
        playList={songs}
        activeUI={{
          all: true,
          progress: "bar",
        }}
        placement={{
          player: "bottom-left",
          interface: {
            templateArea: interfacePlacement,
            customComponentsArea: customComponentsArea,
          },
          playList: "top",
          volumeSlider: "top",
        }}
        rootContainerProps={{
          colorScheme: "dark",
          width: "100%",
        }}
      >
        <AudioPlayer.CustomComponent id="playerCustomComponent">
          <CustomCloseComponent onClose={() => setShowPlayer(false)} windowSize={windowSize} />
        </AudioPlayer.CustomComponent>
        <AudioPlayer.CustomComponent id="playerLyricsComponent">
          <CustomLyricsComponent setOpen={setOpen} setCurPlayId={setCurPlayId} />
        </AudioPlayer.CustomComponent>
        <AudioPlayer.CustomComponent id="playerLyricsComponent">
          <PlayCountTracker />
        </AudioPlayer.CustomComponent>
        <AudioPlayer.CustomComponent id="playerLyricsComponent">
          <PlayGuard />
        </AudioPlayer.CustomComponent>
      </AudioPlayer>
      </div>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Lyrics"
        buttonPanel={<button
          className={styles.closeButton}
          onClick={() => setOpen(false)}
        >
          ✕
        </button>}
      >
        <div className={styles.lyricsText}>
          {songs?.find(s => s.id === curPlayId)?.lyrics || ''}
        </div>
      </Dialog>
    </>
  );
};

export default ARAudioPlayer;
