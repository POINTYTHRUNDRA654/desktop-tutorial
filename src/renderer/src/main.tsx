import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './utils/ipcDiagnostics'; // Load IPC diagnostics

// Optional local-only developer modules (gitignored, so absent from every
// GitHub checkout). Release builds set VITE_MOSSY_NEXUS_RELEASE=1, which makes
// this branch dead code so the bundler drops it and emits no chunk for it.
if (import.meta.env.VITE_MOSSY_NEXUS_RELEASE !== '1') {
  for (const load of Object.values(import.meta.glob('./localDev/*.ts'))) void load();
}

import './index.css';
import './shell.css';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);