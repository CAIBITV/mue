import { createRoot } from 'react-dom/client';
import '@fontsource/lexend-deca';
import { initLanguage } from '../bootstrap/initLanguage';
import { initStorageBridge } from '../bootstrap/initStorageBridge';
import QuicklinkCapturePopup from './QuicklinkCapturePopup';

import './quicklink-popup.scss';

await initStorageBridge();
initLanguage();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<QuicklinkCapturePopup />);
