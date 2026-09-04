
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { FeedbackProvider } from './components/Feedback';
import { I18nProvider } from './hooks/useI18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <React.StrictMode>
      <I18nProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </I18nProvider>
    </React.StrictMode>
  </ErrorBoundary>
);
