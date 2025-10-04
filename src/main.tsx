import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { initPWADiagnostic } from './utils/pwaCleanup';
import { registerPWA } from './utils/pwaRegister';

initPWADiagnostic();
registerPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PWAUpdatePrompt />
  </StrictMode>
);