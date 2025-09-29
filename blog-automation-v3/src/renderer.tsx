import React from 'react';
import { createRoot } from 'react-dom/client';
import './assets/styles/index.css';  // Tailwind CSS import
import App from './app';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}