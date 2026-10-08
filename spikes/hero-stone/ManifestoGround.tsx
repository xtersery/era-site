import { forwardRef, type CSSProperties } from 'react';

import grainUrl from './assets/grain.png';
import slabsPhoneUrl from './assets/slabs@phone.webp';
import slabsUrl from './assets/slabs.webp';

const style = { '--mf-grain': `url(${grainUrl})` } as CSSProperties;

/**
 * The manifesto's ground, after docs/references/manifest-ref.png — rebuilt,
 * not placed: a narrow group of illuminated onyx slabs at the left (the
 * reference's own slabs, as a strip, `scripts/manifest-assets.py`), their
 * light and a translucent veil bleeding into a calm warm field that is
 * gradients and a grain tile (`hero-stone.css`, `.mf-ground*`). Nothing else
 * lives in the field: it is room for the words.
 */
export const ManifestoGround = forwardRef<HTMLDivElement>(function ManifestoGround(_props, ref) {
  return (
    <div ref={ref} className="mf-ground" style={style} aria-hidden="true">
      <div className="mf-ground__field" />
      <div className="mf-ground__slabs">
        <picture>
          <source media="(max-width: 1023px)" srcSet={slabsPhoneUrl} />
          <img src={slabsUrl} alt="" decoding="async" loading="lazy" />
        </picture>
        {/* the light inside the stone — it comes on as the visitor arrives */}
        <div className="mf-ground__glow" />
        <div className="mf-ground__veil" />
      </div>
      <div className="mf-ground__grain" />
    </div>
  );
});
