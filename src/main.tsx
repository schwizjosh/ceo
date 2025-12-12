import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Quill styles are loaded via the lazy-loaded ReactQuill component

console.log('🚀 Main.tsx initializing...');

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="color: white; padding: 20px;">Error: Root element not found</div>';
} else {
  console.log('✅ Root element found, creating React app...');

  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
    rootElement.innerHTML = `<div style="color: white; padding: 20px;">Error rendering app: ${error}</div>`;
  }
}
