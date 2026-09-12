// Spike A — Hero refraction. Dev-only entry (not part of the production build).
import '@/styles/index.css';
import '@/components/layout/Header/Header.css';
import './spike.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerGsap } from '@/animations/gsap';

import { HeroSpike } from './HeroSpike';

registerGsap();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <HeroSpike />
  </StrictMode>,
);
