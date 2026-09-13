// Cases — spatial archive (Spike C). Storyboard + working spike page.
// Dev-only: stills via ?c=&p=, alignment grid via ?grid=1, readout via ?hud=1.
import '@/styles/index.css';
import './cases.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CasesSpike } from './CasesSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <CasesSpike />
  </StrictMode>,
);
