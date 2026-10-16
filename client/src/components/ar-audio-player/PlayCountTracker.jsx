import { useEffect, useRef } from "react";
import axios from "axios";
import { newActivityId, startTimed, track } from "../../utils/activity";

// Invisible tracker mounted inside the audio player's interface grid (via
// AudioPlayer.CustomComponent, which injects `audioPlayerState`). Fires a
// play-count increment whenever a song transitions into "playing" - either
// a fresh play/resume of the current track, or an auto-advance/skip to a
// different track while playing. Does not fire on pause or on stop-at-end
// of a non-repeating playlist.
//
// Site Tracking: each of those plays is also a song_play (with a play_id),
// followed by exactly one song_stop saying how long it actually played
// (listened_ms, paused time not counted), the song's length, whether it
// reached the end, and why it stopped: pause, skip, ended, close (player
// closed) or leave (page left). Only observes the player.
const PlayCountTracker = ({ audioPlayerState }) => {
  const prevStateRef = useRef({ id: null, isPlaying: false });
  const playRef = useRef(null); // { playId, mKey, timer, duration, position }
  const endedRef = useRef(false);

  const curPlayId = audioPlayerState?.curPlayId;
  const isPlaying = !!audioPlayerState?.curAudioState?.isPlaying;
  const playList = audioPlayerState?.playList;
  const audioEl = audioPlayerState?.elementRefs?.audioEl;

  const endPlay = (reason) => {
    const play = playRef.current;
    if (!play) return;
    playRef.current = null;
    const listened = play.timer.end();
    const completed =
      reason === "ended" || (play.duration > 0 && play.position >= play.duration - 1);
    track("song_stop", {
      targetId: play.mKey,
      meta: {
        play_id: play.playId,
        listened_ms: listened,
        duration_ms: play.duration > 0 ? Math.round(play.duration * 1000) : null,
        completed,
        reason: completed && reason === "skip" ? "ended" : reason,
      },
    });
  };

  // Song length and position as it plays; "ended" for a natural finish.
  useEffect(() => {
    if (!audioEl) return undefined;
    const onTime = () => {
      const play = playRef.current;
      if (!play) return;
      if (Number.isFinite(audioEl.duration)) play.duration = audioEl.duration;
      play.position = audioEl.currentTime;
    };
    const onEnded = () => {
      endedRef.current = true;
    };
    audioEl.addEventListener("timeupdate", onTime);
    audioEl.addEventListener("ended", onEnded);
    return () => {
      audioEl.removeEventListener("timeupdate", onTime);
      audioEl.removeEventListener("ended", onEnded);
    };
  }, [audioEl]);

  useEffect(() => {
    const prev = prevStateRef.current;

    // The current play stopped (paused / finished) or moved to another song.
    if (playRef.current && (!isPlaying || prev.id !== curPlayId)) {
      const reason = endedRef.current ? "ended" : !isPlaying ? "pause" : "skip";
      endPlay(reason);
    }

    if (isPlaying && (!prev.isPlaying || prev.id !== curPlayId)) {
      endedRef.current = false;
      const song = playList?.find((s) => s.id === curPlayId);
      if (song?.m_key) {
        axios.put(`/api/music/${song.m_key}/increment-play`).catch((err) => {
          console.error("Failed to record song play:", err);
        });
        const playId = newActivityId();
        playRef.current = {
          playId,
          mKey: String(song.m_key),
          duration: 0,
          position: 0,
          // Music keeps playing in a background tab, so that time counts.
          timer: startTimed({ countHidden: true, onLeave: () => endPlay("leave") }),
        };
        track("song_play", { targetId: String(song.m_key), meta: { play_id: playId } });
      }
    }

    prevStateRef.current = { id: curPlayId, isPlaying };
  }, [curPlayId, isPlaying, playList]);

  // The player was closed (unmounted) mid-song.
  useEffect(() => () => endPlay("close"), []);

  return null;
};

export default PlayCountTracker;
