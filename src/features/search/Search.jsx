/* global chrome */
import variables from 'config/variables';
import {
  memo,
  createRef,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { MdSearch, MdMic } from 'react-icons/md';
import { Tooltip } from 'components/Elements';
import {
  getSearchEngines,
  getCurrentEngine,
  setCurrentEngine as persistCurrentEngine,
  performSearch,
} from 'utils/search/searchUtils';

import './search.scss';

function Search() {
  const [microphone, setMicrophone] = useState(null);
  const [classList] = useState(
    localStorage.getItem('widgetStyle') === 'legacy' ? 'searchIcons old' : 'searchIcons',
  );

  const [engineList, setEngineList] = useState(() => getSearchEngines());
  const [currentEngine, setCurrentEngine] = useState(() => getCurrentEngine());
  const [engineSelectorOpen, setEngineSelectorOpen] = useState(false);

  const micIcon = createRef();
  const engineSelectorRef = useRef(null);
  const searchInputRef = useRef(null);

  const refreshEngines = useCallback(() => {
    setEngineList(getSearchEngines());
    setCurrentEngine(getCurrentEngine());
  }, []);

  const updateCurrentEngine = useCallback((engine) => {
    if (!engine) {
      return;
    }
    persistCurrentEngine(engine.key);
    setCurrentEngine(engine);
    setEngineSelectorOpen(false);
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const voiceSearch = new window.webkitSpeechRecognition();
    voiceSearch.start();

    micIcon.current.classList.add('micActive');

    const searchText = searchInputRef.current || document.getElementById('searchtext');

    voiceSearch.onresult = (event) => {
      searchText.value = event.results[0][0].transcript;
    };

    voiceSearch.onend = () => {
      micIcon.current.classList.remove('micActive');
      if (searchText.value === '') {
        return;
      }

      setTimeout(() => {
        variables.stats.postEvent('feature', 'Voice search');
        performSearch(searchText.value, currentEngine);
      }, 1000);
    };
  }, [currentEngine, micIcon]);

  const init = useCallback(() => {
    if (localStorage.getItem('voiceSearch') === 'true') {
      setMicrophone(
        <button
          className="navbarButton"
          onClick={startSpeechRecognition}
          ref={micIcon}
          aria-label="Microphone Search"
        >
          <MdMic className="micIcon" />
        </button>,
      );
    }
  }, [micIcon, startSpeechRecognition]);

  useEffect(() => {
    if (!engineSelectorOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (engineSelectorRef.current && !engineSelectorRef.current.contains(event.target)) {
        setEngineSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [engineSelectorOpen]);

  useEffect(() => {
    init();
    if (localStorage.getItem('searchFocus') === 'true') {
      const element = searchInputRef.current || document.getElementById('searchtext');
      if (element) {
        element.focus();
      }
    }
  }, [init]);

  useEffect(() => {
    refreshEngines();
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStorageChange = (event) => {
      if (event.key === 'searchEngines' || event.key === 'currentSearchEngine') {
        refreshEngines();
      }
    };

    const handleCustomUpdate = () => {
      refreshEngines();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('searchEnginesUpdated', handleCustomUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('searchEnginesUpdated', handleCustomUpdate);
    };
  }, [refreshEngines]);

  const searchButton = useCallback(
    (event) => {
      event.preventDefault();
      const targetValue =
        event?.target?.value ||
        searchInputRef.current?.value ||
        document.getElementById('searchtext')?.value ||
        'mue fast';
      variables.stats.postEvent('feature', 'Search');
      performSearch(targetValue, currentEngine);
    },
    [currentEngine],
  );

  const toggleEngineSelector = useCallback(() => {
    setEngineSelectorOpen((previous) => !previous);
  }, []);

  return (
    <div className="searchComponents">
      <div className="searchMain">
        <div className={classList}>
          <Tooltip
            title={variables.getMessage('modals.main.settings.sections.search.voice_search')}
          >
            {microphone}
          </Tooltip>
        </div>
        <form onSubmit={searchButton} className="searchBar">
          <div className={classList}>
            <Tooltip title={variables.getMessage('widgets.search')}>
              <button className="navbarButton" onClick={searchButton} aria-label="Search">
                <MdSearch />
              </button>
            </Tooltip>
            <div className="searchEngineSelector" ref={engineSelectorRef}>
              <Tooltip title="选择搜索引擎">
                <button
                  className="navbarButton"
                  type="button"
                  aria-label="选择搜索引擎"
                  onClick={toggleEngineSelector}
                >
                  {currentEngine?.icon ? (
                    <img
                      src={currentEngine.icon}
                      alt={currentEngine?.name}
                      className="searchEngineIcon"
                    />
                  ) : (
                    <MdSearch />
                  )}
                </button>
              </Tooltip>
              {engineSelectorOpen && (
                <div className="searchDropdown">
                  {engineList.map((engine) => (
                    <button
                      type="button"
                      className={`searchDropdownItem ${
                        currentEngine?.key === engine.key ? 'searchDropdownListActive' : ''
                      }`}
                      key={engine.key}
                      onClick={() => updateCurrentEngine(engine)}
                    >
                      {engine.icon && (
                        <img src={engine.icon} alt={engine.name} className="searchEngineIcon" />
                      )}
                      <span>{engine.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder={variables.getMessage('widgets.search')}
            id="searchtext"
            className="searchInput"
            ref={searchInputRef}
          />
        </form>
      </div>
    </div>
  );
}

const MemoizedSearch = memo(Search);
export { MemoizedSearch as default, MemoizedSearch as Search };
