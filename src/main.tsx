import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { pwaService } from './services/pwaService.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Initialize PWA service worker with Cache API
pwaService.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
