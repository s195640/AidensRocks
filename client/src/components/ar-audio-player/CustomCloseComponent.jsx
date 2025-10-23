const CustomCloseComponent = ({ audioPlayerState, onClose, windowSize }) => {
  const audioEl = audioPlayerState?.elementRefs?.audioEl;

  const handleClose = () => {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    if (onClose) onClose();
  };

  return (
    <>
      <button className="close-button" onClick={handleClose} title="Close Player">
        ✕
      </button>

      <style>
        {`
          .close-button {
            position: absolute;
            bottom: ${windowSize === 'full' ? '40' : '85'}px;
            right: 8px;
            background: transparent;
            border: none;
            color: #ff5c5c;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 9999;
          }

          .close-button:hover {
            color: #ff1a1a;
            transform: scale(1.2);
          }
        `}
      </style>
    </>
  );
};

export default CustomCloseComponent;
