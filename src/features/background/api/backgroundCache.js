const CURRENT_BACKGROUND_KEY = 'currentBackground';
const IMAGE_QUEUE_KEY = 'imageQueue';
const REUSABLE_BACKGROUND_TYPES = new Set([
  'api',
  'custom',
  'random_colour',
  'random_gradient',
]);

const parseJSON = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;

  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeCustomBackgrounds = (value) => {
  const parsed = Array.isArray(value) ? value : parseJSON(value, value);

  if (Array.isArray(parsed)) {
    return parsed.filter(Boolean);
  }

  if (typeof parsed === 'string' && parsed.length > 0) {
    return [parsed];
  }

  return [];
};

export const readCurrentBackground = () => {
  return parseJSON(localStorage.getItem(CURRENT_BACKGROUND_KEY));
};

export const writeCurrentBackground = (background) => {
  if (!background) return;
  localStorage.setItem(CURRENT_BACKGROUND_KEY, JSON.stringify(background));
};

export const clearCurrentBackground = () => {
  localStorage.removeItem(CURRENT_BACKGROUND_KEY);
};

export const invalidateBackgroundCache = () => {
  clearCurrentBackground();
  localStorage.removeItem(IMAGE_QUEUE_KEY);
};

export const shouldReuseCurrentBackground = ({
  cachedBackground,
  backgroundType,
  backgroundAPI = 'mue',
  customBackground = [],
  backgroundExclude = [],
}) => {
  if (!cachedBackground || !REUSABLE_BACKGROUND_TYPES.has(backgroundType)) {
    return false;
  }

  switch (backgroundType) {
    case 'api':
      return (
        cachedBackground.type === 'api' &&
        cachedBackground.currentAPI === backgroundAPI &&
        !(
          cachedBackground.photoInfo?.pun &&
          backgroundExclude.includes(cachedBackground.photoInfo.pun)
        )
      );
    case 'custom':
      return (
        cachedBackground.type === 'custom' &&
        normalizeCustomBackgrounds(customBackground).includes(cachedBackground.url)
      );
    case 'random_colour':
    case 'random_gradient':
      return (
        cachedBackground.type === backgroundType &&
        typeof cachedBackground.style === 'string' &&
        cachedBackground.style.length > 0
      );
    default:
      return false;
  }
};

export const readReusableBackground = ({
  backgroundType = localStorage.getItem('backgroundType'),
  backgroundAPI = localStorage.getItem('backgroundAPI') || 'mue',
  customBackground = localStorage.getItem('customBackground'),
  backgroundExclude = parseJSON(localStorage.getItem('backgroundExclude'), []),
} = {}) => {
  const cachedBackground = readCurrentBackground();

  return shouldReuseCurrentBackground({
    cachedBackground,
    backgroundType,
    backgroundAPI,
    customBackground,
    backgroundExclude,
  })
    ? cachedBackground
    : null;
};
