import EventBus from 'utils/eventbus';
import {
  canonicalizeSyncData,
  createConfigSyncData,
  createConfigSyncPayload,
  filterConfigSyncData,
  hashSyncData,
} from './configSyncSchema';
import { isConfigSyncAllowedKey } from './configSyncSchema';
import { connectDropbox, disconnectDropbox, getDropboxAccessToken, isDropboxConnected } from './dropboxAuth';
import {
  downloadDropboxSyncFile,
  getDropboxMetadata,
  isDropboxConflictError,
  uploadDropboxSyncFile,
} from './dropboxClient';
import { getSyncPrivateState, updateSyncPrivateState } from './syncPrivateStore';

export const CONFIG_SYNC_STATUS_EVENT = 'mue.configSync.statusChanged';
export const CONFIG_SYNC_IMPORT_DECISION_EVENT = 'mue.configSync.importDecisionRequired';
const STORAGE_CHANGE_EVENT = 'mue.storage.changed';
const UPLOAD_DEBOUNCE_MS = 3000;

let uploadTimer = null;
let importTransactionActive = false;
let applyingRemoteData = false;
let initialized = false;

const emitStatus = (state) => {
  EventBus.emit(CONFIG_SYNC_STATUS_EVENT, toPublicStatus(state));
};

const ensureDeviceId = async () => {
  const state = await getSyncPrivateState();
  if (state.deviceId) return state.deviceId;

  const deviceId = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}`;
  await updateSyncPrivateState((currentState) => ({ ...currentState, deviceId }));
  return deviceId;
};

const toPublicStatus = (state = {}) => ({
  connected: Boolean(state.dropbox?.refreshToken),
  status: state.status || 'disconnected',
  pausedReason: state.pausedReason,
  conflict: state.conflict,
  lastSyncedAt: state.lastSyncedAt,
  lastError: state.lastError,
  needsManualSyncReview: state.needsManualSyncReview,
});

const saveStatus = async (status, extra = {}) => {
  const nextState = await updateSyncPrivateState((state) => ({
    ...state,
    status,
    lastError: undefined,
    ...extra,
  }));
  emitStatus(nextState);
  return nextState;
};

const saveError = async (error) => {
  const nextState = await updateSyncPrivateState((state) => ({
    ...state,
    status: 'error',
    lastError: error?.message || error?.error_summary || String(error),
  }));
  emitStatus(nextState);
};

const applySyncDataToLocalStorage = (data) => {
  applyingRemoteData = true;
  try {
    Object.entries(filterConfigSyncData(data)).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  } finally {
    applyingRemoteData = false;
  }
};

const readRemotePayload = async (accessToken) => {
  const remote = await downloadDropboxSyncFile(accessToken);
  if (!remote) return null;

  const payload = JSON.parse(remote.content);
  return {
    payload,
    rev: remote.metadata.rev,
    data: filterConfigSyncData(payload.data || {}),
  };
};

export async function getConfigSyncStatus() {
  return toPublicStatus(await getSyncPrivateState());
}

export async function connectConfigSync() {
  await saveStatus('connecting');
  await connectDropbox();
  await ensureDeviceId();
  await pullConfigSync();
}

export async function disconnectConfigSync() {
  await disconnectDropbox();
  emitStatus(await getSyncPrivateState());
}

export async function pullConfigSync() {
  if (!(await isDropboxConnected())) return;

  try {
    await saveStatus('syncing');
    const accessToken = await getDropboxAccessToken();
    const remote = await readRemotePayload(accessToken);
    const localData = createConfigSyncData();
    const localHash = await hashSyncData(localData);

    if (!remote) {
      await uploadCurrentConfig();
      return;
    }

    const remoteHash = await hashSyncData(remote.data);
    const state = await getSyncPrivateState();
    const localChanged = state.lastSyncedHash && localHash !== state.lastSyncedHash;
    const remoteChanged = state.lastRemoteRev && remote.rev !== state.lastRemoteRev;

    if (localChanged && remoteChanged) {
      await saveStatus('conflict', {
        conflict: {
          remoteRev: remote.rev,
          remoteHash,
          localHash,
          remoteData: remote.data,
          detectedAt: new Date().toISOString(),
        },
      });
      return;
    }

    if (!localChanged || remoteChanged) {
      applySyncDataToLocalStorage(remote.data);
      await saveStatus('synced', {
        conflict: undefined,
        lastRemoteRev: remote.rev,
        lastSyncedHash: remoteHash,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    }

    await uploadCurrentConfig();
  } catch (error) {
    await saveError(error);
  }
}

export async function uploadCurrentConfig({ force = false } = {}) {
  const state = await getSyncPrivateState();
  if (!state.dropbox?.refreshToken) return;

  if (!force && (state.pausedReason || state.status === 'conflict' || importTransactionActive)) {
    return;
  }

  try {
    await saveStatus('syncing');
    const accessToken = await getDropboxAccessToken();
    const deviceId = await ensureDeviceId();
    const data = createConfigSyncData();
    const payload = createConfigSyncPayload(data, deviceId);
    const metadata = await uploadDropboxSyncFile(accessToken, payload, state.lastRemoteRev);
    const hash = await hashSyncData(data);

    await saveStatus('synced', {
      conflict: undefined,
      pausedReason: undefined,
      lastRemoteRev: metadata.rev,
      lastSyncedHash: hash,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isDropboxConflictError(error)) {
      await pullConfigSync();
      return;
    }

    await saveError(error);
  }
}

export function scheduleConfigSyncUpload(key) {
  if (importTransactionActive || applyingRemoteData || (key && !isConfigSyncAllowedKey(key))) return;

  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    void uploadCurrentConfig();
  }, UPLOAD_DEBOUNCE_MS);
}

export function beginSettingsImportTransaction() {
  importTransactionActive = true;
  clearTimeout(uploadTimer);
  void saveStatus('importing');
}

export function finishSettingsImportTransaction({ initial = false, failed = false } = {}) {
  importTransactionActive = false;
  clearTimeout(uploadTimer);

  void (async () => {
    const state = await getSyncPrivateState();
    if (!state.dropbox?.refreshToken || failed) {
      await saveStatus(failed ? 'error' : state.status || 'disconnected');
      return;
    }

    if (initial) {
      await saveStatus('paused', {
        needsManualSyncReview: true,
        pausedReason: 'initial-import-review',
      });
      return;
    }

    const accessToken = await getDropboxAccessToken();
    const metadata = await getDropboxMetadata(accessToken);
    if (metadata) {
      await saveStatus('paused', {
        pausedReason: 'import-remote-decision',
      });
      EventBus.emit(CONFIG_SYNC_IMPORT_DECISION_EVENT);
      return;
    }

    await uploadCurrentConfig({ force: true });
  })();
}

export async function useLocalConfigForConflict() {
  await uploadCurrentConfig({ force: true });
}

export async function useRemoteConfigForConflict() {
  const state = await getSyncPrivateState();
  if (state.conflict?.remoteData) {
    const remoteData = state.conflict.remoteData;
    applySyncDataToLocalStorage(remoteData);
    await saveStatus('synced', {
      conflict: undefined,
      pausedReason: undefined,
      lastRemoteRev: state.conflict.remoteRev,
      lastSyncedHash: await hashSyncData(remoteData),
      lastSyncedAt: new Date().toISOString(),
    });
    return;
  }

  await pullConfigSync();
}

export async function continueWithLocalAfterImport() {
  await uploadCurrentConfig({ force: true });
}

export async function continueWithRemoteAfterImport() {
  await updateSyncPrivateState((state) => ({
    ...state,
    pausedReason: undefined,
  }));
  await pullConfigSync();
}

export function initConfigSyncService() {
  if (initialized) return;
  initialized = true;

  document.addEventListener(STORAGE_CHANGE_EVENT, (event) => {
    scheduleConfigSyncUpload(event.detail?.key);
  });

  setTimeout(() => {
    void pullConfigSync();
  }, 1000);
}

export function createDebugSyncSnapshot() {
  return canonicalizeSyncData(createConfigSyncData());
}
