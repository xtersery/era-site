// The price page's only script: its GA4 business events, through the Google tag
// in `ceny/index.html`. A module script — deferred, after the page has parsed,
// never in the way of its paint — run once per load.
import { trackEvent, watchContactLinks } from '@/lib/analytics';

trackEvent('pricing_page_open');
watchContactLinks();
