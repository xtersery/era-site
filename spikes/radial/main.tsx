// Services — 2D radial editorial system. Storyboard page: seven complete DOM
// states on one invisible 2D wheel; ?t= rotates the wheel. Dev-only, no motion system.
import '@/styles/index.css';
import './radial.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { RadialSpike } from './RadialSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <RadialSpike />
  </StrictMode>,
);
