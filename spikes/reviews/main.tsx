// Reviews — the journal page of patients' voices, alone. Dev-only spike page.
import '@/styles/index.css';
import './reviews.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Reviews } from './Reviews';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <Reviews />
  </StrictMode>,
);
