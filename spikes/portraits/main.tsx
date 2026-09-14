// Specialists — the pinned portrait gallery («Сеанс»). Dev-only spike page.
import '@/styles/index.css';
import './portraits.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PortraitsSpike } from './PortraitsSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <PortraitsSpike />
  </StrictMode>,
);
