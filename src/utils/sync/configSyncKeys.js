export const SYNC_PRIVATE_KEY = '__mue_sync_private__';
export const SYNC_PRIVATE_PREFIX = `${SYNC_PRIVATE_KEY}:`;

const SYNC_INTERNAL_PUBLIC_KEYS = new Set([
  'dropboxAppKey',
  'mueSyncStatus',
  'mueSyncPausedReason',
  'mueSyncConflict',
]);

export function isSyncPrivateKey(key) {
  return key === SYNC_PRIVATE_KEY || key.startsWith(SYNC_PRIVATE_PREFIX);
}

export function isSyncInternalKey(key) {
  return isSyncPrivateKey(key) || SYNC_INTERNAL_PUBLIC_KEYS.has(key);
}

export function shouldExportSettingKey(key) {
  return !isSyncInternalKey(key);
}

export function shouldImportSettingKey(key) {
  return !isSyncInternalKey(key);
}
