// Services 360 chamber — visual proof, pseudo-motion via ?t=. Dev-only.
import '@/styles/index.css';
import '@/components/layout/Header/Header.css';
import '@/sections/Services/Services.css';
import './chamber.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChamberSpike } from './ChamberSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <ChamberSpike />
  </StrictMode>,
);
