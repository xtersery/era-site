// The whole experience — every approved spike, in order, on one page.
// THE PRODUCTION ENTRY: the root `index.html` mounts this module (and so does
// the dev page `/spikes/full/`). One composition, two URLs.
import '@/styles/index.css';
import '../radial/radial.css';
import '../hero-stone/hero-stone.css';
import '../gallery/gallery.css';
import '../portraits/portraits.css';
import '../founder/founder.css';
import '../reviews/reviews.css';
import '../contact/contact.css';
import '../inquiry/inquiry.css';
import '../flow/pricing.css';
import '../flow/flow.css';
import './full.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { FullSpike } from './FullSpike';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(
  <StrictMode>
    <FullSpike />
  </StrictMode>,
);
