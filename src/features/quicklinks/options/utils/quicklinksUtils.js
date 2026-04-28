import EventBus from 'utils/eventbus';

const QUICKLINKS_STORAGE_KEY = 'quicklinks';
const DEFAULT_GROUP_KEY = 'all';
const FAVICON_SERVICE_URL = 'https://icon.horse/icon/';
const QUICKLINK_ICON_TYPES = ['auto', 'url', 'file'];

const appendRefreshParam = (source, refreshKey) => {
  if (!source || !refreshKey) return source;
  const separator = source.includes('?') ? '&' : '?';
  return `${source}${separator}r=${refreshKey}`;
};

const getHostnameFromUrl = (rawUrl = '') => {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split('/')[0];
  }
};

export const getAutoIconUrl = (url, refreshKey) => {
  const hostname = getHostnameFromUrl(url);
  if (!hostname) return '';
  return appendRefreshParam(`${FAVICON_SERVICE_URL}${hostname}`, refreshKey);
};

export const normalizeQuicklinkIcon = (icon) => {
  if (icon && typeof icon === 'object') {
    const type = QUICKLINK_ICON_TYPES.includes(icon.type) ? icon.type : 'auto';
    return {
      type,
      value: typeof icon.value === 'string' ? icon.value : '',
      refreshedAt: icon.refreshedAt || '',
    };
  }

  if (typeof icon === 'string' && icon.trim().length > 0) {
    return {
      type: 'url',
      value: icon.trim(),
      refreshedAt: '',
    };
  }

  return {
    type: 'auto',
    value: '',
    refreshedAt: '',
  };
};

export const resolveQuicklinkIcon = (item = {}) => {
  const icon = normalizeQuicklinkIcon(item.icon);

  if (icon.type === 'file' || icon.type === 'url') {
    return appendRefreshParam(icon.value, icon.refreshedAt);
  }

  return getAutoIconUrl(item.url, icon.refreshedAt);
};

export const getQuicklinkInitial = (item = {}) => {
  const label = item.name || getHostnameFromUrl(item.url) || '?';
  return label.trim().slice(0, 1).toUpperCase() || '?';
};

export const normalizeQuicklinkUrl = (url = '') => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(about:|chrome:\/\/|edge:\/\/|firefox:\/\/)/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) return `http://${trimmed}`;
  return `https://${trimmed}`;
};

export const isValidQuicklinkUrl = (url = '') => {
  if (/^(about:|chrome:\/\/|edge:\/\/|firefox:\/\/)/i.test(url)) return true;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const normalizeQuicklink = (item = {}) => {
  if (!item || typeof item !== 'object') return null;
  const normalized = {
    ...item,
    group:
      typeof item.group === 'string' && item.group.trim().length > 0
        ? item.group
        : DEFAULT_GROUP_KEY,
  };
  return normalized;
};

const persistQuicklinks = (items) => {
  localStorage.setItem(QUICKLINKS_STORAGE_KEY, JSON.stringify(items));
};

const buildQuicklinkKey = () => `${Date.now().toString()}${Math.random().toString(36).substring(2)}`;

export const notifyQuicklinksChanged = () => {
  EventBus.emit('refresh', 'quicklinks');

  const extensionApi = globalThis.browser || globalThis.chrome;
  if (!extensionApi?.runtime?.sendMessage) return;

  try {
    const result = extensionApi.runtime.sendMessage({ type: 'mue.quicklinks.updated' });
    if (result?.catch) {
      result.catch(() => {});
    }
  } catch {
    // Ignore when the current context has no runtime listener available.
  }
};

export const readQuicklinks = () => {
  try {
    const raw = localStorage.getItem(QUICKLINKS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => normalizeQuicklink(item))
      .filter((item) => item !== null);
  } catch (e) {
    console.warn('Failed to parse quicklinks from localStorage. Resetting to []', e);
    return [];
  }
};

export const createQuicklink = ({
  name,
  url,
  icon = '',
  group = DEFAULT_GROUP_KEY,
  key,
}) => {
  const quicklinks = readQuicklinks();
  const newQuicklink = normalizeQuicklink({
    name,
    url,
    icon,
    key: key || buildQuicklinkKey(),
    group,
  });

  const updatedQuicklinks = [...quicklinks, newQuicklink];
  persistQuicklinks(updatedQuicklinks);
  notifyQuicklinksChanged();

  return newQuicklink;
};

export const updateQuicklink = (originalKey, updates = {}) => {
  const quicklinks = readQuicklinks();
  const index = quicklinks.findIndex((item) => item.key === originalKey);
  if (index === -1) return null;

  const updatedQuicklink = normalizeQuicklink({
    ...quicklinks[index],
    ...updates,
  });

  const updatedQuicklinks = quicklinks.map((item, itemIndex) =>
    itemIndex === index ? updatedQuicklink : item,
  );

  persistQuicklinks(updatedQuicklinks);
  notifyQuicklinksChanged();

  return updatedQuicklink;
};

export const deleteQuicklink = (key) => {
  const quicklinks = readQuicklinks();
  const updatedQuicklinks = quicklinks.filter((item) => item.key !== key);
  if (updatedQuicklinks.length === quicklinks.length) return quicklinks;

  persistQuicklinks(updatedQuicklinks);
  notifyQuicklinksChanged();

  return updatedQuicklinks;
};

export const refreshQuicklinkIcon = (key) =>
  updateQuicklink(key, {
    icon: {
      type: 'auto',
      value: '',
      refreshedAt: Date.now().toString(),
    },
  });

export const assignQuicklinkToGroup = (key, groupKey = DEFAULT_GROUP_KEY) => {
  const quicklinks = readQuicklinks();
  const index = quicklinks.findIndex((item) => item.key === key);
  if (index === -1) return null;

  const nextGroup = typeof groupKey === 'string' && groupKey.trim().length > 0 ? groupKey : DEFAULT_GROUP_KEY;
  const updatedQuicklinks = quicklinks.map((item, idx) =>
    idx === index ? { ...item, group: nextGroup } : item,
  );

  persistQuicklinks(updatedQuicklinks);
  notifyQuicklinksChanged();

  return updatedQuicklinks[index];
};
