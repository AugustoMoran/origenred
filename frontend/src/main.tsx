import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { AuthBootstrap } from './components/AuthBootstrap';
import { MarketingScripts } from './components/MarketingScripts';
import './styles/index.css';
import { registerSW } from 'virtual:pwa-register';
import { capturePwaInstallPromptEarly } from './utils/pwaInstallCapture';

capturePwaInstallPromptEarly();

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <MarketingScripts />
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </Provider>
  </React.StrictMode>
);
