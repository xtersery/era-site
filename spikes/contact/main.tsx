// Адрес и контакты — the place, alone. Dev-only spike page.
import '@/styles/index.css';
import './contact.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Place } from './Place';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <Place />
  </StrictMode>,
);
