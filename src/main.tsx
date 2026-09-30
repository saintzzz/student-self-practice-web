import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DebugAudioScreen from './components/DebugAudioScreen';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Cannot mount the application.');
}

// Hidden diagnostics page for field-testing audio/mic on real devices:
// open ea.vieschool.com/#debug-tts - intentionally not linked from any UI.
const isDebugAudio = window.location.hash === '#debug-tts';

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {isDebugAudio ? <DebugAudioScreen /> : <App />}
  </React.StrictMode>,
);
