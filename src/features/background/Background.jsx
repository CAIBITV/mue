import { useCallback } from 'react';
import BackgroundImage from './components/BackgroundImage';
import BackgroundVideo from './components/BackgroundVideo';

import { useBackgroundState } from './hooks/useBackgroundState';
import { useBackgroundLoader } from './hooks/useBackgroundLoader';
import { useBackgroundRenderer, useBackgroundFilters, useBackgroundOverlayFilters } from './hooks/useBackgroundRenderer';
import { useBackgroundEvents } from './hooks/useBackgroundEvents';

import './scss/index.scss';

/**
 * Background component - Manages and displays backgrounds
 * Supports: API images, custom images, colors, gradients, videos, and photo packs
 */
export default function Background({ manualRefreshToken = 0, onManualRefreshStateChange }) {
  const { backgroundData, updateBackground, resetBackground } = useBackgroundState();
  const { refreshBackground } = useBackgroundLoader(updateBackground, resetBackground, {
    manualRefreshToken,
    onManualRefreshStateChange,
  });
  const filterStyle = useBackgroundFilters();
  const overlayFilterStyle = useBackgroundOverlayFilters();
  const handleRenderComplete = useCallback(() => {
    onManualRefreshStateChange?.('settling');
  }, [onManualRefreshStateChange]);

  useBackgroundRenderer(backgroundData, handleRenderComplete);
  useBackgroundEvents(backgroundData, refreshBackground);

  return (
    <>
      {backgroundData.video ? (
        <BackgroundVideo
          url={backgroundData.url}
          filterStyle={filterStyle}
          onReady={handleRenderComplete}
        />
      ) : (
        <BackgroundImage
          photoInfo={backgroundData.photoInfo}
          currentAPI={backgroundData.currentAPI}
          url={backgroundData.url}
        />
      )}
      <div id="backgroundFilterOverlay" style={overlayFilterStyle} />
    </>
  );
}
