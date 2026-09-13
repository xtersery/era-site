// Cases — the archive on a rail (Spike C, pass 5). Dev-only spike page.
import '@/styles/index.css';
import './gallery.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { GallerySpike } from './GallerySpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <GallerySpike />
  </StrictMode>,
);
