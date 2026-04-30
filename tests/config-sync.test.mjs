import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.__APP_VERSION__ = 'test';

const schema = await import('../src/utils/sync/configSyncSchema.js');
const keys = await import('../src/utils/sync/configSyncKeys.js');
const service = await import('../src/utils/sync/configSyncService.js');

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

test('startup sync refreshes global settings and changed widget areas', () => {
  const events = service.getConfigSyncRefreshEventsForKeys([
    'theme',
    'quicklinks',
    'quicklinkGroups',
    'backgroundFilter',
    'timezone',
  ]);

  assert.equal(events.includes('other'), true);
  assert.equal(events.includes('quicklinks'), true);
  assert.equal(events.includes('quicklinkGroups'), true);
  assert.equal(events.includes('backgroundeffect'), true);
  assert.equal(events.includes('timezone'), true);
});

test('startup pull is skipped while sync needs a manual decision', () => {
  assert.equal(service.shouldSkipConfigSyncPull({ pausedReason: 'import-remote-decision' }), true);
  assert.equal(service.shouldSkipConfigSyncPull({ status: 'conflict' }), true);
  assert.equal(
    service.shouldSkipConfigSyncPull(
      { pausedReason: 'import-remote-decision', status: 'paused' },
      { force: true },
    ),
    false,
  );
  assert.equal(service.shouldSkipConfigSyncPull({ status: 'synced' }), false);
});
