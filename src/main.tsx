import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { registerGsap } from './animations/gsap';
import './styles/index.css';

// Single GSAP registration for the whole app, before React mounts.
registerGsap();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
