import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';
import ADMZip from 'adm-zip';
import * as pkg from './package.json';
import progress from 'vite-plugin-progress';

const isProd = process.env.NODE_ENV === 'production';
const SUPPORTED_MANIFEST_LOCALES = ['en', 'en_US', 'zh_CN'];
const appVersion = pkg.version;

const writeVersionedManifest = (source, destination) => {
  const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
  manifest.version = appVersion;
  fs.writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
};

const prepareBuilds = () => ({
  name: 'prepareBuilds',
  closeBundle() {
    if (isProd) {
      // make directories if not exist
      fs.mkdirSync(path.resolve(__dirname, './build'), { recursive: true });
      fs.mkdirSync(path.resolve(__dirname, './dist'), { recursive: true });

      // chrome
      fs.mkdirSync(path.resolve(__dirname, './build/chrome'), { recursive: true });
      fs.rmSync(path.resolve(__dirname, './build/chrome/_locales'), { recursive: true, force: true });
      writeVersionedManifest(
        path.resolve(__dirname, './manifest/chrome.json'),
        path.resolve(__dirname, './build/chrome/manifest.json'),
      );
      fs.copyFileSync(
        path.resolve(__dirname, './manifest/background.js'),
        path.resolve(__dirname, './build/chrome/background.js'),
      );
      fs.mkdirSync(path.resolve(__dirname, './build/chrome/_locales'), { recursive: true });
      SUPPORTED_MANIFEST_LOCALES.forEach((locale) => {
        fs.cpSync(
          path.resolve(__dirname, `./manifest/_locales/${locale}`),
          path.resolve(__dirname, `./build/chrome/_locales/${locale}`),
          { recursive: true },
        );
      });
      fs.cpSync(path.resolve(__dirname, './dist'), path.resolve(__dirname, './build/chrome/'), {
        recursive: true,
      });
      fs.cpSync(
        path.resolve(__dirname, './src/assets/icons'),
        path.resolve(__dirname, './build/chrome/icons'),
        { recursive: true },
      );
      fs.mkdirSync(path.resolve(__dirname, './build/chrome/src/assets'), { recursive: true });
      fs.cpSync(
        path.resolve(__dirname, './src/assets'),
        path.resolve(__dirname, './build/chrome/src/assets'),
        { recursive: true },
      );

      // firefox
      fs.mkdirSync(path.resolve(__dirname, './build/firefox'), { recursive: true });
      writeVersionedManifest(
        path.resolve(__dirname, './manifest/firefox.json'),
        path.resolve(__dirname, './build/firefox/manifest.json'),
      );
      fs.copyFileSync(
        path.resolve(__dirname, './manifest/background.js'),
        path.resolve(__dirname, './build/firefox/background.js'),
      );
      fs.cpSync(path.resolve(__dirname, './dist'), path.resolve(__dirname, './build/firefox/'), {
        recursive: true,
      });
      fs.cpSync(
        path.resolve(__dirname, './src/assets/icons'),
        path.resolve(__dirname, './build/firefox/icons'),
        { recursive: true },
      );
      fs.cpSync(
        path.resolve(__dirname, './src/assets'),
        path.resolve(__dirname, './build/firefox/src/assets'),
        { recursive: true },
      );

      // create zip
      const zip = new ADMZip();
      zip.addLocalFolder(path.resolve(__dirname, './build/chrome'));
      zip.writeZip(path.resolve(__dirname, `./build/chrome-${appVersion}.zip`));

      const zip2 = new ADMZip();
      zip2.addLocalFolder(path.resolve(__dirname, './build/firefox'));
      zip2.writeZip(path.resolve(__dirname, `./build/firefox-${appVersion}.zip`));

      //todo: fix this
      // temp copy src for /dist too
      fs.cpSync(
        path.resolve(__dirname, './src/assets'),
        path.resolve(__dirname, './dist/src/assets'),
        { recursive: true },
      );
    }
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      __APP_VERSION__: JSON.stringify(appVersion),
      __DROPBOX_APP_KEY__: JSON.stringify(env.DROPBOX_APP_KEY || env.VITE_DROPBOX_APP_KEY || ''),
    },
    plugins: [react(), prepareBuilds(), progress()],
    server: { open: true, hmr: { protocol: 'ws', host: 'localhost' } },
    build: {
      target: 'esnext', // Use modern JavaScript features
      minify: isProd ? 'esbuild' : false,
      sourcemap: !isProd,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, './index.html'),
          quicklinkPopup: path.resolve(__dirname, './quicklink-popup.html'),
        },
        output: {
          manualChunks: undefined, // Let Vite handle chunking automatically to avoid circular dependency issues
        },
      },
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        i18n: path.resolve(__dirname, './src/i18n'),
        components: path.resolve(__dirname, './src/components'),
        assets: path.resolve(__dirname, './src/assets'),
        config: path.resolve(__dirname, './src/config'),
        features: path.resolve(__dirname, './src/features'),
        lib: path.resolve(__dirname, './src/lib'),
        scss: path.resolve(__dirname, './src/scss'),
        translations: path.resolve(__dirname, './src/i18n/locales'),
        utils: path.resolve(__dirname, './src/utils'),
      },
    },
    css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  };
});
