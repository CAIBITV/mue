import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import Background from 'features/background/Background';
import Widgets from 'features/misc/views/Widgets';
import Modals from 'features/misc/modals/Modals';
import { loadSettings, moveSettings } from 'utils/settings';
import EventBus from 'utils/eventbus';
import variables from 'config/variables';

const useAppSetup = () => {
  useEffect(() => {
    const firstRun = localStorage.getItem('firstRun');
    const stats = localStorage.getItem('stats');

    if (!firstRun || !stats) {
      moveSettings();
      window.location.reload();
    }

    loadSettings();

    const refreshHandler = (data) => {
      if (data === 'other') {
        loadSettings(true);
      }
    };

    EventBus.on('refresh', refreshHandler);

    const storageHandler = (event) => {
      if (event.storageArea !== localStorage) return;

      switch (event.key) {
        case 'quicklinks':
          EventBus.emit('refresh', 'quicklinks');
          break;
        case 'quicklinkGroups':
          EventBus.emit('refresh', 'quicklinkGroups');
          break;
        case 'currentQuicklinkGroup':
          EventBus.emit('refresh', 'currentQuicklinkGroup');
          break;
        case 'quicklinksLayout':
          EventBus.emit('refresh', 'quicklinksLayout');
          break;
      }
    };

    const extensionApi = globalThis.browser || globalThis.chrome;
    const runtimeMessageHandler = (message) => {
      if (message?.type === 'mue.quicklinks.updated') {
        EventBus.emit('refresh', 'quicklinks');
      }
    };

    window.addEventListener('storage', storageHandler);
    extensionApi?.runtime?.onMessage?.addListener(runtimeMessageHandler);

    variables.stats.tabLoad();

    return () => {
      EventBus.off('refresh', refreshHandler);
      window.removeEventListener('storage', storageHandler);
      extensionApi?.runtime?.onMessage?.removeListener?.(runtimeMessageHandler);
    };
  }, []);
};

const App = () => {
  const [toastDisplayTime, setToastDisplayTime] = useState(2500);
  const [showBackground, setShowBackground] = useState(false);

  useEffect(() => {
    const storedToastDisplayTime = localStorage.getItem('toastDisplayTime');
    const storedBackground = localStorage.getItem('background');

    if (storedToastDisplayTime) {
      setToastDisplayTime(parseInt(storedToastDisplayTime, 10));
    }

    if (storedBackground === 'true') {
      setShowBackground(true);
    }
  }, []);

  useAppSetup();

  const openQuicklinkPreview = () => {
    const previewWindow = window.open(
      '/quicklink-popup.html?preview=1',
      'mueQuicklinkPreview',
      'popup=yes,width=420,height=720,resizable=yes',
    );

    previewWindow?.focus();
  };

  return (
    <>
      {showBackground && <Background />}
      <ToastContainer
        position="top-center"
        autoClose={toastDisplayTime}
        newestOnTop={true}
        closeOnClick
        pauseOnFocusLoss
      />
      <div id="center">
        <Widgets />
        <Modals />
      </div>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={openQuicklinkPreview}
          style={{
            position: 'fixed',
            right: '18px',
            bottom: '18px',
            zIndex: 9999,
            border: 0,
            borderRadius: '999px',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #ff6d36 0%, #ef4d2c 100%)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 18px 30px rgba(239, 77, 44, 0.24)',
          }}
        >
          {variables.getMessage('widgets.quicklinks.capture.open_preview')}
        </button>
      )}
    </>
  );
};

export default App;
