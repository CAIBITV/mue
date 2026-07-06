import { memo, useMemo } from 'react';

/**
 * BackgroundVideo component for rendering video backgrounds
 */
function BackgroundVideo({ url, filterStyle, onReady }) {
  const isMuted = useMemo(() => localStorage.getItem('backgroundVideoMute') === 'true', []);
  const shouldLoop = useMemo(() => localStorage.getItem('backgroundVideoLoop') === 'true', []);

  return (
    <video
      autoPlay
      muted={isMuted}
      loop={shouldLoop}
      style={filterStyle}
      id="backgroundVideo"
      onLoadedData={onReady}
      onCanPlay={onReady}
    >
      <source src={url} />
    </video>
  );
}

export default memo(BackgroundVideo);
