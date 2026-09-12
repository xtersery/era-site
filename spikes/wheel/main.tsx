// Spike B — Services optical wheel. Dev-only entry (not part of the production build).
import '@/styles/index.css';
import '@/components/layout/Header/Header.css';
import '@/sections/Services/Services.css';
import './spike.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerGsap } from '@/animations/gsap';

import { WheelSpike } from './WheelSpike';

registerGsap();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <WheelSpike />
  </StrictMode>,
);
