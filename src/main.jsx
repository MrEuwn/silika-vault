import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { App } from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
