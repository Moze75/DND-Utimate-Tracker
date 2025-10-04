import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { initPWADiagnostic } from './utils/pwaCleanup';

initPWADiagnostic();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PWAUpdatePrompt />
  </StrictMode>
);