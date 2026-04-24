import { createRoot } from 'react-dom/client';
import '@fontsource/lexend-deca';
import { initLanguage } from '../bootstrap/initLanguage';
import QuicklinkCapturePopup from './QuicklinkCapturePopup';

import './quicklink-popup.scss';

initLanguage();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<QuicklinkCapturePopup />);
