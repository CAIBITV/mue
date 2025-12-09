import EventBus from 'utils/eventbus';
import { readQuicklinks } from 'features/quicklinks/options/utils/quicklinksUtils';

const GROUPS_STORAGE_KEY = 'quicklinkGroups';
const CURRENT_GROUP_STORAGE_KEY = 'currentQuicklinkGroup';
const QUICKLINKS_LAYOUT_KEY = 'quicklinksLayout';
export const DEFAULT_QUICKLINKS_LAYOUT = {
  rows: 2,
  cols: 6,
  shape: 'square',
  gap: 12,
  itemsPerPage: 12,
};
const DEFAULT_GROUP = {
  key: 'all',
  name: 'All',
  color: '#888',
};

const createDefaultGroup = () => ({ ...DEFAULT_GROUP });

const sanitizeGroups = (groups) => {
  if (!Array.isArray(groups)) {
    return [createDefaultGroup()];
  }

  const seen = new Set();
  const sanitized = [];

  groups.forEach((group) => {
    if (!group || typeof group !== 'object') return;
    const { key, name, color } = group;
    if (typeof key !== 'string' || key.trim().length === 0) return;
    if (key === DEFAULT_GROUP.key) return;
    if (seen.has(key)) return;
    seen.add(key);
    sanitized.push({
      key,
      name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'Group',
      color: typeof color === 'string' && color.trim().length > 0 ? color.trim() : '#888',
    });
  });

  return [createDefaultGroup(), ...sanitized];
};

const clampNumber = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const sanitizeLayoutConfig = (config = {}) => {
  const safeRows = clampNumber(config.rows, 1, 4, DEFAULT_QUICKLINKS_LAYOUT.rows);
  const safeCols = clampNumber(config.cols, 2, 8, DEFAULT_QUICKLINKS_LAYOUT.cols);
  const safeGap = clampNumber(config.gap, 8, 24, DEFAULT_QUICKLINKS_LAYOUT.gap);
  const shape = config.shape === 'circle' ? 'circle' : 'square';
  const maxPerPage = safeRows * safeCols;
  const baseItems = clampNumber(
    config.itemsPerPage,
    1,
    maxPerPage,
    maxPerPage,
  );

  return {
    rows: safeRows,
    cols: safeCols,
    shape,
    gap: safeGap,
    itemsPerPage: baseItems,
  };
};

const persistGroups = (groups) => {
  const normalized = sanitizeGroups(groups);
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(normalized));
  EventBus.emit('refresh', 'quicklinkGroups');
  return normalized;
};

export const getQuicklinksLayout = () => {
  try {
    const saved = localStorage.getItem(QUICKLINKS_LAYOUT_KEY);
    if (!saved) return { ...DEFAULT_QUICKLINKS_LAYOUT };
    const parsed = JSON.parse(saved);
    return sanitizeLayoutConfig(parsed);
  } catch (e) {
    console.warn('Failed to parse quicklinks layout config. Resetting to default.', e);
    return { ...DEFAULT_QUICKLINKS_LAYOUT };
  }
};

export const setQuicklinksLayout = (config = {}) => {
  const merged = { ...getQuicklinksLayout(), ...(config || {}) };
  const sanitized = sanitizeLayoutConfig(merged);
  localStorage.setItem(QUICKLINKS_LAYOUT_KEY, JSON.stringify(sanitized));
  EventBus.emit('refresh', 'quicklinksLayout');
  return sanitized;
};

export const getGroups = () => {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return [createDefaultGroup()];
    const parsed = JSON.parse(raw);
    return sanitizeGroups(parsed);
  } catch (e) {
    console.warn('Failed to parse quicklink groups from localStorage. Resetting to default.', e);
    return [createDefaultGroup()];
  }
};

export const getCurrentGroup = () => {
  const stored = localStorage.getItem(CURRENT_GROUP_STORAGE_KEY) || DEFAULT_GROUP.key;
  const groups = getGroups();
  const exists = groups.some((group) => group.key === stored);
  return exists ? stored : groups[0]?.key || DEFAULT_GROUP.key;
};

export const setCurrentGroup = (key) => {
  const groups = getGroups();
  const targetKey = groups.some((group) => group.key === key)
    ? key
    : groups[0]?.key || DEFAULT_GROUP.key;
  localStorage.setItem(CURRENT_GROUP_STORAGE_KEY, targetKey);
  EventBus.emit('refresh', 'currentQuicklinkGroup');
  return targetKey;
};

export const addGroup = (name, color) => {
  const groups = getGroups();
  const customGroups = groups.filter((group) => group.key !== DEFAULT_GROUP.key);
  const newGroup = {
    key: `group_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : `Group ${customGroups.length + 1}`,
    color: typeof color === 'string' && color.trim().length > 0 ? color.trim() : '#888',
  };

  return persistGroups([...customGroups, newGroup]);
};

export const updateGroup = (key, name, color) => {
  if (!key || key === DEFAULT_GROUP.key) return getGroups();
  const groups = getGroups();
  const updated = groups.map((group) =>
    group.key === key
      ? {
          ...group,
          name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : group.name,
          color: typeof color === 'string' && color.trim().length > 0 ? color.trim() : group.color,
        }
      : group,
  );
  return persistGroups(updated);
};

export const removeGroup = (key) => {
  if (!key || key === DEFAULT_GROUP.key) return getGroups();
  const groups = getGroups();
  const filtered = groups.filter((group) => group.key !== key);
  const nextGroups = persistGroups(filtered);

  const quicklinks = readQuicklinks();
  let hasChanges = false;
  const updatedQuicklinks = quicklinks.map((item) => {
    if (item.group === key) {
      hasChanges = true;
      return { ...item, group: DEFAULT_GROUP.key };
    }
    return item;
  });

  if (hasChanges) {
    localStorage.setItem('quicklinks', JSON.stringify(updatedQuicklinks));
    EventBus.emit('refresh', 'quicklinks');
  }

  const currentGroup = getCurrentGroup();
  if (currentGroup === key) {
    setCurrentGroup(DEFAULT_GROUP.key);
  }

  return nextGroups;
};

export const getQuicklinksByGroup = (groupKey) => {
  const requestedKey =
    typeof groupKey === 'string' && groupKey.trim().length > 0
      ? groupKey
      : DEFAULT_GROUP.key;
  const groups = getGroups();
  const targetKey = groups.some((group) => group.key === requestedKey)
    ? requestedKey
    : DEFAULT_GROUP.key;
  const quicklinks = readQuicklinks();
  if (targetKey === DEFAULT_GROUP.key) {
    return quicklinks;
  }
  return quicklinks.filter((item) => item.group === targetKey);
};
