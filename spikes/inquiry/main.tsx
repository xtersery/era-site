// Заявка — the conversation, alone. Dev-only spike page.
import '@/styles/index.css';
import './inquiry.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { InquiryProvider } from '@/lib/inquiry';

import { Corridor, Talk } from './Talk';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <InquiryProvider>
      <div className="talk-page">
        <Talk />
        <Corridor />
      </div>
    </InquiryProvider>
  </StrictMode>,
);
