const MIGRATION_KEY = '__mue_storage_migrated_v1__';

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
    clear: () => promisify(storageArea.clear.bind(storageArea)),
    onChanged: extensionApi.storage?.onChanged,
  };
};

const snapshotLocalStorage = () => {
  const snapshot = {};
  Object.keys(localStorage).forEach((key) => {
    snapshot[key] = localStorage.getItem(key);
  });
  return snapshot;
};

const hydrateLocalStorage = (entries, storage) => {
  storage.originalClear();
  Object.entries(entries).forEach(([key, value]) => {
    if (key === MIGRATION_KEY || value === undefined) return;
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
    storage.originalSetItem(key, value);
    if (!isSyncingFromExtension) {
      void storageBridge.setMany({ [key]: value });
    }
  };

  localStorage.removeItem = (key) => {
    storage.originalRemoveItem(key);
    if (!isSyncingFromExtension) {
      void storageBridge.remove(key);
    }
  };

  localStorage.clear = () => {
    storage.originalClear();
    if (!isSyncingFromExtension) {
      void storageBridge.clear();
    }
  };

  storageBridge.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    isSyncingFromExtension = true;
    try {
      Object.entries(changes).forEach(([key, change]) => {
        if (key === MIGRATION_KEY) return;

        if (change.newValue === undefined) {
          storage.originalRemoveItem(key);
          return;
        }

        storage.originalSetItem(key, change.newValue);
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
