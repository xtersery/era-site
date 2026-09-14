// The passage — quartz → marble. Dev-only spike page.
import '@/styles/index.css';
import './mineral.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MineralSpike } from './MineralSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <MineralSpike />
  </StrictMode>,
);
