const DROPBOX_SYNC_PATH = '/mue-sync.json';

const parseDropboxError = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error_summary: text || `HTTP ${response.status}` };
  }
};

export function isDropboxConflictError(error) {
  return error?.error?.['.tag'] === 'path' || error?.error_summary?.includes('conflict');
}

export async function getDropboxMetadata(accessToken, path = DROPBOX_SYNC_PATH) {
  const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (response.status === 409) {
    return null;
  }

  if (!response.ok) {
    throw await parseDropboxError(response);
  }

  return response.json();
}

export async function downloadDropboxSyncFile(accessToken, path = DROPBOX_SYNC_PATH) {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  });

  if (response.status === 409) {
    return null;
  }

  if (!response.ok) {
    throw await parseDropboxError(response);
  }

  return {
    metadata: JSON.parse(response.headers.get('dropbox-api-result') || '{}'),
    content: await response.text(),
  };
}

export async function uploadDropboxSyncFile(accessToken, payload, lastRemoteRev, path = DROPBOX_SYNC_PATH) {
  const args = {
    path,
    mode: lastRemoteRev ? { '.tag': 'update', update: lastRemoteRev } : { '.tag': 'add' },
    autorename: false,
    mute: true,
    strict_conflict: true,
  };

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify(args),
    },
    body: JSON.stringify(payload, null, 2),
  });

  if (!response.ok) {
    throw await parseDropboxError(response);
  }

  return response.json();
}

export { DROPBOX_SYNC_PATH };

