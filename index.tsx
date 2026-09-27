
import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { FeedbackProvider } from './components/Feedback';
import UpdatePrompt from './components/UpdatePrompt';
import { I18nProvider } from './hooks/useI18n';
import { InstanceConfigProvider } from './hooks/useInstanceConfig';
// v2 reposition spec §8: SW registration + waiting-worker lifecycle live in
// the useServiceWorkerUpdate hook (prompt mode — UpdatePrompt applies on
// user action).
import './hooks/useServiceWorkerUpdate';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <React.StrictMode>
      <InstanceConfigProvider>
        <I18nProvider>
          <FeedbackProvider>
            <App />
            <UpdatePrompt />
          </FeedbackProvider>
        </I18nProvider>
      </InstanceConfigProvider>
    </React.StrictMode>
  </ErrorBoundary>
);
