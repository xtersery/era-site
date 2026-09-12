// Services concept pass — three directions, pseudo-motion via ?t=. Dev-only.
import '@/styles/index.css';
import '@/components/layout/Header/Header.css';
import '@/sections/Services/Services.css';
import '../wheel/spike.css';
import './concept.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ConceptSpike } from './ConceptSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <ConceptSpike />
  </StrictMode>,
);
