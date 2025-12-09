import EventBus from 'utils/eventbus';

const QUICKLINKS_STORAGE_KEY = 'quicklinks';
const DEFAULT_GROUP_KEY = 'all';

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

export const assignQuicklinkToGroup = (key, groupKey = DEFAULT_GROUP_KEY) => {
  const quicklinks = readQuicklinks();
  const index = quicklinks.findIndex((item) => item.key === key);
  if (index === -1) return null;

  const nextGroup = typeof groupKey === 'string' && groupKey.trim().length > 0 ? groupKey : DEFAULT_GROUP_KEY;
  const updatedQuicklinks = quicklinks.map((item, idx) =>
    idx === index ? { ...item, group: nextGroup } : item,
  );

  persistQuicklinks(updatedQuicklinks);
  EventBus.emit('refresh', 'quicklinks');

  return updatedQuicklinks[index];
};
