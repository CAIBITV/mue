import variables from 'config/variables';
import { useState, useEffect } from 'react';

import { MdSettings } from 'react-icons/md';

import { Notes, Todo, Apps, Refresh, Maximise } from './components';
import { Tooltip } from 'components/Elements';

import EventBus from 'utils/eventbus';

import './scss/index.scss';

const normalizeRefreshOption = (option) => {
  if (option === 'background' || option === 'quotebackground') {
    return 'page';
  }

  return option || 'page';
};

const getZoomFontSize = () => {
  return Number(((localStorage.getItem('zoomNavbar') || 100) / 100) * 1.2) + 'rem';
};

const Navbar = ({ openModal }) => {
  const [classList] = useState(
    localStorage.getItem('widgetStyle') === 'legacy' ? 'navbar old' : 'navbar new',
  );
  const [refreshEnabled, setRefreshEnabled] = useState(localStorage.getItem('refresh'));
  const [refreshOption, setRefreshOption] = useState(
    normalizeRefreshOption(localStorage.getItem('refreshOption')),
  );
  const [zoomFontSize, setZoomFontSize] = useState(getZoomFontSize());
  const [navbarHover, setNavbarHover] = useState(localStorage.getItem('navbarHover') === 'true');
  const [viewEnabled, setViewEnabled] = useState(localStorage.getItem('view') === 'true');
  const [notesEnabled, setNotesEnabled] = useState(localStorage.getItem('notesEnabled') === 'true');
  const [todoEnabled, setTodoEnabled] = useState(localStorage.getItem('todoEnabled') === 'true');
  const [appsEnabled, setAppsEnabled] = useState(localStorage.getItem('appsEnabled') === 'true');

  useEffect(() => {
    const handleRefresh = (data) => {
      if (data === 'navbar' || data === 'background') {
        setRefreshEnabled(localStorage.getItem('refresh'));
        setRefreshOption(normalizeRefreshOption(localStorage.getItem('refreshOption')));
        setNavbarHover(localStorage.getItem('navbarHover') === 'true');
        setViewEnabled(localStorage.getItem('view') === 'true');
        setNotesEnabled(localStorage.getItem('notesEnabled') === 'true');
        setTodoEnabled(localStorage.getItem('todoEnabled') === 'true');
        setAppsEnabled(localStorage.getItem('appsEnabled') === 'true');
        setZoomFontSize(getZoomFontSize());
      }
    };

    EventBus.on('refresh', handleRefresh);
    return () => {
      EventBus.off('refresh');
    };
  }, []);

  const backgroundEnabled = localStorage.getItem('background') === 'true';

  const navbar = (
    <div className="navbar-container">
      <div className={classList}>
        {viewEnabled && backgroundEnabled ? (
          <Maximise fontSize={zoomFontSize} />
        ) : null}
        {notesEnabled && <Notes fontSize={zoomFontSize} />}
        {todoEnabled && <Todo fontSize={zoomFontSize} />}
        {appsEnabled && <Apps fontSize={zoomFontSize} />}

        {refreshEnabled !== 'false' && <Refresh fontSize={zoomFontSize} />}

        <Tooltip
          title={variables.getMessage('modals.main.navbar.settings', {
            type: variables.getMessage('modals.main.navbar.tooltips.refresh_' + refreshOption),
          })}
        >
          <button
            className="navbarButton"
            onClick={() => openModal('mainModal')}
            style={{ fontSize: zoomFontSize }}
            aria-label={variables.getMessage('modals.main.navbar.settings', {
              type: variables.getMessage('modals.main.navbar.tooltips.refresh_' + refreshOption),
            })}
          >
            <MdSettings className="settings-icon topicons" />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return navbarHover ? (
    <div className="navbar-hover">{navbar}</div>
  ) : (
    navbar
  );
};

export { Navbar as default, Navbar };
