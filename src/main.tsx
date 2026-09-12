import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Styles first: component stylesheets are injected on import, and the global
// cascade (tokens → reset → base → type roles) must precede them.
import './styles/index.css';

import App from './App';
import { registerGsap } from './animations/gsap';

// Single GSAP registration for the whole app, before React mounts.
registerGsap();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
