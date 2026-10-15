import { debugTools, isBrowser } from './env';

/**
 * GA4 business events through the Google tag already in `index.html` and
 * `ceny/index.html` — this never loads or configures a tag of its own. When
 * the tag is blocked (an ad blocker, a privacy mode) `window.gtag` is missing
 * and every call is a quiet no-op; nothing here throws.
 *
 * NO PERSONAL DATA, EVER: the parameters are fixed enums chosen by the code —
 * never a name, a phone, a handle, a message or anything typed in the form,
 * and never the `href` of a link.
 */

export type LinkLocation = 'footer' | 'pricing' | 'inquiry' | 'contact' | 'other';
export type PricingSource = 'header' | 'hero' | 'menu' | 'other';

interface Events {
  pricing_open: { source: PricingSource };
  pricing_page_open: undefined;
  phone_click: { location: LinkLocation };
  telegram_click: { location: LinkLocation };
  inquiry_start: undefined;
  generate_lead: { method: 'website_form' };
}

type Gtag = (command: 'event', name: string, params?: Record<string, string>) => void;

export function trackEvent<K extends keyof Events>(
  name: K,
  ...[params]: Events[K] extends undefined ? [] : [Events[K]]
): void {
  if (!isBrowser) return;
  try {
    // dev server and review builds only (`debugTools`) — off in production
    if (debugTools) console.info('[analytics]', name, params ?? {});
    const gtag = (window as Window & { gtag?: Gtag }).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
  } catch {
    /* analytics must never break the page */
  }
}

/** where on the page a contact link sits — by the room it is in, never by its address */
function linkLocation(link: Element): LinkLocation {
  if (link.closest('.talk__foot, .ceny-foot')) return 'footer';
  if (link.closest('.pricelayer, .ceny-page')) return 'pricing';
  if (link.closest('#inquiry')) return 'inquiry';
  if (link.closest('#contact')) return 'contact';
  return 'other';
}

const isTelegram = (a: HTMLAnchorElement) => /^(t\.me|telegram\.me)$/i.test(a.hostname);

let watching = false;

/**
 * `phone_click` and `telegram_click` for every `tel:` and Telegram link, present
 * and future — one delegated listener on the document (capture, passive: it
 * only observes the click, never changes it). Installed once per page load;
 * a second call does nothing.
 */
export function watchContactLinks(): void {
  if (!isBrowser || watching) return;
  watching = true;
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!a) return;
      if (a.protocol === 'tel:') trackEvent('phone_click', { location: linkLocation(a) });
      else if (isTelegram(a)) trackEvent('telegram_click', { location: linkLocation(a) });
    },
    { capture: true, passive: true },
  );
}
