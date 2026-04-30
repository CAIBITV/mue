import { isSyncInternalKey } from './configSyncKeys';

export const SYNC_SCHEMA_VERSION = 1;

const SYNC_KEY_ALLOWLIST = new Set([
  'animations',
  'apiQuality',
  'applinks',
  'appsEnabled',
  'authorDetails',
  'authorImg',
  'authorLink',
  'autocompleteProvider',
  'background',
  'backgroundAPI',
  'backgroundExclude',
  'backgroundFilter',
  'backgroundFilterAmount',
  'backgroundType',
  'backgroundVideoLoop',
  'backgroundVideoMute',
  'bgtransition',
  'blur',
  'brightness',
  'copyButton',
  'currentQuicklinkGroup',
  'currentSearchEngine',
  'customBackground',
  'customEvents',
  'date',
  'dateFormat',
  'datezero',
  'defaultGreetingMessage',
  'events',
  'favouriteEnabled',
  'favouriteQuote',
  'favouriteQuoteEnabled',
  'fontGoogle',
  'fontstyle',
  'fontweight',
  'greeting',
  'greetingName',
  'hourHand',
  'language',
  'localeFormatting',
  'location',
  'message',
  'messages',
  'minuteHand',
  'navbarHover',
  'notes',
  'notesEnabled',
  'notesPinned',
  'offlineMode',
  'order',
  'photoInformation',
  'photoMap',
  'quickLinksStyle',
  'quicklinkGroups',
  'quicklinks',
  'quicklinksLayout',
  'quicklinksenabled',
  'quicklinkstooltip',
  'quote',
  'quoteLanguage',
  'quoteShareButton',
  'quoteType',
  'refresh',
  'searchBar',
  'searchEngine',
  'searchFocus',
  'shortFormat',
  'showlocation',
  'tabName',
  'tempformat',
  'textBorder',
  'theme',
  'time',
  'timeType',
  'timeformat',
  'timezone',
  'todo',
  'todoEnabled',
  'todos',
  'view',
  'weatherEnabled',
  'weatherType',
  'widgetStyle',
  'windspeed',
  'zero',
  'zoomClock',
  'zoomDate',
  'zoomGreeting',
  'zoomMessage',
  'zoomNavbar',
  'zoomQuicklinks',
  'zoomQuote',
  'zoomWeather',
]);

const SYNC_KEY_EXCLUSIONS = new Set([
  'achievementTimestamps',
  'achievements',
  'backup_settings',
  'backgroundStartTime',
  'clear',
  'currentBackground',
  'currentQuote',
  'customcss',
  'debugtimeout',
  'firstRun',
  'imageQueue',
  'installed',
  'nextQuote',
  'oldBackgroundType',
  'oldQuoteType',
  'quoteStartTime',
  'removeItem',
  'setItem',
  'showReminder',
  'showWelcome',
  'statsData',
  'undefined',
  'welcomeImage',
]);

export function isConfigSyncAllowedKey(key) {
  return SYNC_KEY_ALLOWLIST.has(key) && !SYNC_KEY_EXCLUSIONS.has(key) && !isSyncInternalKey(key);
}

export function createConfigSyncData(source = localStorage) {
  const data = {};

  Array.from(SYNC_KEY_ALLOWLIST)
    .sort()
    .forEach((key) => {
      const value = source.getItem(key);
      if (value !== null && isConfigSyncAllowedKey(key)) {
        data[key] = value;
      }
    });

  return data;
}

export function filterConfigSyncData(data = {}) {
  return Object.keys(data)
    .filter(isConfigSyncAllowedKey)
    .sort()
    .reduce((filtered, key) => {
      filtered[key] = data[key];
      return filtered;
    }, {});
}

export function createConfigSyncPayload(data, deviceId, appVersion = __APP_VERSION__) {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    appVersion,
    updatedAt: new Date().toISOString(),
    deviceId,
    data: filterConfigSyncData(data),
  };
}

export function canonicalizeSyncData(data = {}) {
  return JSON.stringify(filterConfigSyncData(data));
}

export async function hashSyncData(data = {}) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(canonicalizeSyncData(data));

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  bytes.forEach((byte) => {
    hash = (hash << 5) - hash + byte;
    hash |= 0;
  });
  return String(hash);
}
