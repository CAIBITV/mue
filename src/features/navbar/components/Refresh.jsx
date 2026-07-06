import { useState, useEffect } from 'react';
import variables from 'config/variables';
import { MdRefresh } from 'react-icons/md';
import { Tooltip } from 'components/Elements';
import EventBus from 'utils/eventbus';

const normalizeRefreshOption = (option) => {
  if (option === 'background' || option === 'quotebackground') {
    return 'page';
  }

  return option || 'page';
};

function Refresh() {
  const [refreshText, setRefreshText] = useState('');
  const [refreshOption, setRefreshOption] = useState(
    normalizeRefreshOption(localStorage.getItem('refreshOption')),
  );

  useEffect(() => {
    EventBus.on('refresh', (data) => {
      if (data === 'navbar' || data === 'background') {
        setRefreshOption(normalizeRefreshOption(localStorage.getItem('refreshOption')));
        updateRefreshText();
      }
    });

    updateRefreshText();
  }, []);

  function updateRefreshText() {
    let text;
    switch (normalizeRefreshOption(localStorage.getItem('refreshOption'))) {
      case 'quote':
        text = variables.getMessage('modals.main.settings.sections.quote.title');
        break;
      default:
        text = variables.getMessage(
          'modals.main.settings.sections.appearance.navbar.refresh_options.page',
        );
        break;
    }

    setRefreshText(text);
  }

  function refresh() {
    switch (refreshOption) {
      case 'quote':
        return EventBus.emit('refresh', 'quoterefresh');
      default:
        window.location.reload();
    }
  }

  return (
    <Tooltip title={variables.getMessage('widgets.navbar.tooltips.refresh')} subtitle={refreshText}>
      <button
        className="navbarButton"
        onClick={refresh}
        aria-label={variables.getMessage('widgets.navbar.tooltips.refresh')}
      >
        <MdRefresh className="refreshicon topicons" />
      </button>
    </Tooltip>
  );
}

export { Refresh as default, Refresh };
