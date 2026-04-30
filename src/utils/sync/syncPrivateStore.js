import { SYNC_PRIVATE_KEY, SYNC_PRIVATE_PREFIX } from './configSyncKeys';

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
    get: (key) => promisify(storageArea.get.bind(storageArea), key),
    set: (items) => promisify(storageArea.set.bind(storageArea), items),
    remove: (keys) => promisify(storageArea.remove.bind(storageArea), keys),
  };
};

const privateKey = (key) => `${SYNC_PRIVATE_PREFIX}${key}`;

export async function getSyncPrivateState() {
  const storage = getExtensionStorage();
  if (!storage) {
    return JSON.parse(localStorage.getItem(SYNC_PRIVATE_KEY) || '{}');
  }

  const result = await storage.get(SYNC_PRIVATE_KEY);
  return result?.[SYNC_PRIVATE_KEY] || {};
}

export async function setSyncPrivateState(nextState) {
  const storage = getExtensionStorage();
  if (!storage) {
    localStorage.setItem(SYNC_PRIVATE_KEY, JSON.stringify(nextState));
    return;
  }

  await storage.set({ [SYNC_PRIVATE_KEY]: nextState });
}

export async function updateSyncPrivateState(updater) {
  const currentState = await getSyncPrivateState();
  const nextState = updater(currentState);
  await setSyncPrivateState(nextState);
  return nextState;
}

export async function clearSyncPrivateState() {
  const storage = getExtensionStorage();
  if (!storage) {
    localStorage.removeItem(SYNC_PRIVATE_KEY);
    return;
  }

  await storage.remove(SYNC_PRIVATE_KEY);
}

export { privateKey };

