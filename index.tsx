import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './design/index.css';

// Suppress benign ResizeObserver loop errors to prevent runtime crashes/overlays
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
    e.message === 'ResizeObserver loop limit exceeded'
  ) {
    e.stopImmediatePropagation();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);