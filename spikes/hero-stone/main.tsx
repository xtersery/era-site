// Hero — the illuminated stone wall and the portrait. Dev-only spike page.
import '@/styles/index.css';
import '../radial/radial.css';
import './hero-stone.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { HeroStoneSpike } from './HeroStoneSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <HeroStoneSpike />
  </StrictMode>,
);
