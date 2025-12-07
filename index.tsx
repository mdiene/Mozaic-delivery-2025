import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './design/index.css';

// Robust suppression for benign ResizeObserver errors (common with Recharts)
const resizeObserverLoopErr = /ResizeObserver loop limit exceeded|ResizeObserver loop completed with undelivered notifications/;

// 1. Prevent runtime crash overlay
window.addEventListener('error', (e) => {
  if (resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation();
  }
});

// 2. Prevent console error logging
const originalError = console.error;
console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && resizeObserverLoopErr.test(args[0])) {
    return;
  }
  originalError.call(console, ...args);
};

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