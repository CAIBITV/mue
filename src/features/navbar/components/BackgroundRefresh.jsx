import variables from 'config/variables';
import { memo, useEffect, useRef, useState } from 'react';
import { TbWindmill } from 'react-icons/tb';
import { Tooltip } from 'components/Elements';

const shouldShowRefresh = () => {
  const backgroundEnabled = localStorage.getItem('background') === 'true';
  const backgroundType = localStorage.getItem('backgroundType');
  const refreshEnabled = localStorage.getItem('refresh') !== 'false';
  const favouriteActive = Boolean(localStorage.getItem('favourite'));
  const welcomeActive =
    localStorage.getItem('showWelcome') === 'true' || Boolean(localStorage.getItem('welcomeTab'));

  return (
    backgroundEnabled &&
    refreshEnabled &&
    backgroundType !== 'colour' &&
    !favouriteActive &&
    !welcomeActive
  );
};

function getRotationFromMatrix(transformValue) {
  if (!transformValue || transformValue === 'none') return 0;

  const matrixValues = transformValue.match(/matrix\(([^)]+)\)/);
  if (!matrixValues) return 0;

  const [a, b] = matrixValues[1].split(',').map((value) => Number.parseFloat(value.trim()));
  const angle = Math.atan2(b, a) * (180 / Math.PI);

  return angle >= 0 ? angle : angle + 360;
}

function BackgroundRefresh({ phase = 'idle', onClick, previewOffset = false }) {
  const [visible, setVisible] = useState(shouldShowRefresh);
  const iconRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(shouldShowRefresh());
    };

    const handleRefresh = () => {
      updateVisibility();
    };

    document.addEventListener('refresh', handleRefresh);
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  useEffect(() => {
    const icon = iconRef.current;
    if (!icon) return;

    const currentRotation = getRotationFromMatrix(window.getComputedStyle(icon).transform);

    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }

    if (phase === 'loading') {
      icon.style.transform = `rotate(${currentRotation}deg)`;
      animationRef.current = icon.animate(
        [
          { transform: `rotate(${currentRotation}deg)` },
          { transform: `rotate(${currentRotation + 360}deg)` },
        ],
        {
          duration: 920,
          easing: 'linear',
          iterations: Infinity,
          fill: 'forwards',
        },
      );
      return;
    }

    if (phase === 'settling') {
      const finalRotation = currentRotation + 104;
      animationRef.current = icon.animate(
        [
          { transform: `rotate(${currentRotation}deg)` },
          { transform: `rotate(${currentRotation + 56}deg)`, offset: 0.42 },
          { transform: `rotate(${currentRotation + 88}deg)`, offset: 0.74 },
          { transform: `rotate(${finalRotation}deg)` },
        ],
        {
          duration: 560,
          easing: 'linear',
          fill: 'forwards',
        },
      );
      animationRef.current.onfinish = () => {
        icon.style.transform = `rotate(${finalRotation}deg)`;
      };
      return;
    }

    if (phase === 'idle' && currentRotation === 0) {
      icon.style.transform = 'rotate(0deg)';
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
    };
  }, [phase]);

  if (!visible) {
    return null;
  }

  return (
    <Tooltip
      title={variables.getMessage('widgets.navbar.tooltips.background_refresh')}
      subtitle={
        phase !== 'idle'
          ? variables.getMessage('modals.main.loading')
          : variables.getMessage('modals.main.settings.sections.background.title')
      }
    >
      <button
        className={`backgroundRefreshFloating${previewOffset ? ' backgroundRefreshFloating-dev' : ''}`}
        onClick={onClick}
        disabled={phase !== 'idle'}
        aria-label={variables.getMessage('widgets.navbar.tooltips.background_refresh')}
      >
        <TbWindmill ref={iconRef} className="backgroundRefreshIcon" />
      </button>
    </Tooltip>
  );
}

const MemoizedBackgroundRefresh = memo(BackgroundRefresh);

export {
  MemoizedBackgroundRefresh as default,
  MemoizedBackgroundRefresh as BackgroundRefresh,
};
