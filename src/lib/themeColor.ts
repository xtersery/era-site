/**
 * The browser's own chrome — iOS Safari's top and bottom bars, Chrome on
 * Android's toolbar — tinted to the room on screen.
 *
 * Two levers, written together and only when the colour actually changes:
 *
 *   - `<meta name="theme-color">` — what Chrome on Android and older Safari
 *     read for their bars;
 *   - the ROOT element's background — what current Safari tints its bars
 *     from, and what every browser paints in the overscroll (rubber-band)
 *     area above and below the page. Without it the bars and the overscroll
 *     showed the document's default light ground on every room.
 *
 * No user-agent test: a browser that reads neither simply ignores both.
 */
let meta: HTMLMetaElement | null = null;
let current = '';

export function setThemeColor(color: string): void {
  if (color === current) return;
  current = color;
  if (!meta) {
    meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.append(meta);
    }
  }
  meta.content = color;
  document.documentElement.style.backgroundColor = color;
}
