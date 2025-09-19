import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Suppress COOP-related console errors that don't actually break functionality
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  // Filter out COOP-related errors that are harmless
  if (message.includes('Cross-Origin-Opener-Policy policy would block the window.closed call')) {
    return; // Suppress this specific error
  }
  
  // Allow all other errors through
  originalConsoleError(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);



