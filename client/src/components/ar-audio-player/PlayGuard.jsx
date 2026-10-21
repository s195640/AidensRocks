import { useContext, useEffect } from "react";
import { audioPlayerDispatchContext } from "react-modern-audio-player";

// Invisible helper mounted inside the audio player (via
// AudioPlayer.CustomComponent, which injects `audioPlayerState`).
// react-modern-audio-player calls audio.play() without handling the returned
// promise, so when the browser refuses to start playback (iOS Safari:
// NotSupportedError "The operation is not supported." when the source can't
// be loaded, NotAllowedError when not tied to a tap) it becomes an unhandled
// rejection and the player is left showing "playing" with no sound. Wrap
// play() on this audio element to catch that and flip the player back to
// paused so the visitor can simply tap play again. AbortError (a play()
// interrupted by pause() or a track change) is a normal race and is ignored.
const PlayGuard = ({ audioPlayerState }) => {
  const dispatch = useContext(audioPlayerDispatchContext);
  const audioEl = audioPlayerState?.elementRefs?.audioEl;

  useEffect(() => {
    if (!audioEl) return undefined;
    const originalPlay = audioEl.play;
    audioEl.play = function play(...args) {
      const result = originalPlay.apply(this, args);
      if (!result?.catch) return result;
      return result.catch((err) => {
        if (err?.name === "AbortError") return;
        console.warn("Audio playback failed:", err);
        if (audioEl.paused) dispatch?.({ type: "CHANGE_PLAYING_STATE", state: false });
      });
    };
    return () => {
      audioEl.play = originalPlay;
    };
  }, [audioEl, dispatch]);

  return null;
};

export default PlayGuard;
