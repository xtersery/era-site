import { forwardRef, type CSSProperties } from 'react';

import grainUrl from './assets/grain.png';
import wallUrl from './assets/manifest/mf-wall.webp';
import wallPhoneUrl from './assets/manifest/mf-wall@phone.webp';

const style = {
  '--mf-grain': `url(${grainUrl})`,
  '--mf-wall': `url(${wallUrl})`,
  '--mf-wall-phone': `url(${wallPhoneUrl})`,
} as CSSProperties;

/**
 * The manifesto's ground: the client's emerald ceramic wall with gold seams
 * (a landscape plate for the desktop, a portrait mosaic for the phone) under
 * a veil that keeps it quiet where the words stand and lets it show at the
 * right and the edges (`hero-stone.css`, `.mf-ground*`). The gold objects
 * are composed with the words (`Manifesto.tsx`), not here.
 */
export const ManifestoGround = forwardRef<HTMLDivElement>(function ManifestoGround(_props, ref) {
  return (
    <div ref={ref} className="mf-ground" style={style} aria-hidden="true">
      <div className="mf-ground__wall" />
      <div className="mf-ground__veil" />
      <div className="mf-ground__grain" />
    </div>
  );
});
