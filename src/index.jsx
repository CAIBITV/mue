import { createRoot } from 'react-dom/client';

import * as Sentry from '@sentry/react';

import App from './App';
import ErrorBoundary from './ErrorBoundary';
import { initLanguage } from './bootstrap/initLanguage';
import { initStorageBridge } from './bootstrap/initStorageBridge';
import variables from './config/variables';

import './scss/index.scss';
// the toast css is based on default so we need to import it
import 'react-toastify/dist/ReactToastify.css';

await initStorageBridge();
initLanguage();

Sentry.init({
  dsn: variables.constants.SENTRY_DSN,
  defaultIntegrations: false,
  autoSessionTracking: false,
});

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
