import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.__APP_VERSION__ = 'test';

const schema = await import('../src/utils/sync/configSyncSchema.js');
const keys = await import('../src/utils/sync/configSyncKeys.js');

test('sync private keys are detected consistently', () => {
  assert.equal(keys.isSyncPrivateKey('__mue_sync_private__'), true);
  assert.equal(keys.isSyncPrivateKey('__mue_sync_private__:token'), true);
  assert.equal(keys.isSyncPrivateKey('theme'), false);
});

test('export and import filters reject sync internal keys', () => {
  assert.equal(keys.shouldExportSettingKey('__mue_sync_private__'), false);
  assert.equal(keys.shouldImportSettingKey('__mue_sync_private__:token'), false);
  assert.equal(keys.shouldExportSettingKey('theme'), true);
});

test('sync data only includes allowlisted keys', () => {
  const filtered = schema.filterConfigSyncData({
    theme: 'dark',
    currentBackground: '{}',
    __mue_sync_private__: '{}',
    undefined: 'undefined',
  });

  assert.deepEqual(filtered, { theme: 'dark' });
});

test('canonical sync data is stable regardless of input order', () => {
  const left = schema.canonicalizeSyncData({
    theme: 'dark',
    language: 'zh_CN',
  });
  const right = schema.canonicalizeSyncData({
    language: 'zh_CN',
    theme: 'dark',
  });

  assert.equal(left, right);
});

test('sync payload includes schema metadata and filtered data', () => {
  const payload = schema.createConfigSyncPayload(
    {
      theme: 'dark',
      currentQuote: '{}',
    },
    'device-test',
    '1.0.0',
  );

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.appVersion, '1.0.0');
  assert.equal(payload.deviceId, 'device-test');
  assert.deepEqual(payload.data, { theme: 'dark' });
});

