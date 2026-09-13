// Cases — the passage of thresholds (Spike C, pass 3). Dev-only spike page.
import '@/styles/index.css';
import './portal.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PortalSpike } from './PortalSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <PortalSpike />
  </StrictMode>,
);
