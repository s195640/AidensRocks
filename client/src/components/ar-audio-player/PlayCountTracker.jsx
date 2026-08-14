import { useEffect, useRef } from "react";
import axios from "axios";

// Invisible tracker mounted inside the audio player's interface grid (via
// AudioPlayer.CustomComponent, which injects `audioPlayerState`). Fires a
// play-count increment whenever a song transitions into "playing" - either
// a fresh play/resume of the current track, or an auto-advance/skip to a
// different track while playing. Does not fire on pause or on stop-at-end
// of a non-repeating playlist.
const PlayCountTracker = ({ audioPlayerState }) => {
  const prevStateRef = useRef({ id: null, isPlaying: false });

  const curPlayId = audioPlayerState?.curPlayId;
  const isPlaying = !!audioPlayerState?.curAudioState?.isPlaying;
  const playList = audioPlayerState?.playList;

  useEffect(() => {
    const prev = prevStateRef.current;

    if (isPlaying && (!prev.isPlaying || prev.id !== curPlayId)) {
      const song = playList?.find((s) => s.id === curPlayId);
      if (song?.m_key) {
        axios.put(`/api/music/${song.m_key}/increment-play`).catch((err) => {
          console.error("Failed to record song play:", err);
        });
      }
    }

    prevStateRef.current = { id: curPlayId, isPlaying };
  }, [curPlayId, isPlaying, playList]);

  return null;
};

export default PlayCountTracker;
