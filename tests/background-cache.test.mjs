import assert from 'node:assert/strict';
import { test } from 'node:test';

const backgroundCache = await import('../src/features/background/api/backgroundCache.js');

test('API cache is reusable only when API and excludes still match', () => {
  const cachedBackground = {
    type: 'api',
    currentAPI: 'mue',
    photoInfo: {
      pun: 'image-1',
    },
  };

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'api',
      backgroundAPI: 'mue',
      backgroundExclude: [],
    }),
    true,
  );

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'api',
      backgroundAPI: 'unsplash',
      backgroundExclude: [],
    }),
    false,
  );

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'api',
      backgroundAPI: 'mue',
      backgroundExclude: ['image-1'],
    }),
    false,
  );
});

test('custom cache is reusable only when the cached url still exists in current custom backgrounds', () => {
  const cachedBackground = {
    type: 'custom',
    url: 'data:image/webp;base64,abc',
  };

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'custom',
      customBackground: JSON.stringify(['data:image/webp;base64,abc', 'https://img.test/2.webp']),
    }),
    true,
  );

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'custom',
      customBackground: JSON.stringify(['https://img.test/2.webp']),
    }),
    false,
  );
});

test('random background cache keeps the generated style only for the same random type', () => {
  const cachedBackground = {
    type: 'random_gradient',
    style: 'background:linear-gradient(to right, #111, #222);',
  };

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'random_gradient',
    }),
    true,
  );

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground,
      backgroundType: 'random_colour',
    }),
    false,
  );
});

test('unsupported background types never reuse currentBackground cache', () => {
  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground: {
        type: 'photo_pack',
        url: 'https://img.test/photo.webp',
      },
      backgroundType: 'photo_pack',
    }),
    false,
  );

  assert.equal(
    backgroundCache.shouldReuseCurrentBackground({
      cachedBackground: {
        type: 'colour',
        style: 'background:#000;',
      },
      backgroundType: 'colour',
    }),
    false,
  );
});
