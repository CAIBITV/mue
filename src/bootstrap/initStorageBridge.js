import { isSyncPrivateKey } from 'utils/sync/configSyncKeys';

const MIGRATION_KEY = '__mue_storage_migrated_v1__';
const STORAGE_CHANGE_EVENT = 'mue.storage.changed';

const dispatchStorageChange = (detail) => {
  document.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail }));
};

const getExtensionStorage = () => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  const storageArea = extensionApi?.storage?.local;
  if (!storageArea) return null;

  const promisify = (method, ...args) => {
    try {
      const result = method(...args);
      if (result?.then) {
        return result;
      }
    } catch (_error) {
      return Promise.reject(_error);
    }

    return new Promise((resolve, reject) => {
      method(...args, (value) => {
        const runtimeError = extensionApi.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(value);
      });
    });
  };

  return {
    extensionApi,
    getAll: () => promisify(storageArea.get.bind(storageArea), null),
    setMany: (items) => promisify(storageArea.set.bind(storageArea), items),
    remove: (key) => promisify(storageArea.remove.bind(storageArea), key),
    clearPublic: async () => {
      const entries = await promisify(storageArea.get.bind(storageArea), null);
      const publicKeys = Object.keys(entries).filter((key) => !isSyncPrivateKey(key));
      if (publicKeys.length === 0) return;
      await promisify(storageArea.remove.bind(storageArea), publicKeys);
    },
    onChanged: extensionApi.storage?.onChanged,
  };
};

const snapshotLocalStorage = () => {
  const snapshot = {};
  Object.keys(localStorage).forEach((key) => {
    if (isSyncPrivateKey(key)) return;
    snapshot[key] = localStorage.getItem(key);
  });
  return snapshot;
};

const hydrateLocalStorage = (entries, storage) => {
  storage.originalClear();
  Object.entries(entries).forEach(([key, value]) => {
    if (key === MIGRATION_KEY || isSyncPrivateKey(key) || value === undefined) return;
    storage.originalSetItem(key, value);
  });
};

const installLocalStorageMirror = (storageBridge) => {
  if (globalThis.__MUE_STORAGE_BRIDGE_INSTALLED__) {
    return;
  }

  const storage = {
    originalSetItem: localStorage.setItem.bind(localStorage),
    originalRemoveItem: localStorage.removeItem.bind(localStorage),
    originalClear: localStorage.clear.bind(localStorage),
  };

  let isSyncingFromExtension = false;

  localStorage.setItem = (key, value) => {
    if (isSyncPrivateKey(key)) return;

    storage.originalSetItem(key, value);
    dispatchStorageChange({ key, newValue: value });
    if (!isSyncingFromExtension) {
      void storageBridge.setMany({ [key]: value });
    }
  };

  localStorage.removeItem = (key) => {
    if (isSyncPrivateKey(key)) return;

    storage.originalRemoveItem(key);
    dispatchStorageChange({ key });
    if (!isSyncingFromExtension) {
      void storageBridge.remove(key);
    }
  };

  localStorage.clear = () => {
    storage.originalClear();
    dispatchStorageChange({ key: null, clear: true });
    if (!isSyncingFromExtension) {
      void storageBridge.clearPublic();
    }
  };

  storageBridge.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    isSyncingFromExtension = true;
    try {
      Object.entries(changes).forEach(([key, change]) => {
        if (key === MIGRATION_KEY || isSyncPrivateKey(key)) return;

        if (change.newValue === undefined) {
          storage.originalRemoveItem(key);
          dispatchStorageChange({ key });
          return;
        }

        storage.originalSetItem(key, change.newValue);
        dispatchStorageChange({ key, newValue: change.newValue });
      });
    } finally {
      isSyncingFromExtension = false;
    }
  });

  globalThis.__MUE_STORAGE_BRIDGE_INSTALLED__ = true;
};

export async function initStorageBridge() {
  const storageBridge = getExtensionStorage();
  if (!storageBridge) return;

  const originalStorage = {
    setItem: localStorage.setItem.bind(localStorage),
    clear: localStorage.clear.bind(localStorage),
  };

  const existingExtensionData = await storageBridge.getAll();
  const localSnapshot = snapshotLocalStorage();

  let nextExtensionData = existingExtensionData;

  if (!existingExtensionData[MIGRATION_KEY]) {
    const payload = {
      ...(Object.keys(existingExtensionData).length === 0 ? localSnapshot : existingExtensionData),
      [MIGRATION_KEY]: 'true',
    };

    await storageBridge.setMany(payload);
    nextExtensionData = await storageBridge.getAll();
  }

  hydrateLocalStorage(nextExtensionData, {
    originalSetItem: originalStorage.setItem,
    originalClear: originalStorage.clear,
  });
  installLocalStorageMirror(storageBridge);
}
