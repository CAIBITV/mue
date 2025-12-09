/* global chrome */
import DEFAULT_SEARCH_ENGINES from './searchEngines';

const SEARCH_ENGINES_KEY = 'searchEngines';
const CURRENT_ENGINE_KEY = 'currentSearchEngine';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getStorage = () => (isBrowser() ? window.localStorage : null);

const hasQueryPlaceholder = (url) => typeof url === 'string' && url.includes('{query}');

const normalizeTemplate = (url) => {
  if (!url) {
    return '';
  }

  if (hasQueryPlaceholder(url)) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}q={query}`;
};

const dispatchSearchEnginesEvent = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('searchEnginesUpdated'));
};

const readStoredEngines = () => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(SEARCH_ENGINES_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('读取搜索引擎配置失败:', error);
    return null;
  }
};

const writeEngines = (engines) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SEARCH_ENGINES_KEY, JSON.stringify(engines));
  dispatchSearchEnginesEvent();
};

export const getSearchEngines = () => {
  const stored = readStoredEngines();
  if (stored) {
    return stored;
  }

  return [...DEFAULT_SEARCH_ENGINES];
};

export const getCurrentEngine = () => {
  const engines = getSearchEngines();
  if (engines.length === 0) {
    return null;
  }

  const storage = getStorage();
  if (!storage) {
    return engines[0];
  }

  const storedKey = storage.getItem(CURRENT_ENGINE_KEY);
  if (storedKey) {
    const found = engines.find((engine) => engine.key === storedKey);
    if (found) {
      return found;
    }
  }

  return engines[0];
};

export const setCurrentEngine = (key) => {
  if (!key) {
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  const engines = getSearchEngines();
  const exists = engines.some((engine) => engine.key === key);
  if (!exists) {
    return;
  }

  storage.setItem(CURRENT_ENGINE_KEY, key);
  dispatchSearchEnginesEvent();
};

export const addCustomEngine = (name, url, icon = '') => {
  if (!name || !url) {
    return null;
  }

  const newEngine = {
    key: `custom-${Date.now()}`,
    name,
    url: normalizeTemplate(url),
    icon,
  };

  const engines = [...getSearchEngines(), newEngine];
  writeEngines(engines);
  setCurrentEngine(newEngine.key);
  return newEngine;
};

export const removeEngine = (key) => {
  if (!key) {
    return;
  }

  const engines = getSearchEngines();
  const filtered = engines.filter((engine) => engine.key !== key);
  const listToPersist = filtered.length > 0 ? filtered : [...DEFAULT_SEARCH_ENGINES];
  writeEngines(listToPersist);

  const current = getCurrentEngine();
  if (!current || !listToPersist.some((engine) => engine.key === current.key)) {
    const fallback = listToPersist[0];
    if (fallback) {
      setCurrentEngine(fallback.key);
    }
  }
};

export const performSearch = (query, engine) => {
  const rawQuery = typeof query === 'string' ? query.trim() : '';
  const searchTerm = rawQuery === '' ? 'mue fast' : rawQuery;

  const engines = getSearchEngines();
  const selectedEngine =
    engine || getCurrentEngine() || engines[0] || DEFAULT_SEARCH_ENGINES[0];

  const navigateWithEngine = () => {
    const template = selectedEngine?.url || DEFAULT_SEARCH_ENGINES[0].url;
    const targetUrl = template.replace('{query}', encodeURIComponent(searchTerm));
    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    }
  };

  if (
    !engine &&
    typeof chrome !== 'undefined' &&
    chrome?.search?.query
  ) {
    chrome.search
      .query({
        text: searchTerm,
        disposition: 'CURRENT_TAB',
      })
      .catch((error) => {
        console.error('Search API error:', error);
        navigateWithEngine();
      });
    return;
  }

  navigateWithEngine();
};
