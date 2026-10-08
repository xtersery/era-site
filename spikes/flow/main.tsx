// The storytelling flow — Услуги → Кейсы, with Стоимость out of the scroll and
// on the top navigation instead. Composes the two approved spike sections
// unchanged; the only new code is the handover between them. Dev-only page.
import '@/styles/index.css';
import '../radial/radial.css';
import '../gallery/gallery.css';
import '../portraits/portraits.css';
import '../founder/founder.css';
import '../reviews/reviews.css';
import '../contact/contact.css';
import '../inquiry/inquiry.css';
import './pricing.css';
import './flow.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { FlowSpike } from './FlowSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <FlowSpike />
  </StrictMode>,
);
