import { getSyncPrivateState, setSyncPrivateState, updateSyncPrivateState } from './syncPrivateStore';

const DROPBOX_AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_SCOPES = ['files.metadata.read', 'files.content.read', 'files.content.write'];

const getExtensionApi = () => globalThis.browser || globalThis.chrome;

const promisify = (method, ...args) => {
  try {
    const result = method(...args);
    if (result?.then) {
      return result;
    }
  } catch (_error) {
    return Promise.reject(_error);
  }

  const extensionApi = getExtensionApi();
  return new Promise((resolve, reject) => {
    method(...args, (value) => {
      const runtimeError = extensionApi?.runtime?.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(value);
    });
  });
};

const base64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const createRandomString = (length = 64) => {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return base64Url(values);
};

const createCodeChallenge = async (verifier) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
};

export function getDropboxAppKey() {
  return __DROPBOX_APP_KEY__ || localStorage.getItem('dropboxAppKey') || '';
}

export function hasBundledDropboxAppKey() {
  return Boolean(__DROPBOX_APP_KEY__);
}

export function isDropboxConfigured() {
  return Boolean(getDropboxAppKey());
}

export function getDropboxRedirectUri() {
  const extensionApi = getExtensionApi();
  if (!extensionApi?.identity?.getRedirectURL) {
    throw new Error('Browser identity API is not available.');
  }

  return extensionApi.identity.getRedirectURL('dropbox');
}

const exchangeToken = async (body) => {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    throw new Error(`Dropbox token request failed: ${response.status}`);
  }

  return response.json();
};

export async function connectDropbox() {
  if (!isDropboxConfigured()) {
    throw new Error('Dropbox app key is not configured.');
  }

  const extensionApi = getExtensionApi();
  if (!extensionApi?.identity?.launchWebAuthFlow) {
    throw new Error('Browser identity API is not available.');
  }

  const redirectUri = getDropboxRedirectUri();
  const appKey = getDropboxAppKey();
  const codeVerifier = createRandomString();
  const state = createRandomString(24);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authorizeUrl = new URL(DROPBOX_AUTHORIZE_URL);

  authorizeUrl.searchParams.set('client_id', appKey);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('token_access_type', 'offline');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', DROPBOX_SCOPES.join(' '));

  await updateSyncPrivateState((currentState) => ({
    ...currentState,
    oauth: {
      state,
      codeVerifier,
      startedAt: new Date().toISOString(),
    },
  }));

  const redirectResult = await promisify(extensionApi.identity.launchWebAuthFlow.bind(extensionApi.identity), {
    url: authorizeUrl.toString(),
    interactive: true,
  });

  const redirectUrl = new URL(redirectResult);
  if (redirectUrl.searchParams.get('state') !== state) {
    throw new Error('Dropbox OAuth state mismatch.');
  }

  const code = redirectUrl.searchParams.get('code');
  if (!code) {
    throw new Error('Dropbox OAuth code was not returned.');
  }

  const tokenData = await exchangeToken({
    code,
    grant_type: 'authorization_code',
    client_id: appKey,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const nextState = await updateSyncPrivateState((currentState) => ({
    ...currentState,
    oauth: undefined,
    dropbox: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      accountId: tokenData.account_id,
      connectedAt: new Date().toISOString(),
    },
    status: 'connected',
    pausedReason: undefined,
  }));

  return nextState.dropbox;
}

export async function refreshDropboxAccessToken() {
  const currentState = await getSyncPrivateState();
  const refreshToken = currentState.dropbox?.refreshToken;
  if (!refreshToken) {
    throw new Error('Dropbox refresh token is missing.');
  }

  const tokenData = await exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: getDropboxAppKey(),
  });

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  const nextState = await updateSyncPrivateState((state) => ({
    ...state,
    dropbox: {
      ...state.dropbox,
      accessToken: tokenData.access_token,
      expiresAt,
    },
  }));

  return nextState.dropbox.accessToken;
}

export async function getDropboxAccessToken() {
  const currentState = await getSyncPrivateState();
  const accessToken = currentState.dropbox?.accessToken;
  const expiresAt = currentState.dropbox?.expiresAt || 0;

  if (!accessToken || expiresAt - Date.now() < 60_000) {
    return refreshDropboxAccessToken();
  }

  return accessToken;
}

export async function disconnectDropbox() {
  const currentState = await getSyncPrivateState();
  await setSyncPrivateState({
    deviceId: currentState.deviceId,
    status: 'disconnected',
  });
}

export async function isDropboxConnected() {
  const currentState = await getSyncPrivateState();
  return Boolean(currentState.dropbox?.refreshToken);
}
