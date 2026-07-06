import { useCallback, useEffect, useRef } from 'react';
import { clearCurrentBackground } from '../api/backgroundCache';
import { getBackgroundData } from '../api/backgroundLoader';

/**
 * Hook for loading and refreshing background data
 */
export function useBackgroundLoader(
  updateBackground,
  resetBackground,
  { manualRefreshToken = 0, onManualRefreshStateChange } = {},
) {
  const isLoadingRef = useRef(false);
  const previousManualRefreshTokenRef = useRef(manualRefreshToken);

  const loadBackground = useCallback(
    async ({ skipCache = false, forceRefresh = false, manual = false } = {}) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      let failed = false;

      try {
        // Check for welcome tab first
        const welcomeTab = localStorage.getItem('welcomeTab');
        if (welcomeTab) {
          const welcomeImage = localStorage.getItem('welcomeImage');
          if (welcomeImage) {
            updateBackground(JSON.parse(welcomeImage));
            return;
          }
        }

        const data = await getBackgroundData({ skipCache, forceRefresh });
        if (data) {
          updateBackground(data);
        } else if (manual && onManualRefreshStateChange) {
          onManualRefreshStateChange('idle');
        }
      } catch (error) {
        failed = true;
        console.error('Failed to load background:', error);
      } finally {
        isLoadingRef.current = false;
        if (manual && failed && onManualRefreshStateChange) {
          onManualRefreshStateChange('idle');
        }
      }
    },
    [onManualRefreshStateChange, updateBackground],
  );

  const refreshBackground = useCallback(
    async ({ manual = false } = {}) => {
      clearCurrentBackground();
      resetBackground();
      await loadBackground({
        skipCache: true,
        forceRefresh: true,
        manual,
      });
    },
    [loadBackground, resetBackground],
  );

  // Initial load - only run once on mount
  useEffect(() => {
    const changeMode = localStorage.getItem('backgroundchange');
    const hasStartTime = localStorage.getItem('backgroundStartTime');

    if (!hasStartTime || changeMode === 'refresh') {
      localStorage.setItem('backgroundStartTime', Date.now());
    }

    loadBackground();
  }, [loadBackground]);

  useEffect(() => {
    if (manualRefreshToken === previousManualRefreshTokenRef.current) {
      return;
    }

    previousManualRefreshTokenRef.current = manualRefreshToken;
    void refreshBackground({ manual: true });
  }, [manualRefreshToken, refreshBackground]);

  return { loadBackground, refreshBackground };
}
