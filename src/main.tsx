import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App.tsx';
import './index.css';

// Configure StatusBar for iOS platform on app load
if (Capacitor.getPlatform() === 'ios') {
  StatusBar.setOverlaysWebView({ overlay: false })
    .catch(err => console.warn('StatusBar.setOverlaysWebView failed:', err));
  StatusBar.setStyle({ style: Style.Dark })
    .catch(err => console.warn('StatusBar.setStyle failed:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
