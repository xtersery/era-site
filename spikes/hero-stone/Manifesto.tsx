import { forwardRef } from 'react';

import { SECTION_LABELS, sectionIndex } from '@/lib/constants/sections';
import { ru } from '@/lib/utils/ru';

import filigreeUrl from './assets/manifest/gold-filigree.webp';
import ginkgoUrl from './assets/manifest/gold-ginkgo-v2.webp';

/**
 * 01 — Манифест: FOREST AND GOLD (14.10, the client's target boards
 * `docs/references/manifest-target-{desktop,mobile}.png`). The statement on
 * the dark ceramic wall (`ManifestoGround`), set in one editorial serif — a
 * tracked micro eyebrow, «сохранять» in capitals on a sage plate, a lower-case
 * «естественную», the largest «красоту» (the 14.10 target,
 * `docs/references/manifest-target-desktop-v2.png`) — with two gold objects
 * on the wall: a fine filigree net entering from the left edge and the foot,
 * the ginkgo hung on the right edge. Both stand BEHIND the words.
 *
 * The gold is the client's own (`scripts/manifest-gold.py`), never repainted;
 * the filigree is the supplied file losslessly, pixel for pixel.
 */
export const Manifesto = forwardRef<HTMLDivElement, { readonly asLayer?: boolean }>(
  function Manifesto({ asLayer = false }, ref) {
    return (
      <div ref={ref} className={asLayer ? 'mf mf--layer' : 'mf'} id="manifesto">
        <img className="mf__obj mf__obj--net" src={filigreeUrl} alt="" aria-hidden="true" decoding="async" draggable={false} />
        <img className="mf__obj mf__obj--ginkgo" src={ginkgoUrl} alt="" aria-hidden="true" decoding="async" draggable={false} />
        {/* the seam into Услуги: a veil at the foot, over the gold, under the words */}
        <div className="mf__foot" aria-hidden="true" />

        <p className="mf__label">
          <span className="mf__dash" aria-hidden="true" />
          <span>
            {sectionIndex('manifesto')}
            {' — '}
            {SECTION_LABELS.manifesto}
          </span>
        </p>
        <h2 id="manifesto-heading" className="mf__heading" data-placeholder="copy">
          <span className="mf__line mf__line--eyebrow">{ru('Наша миссия:')} </span>
          <span className="mf__line mf__line--plate">
            <span className="mf__plate">Сохранять</span>{' '}
          </span>
          <span className="mf__line mf__line--soft">естественную </span>
          <span className="mf__line mf__line--grand">красоту</span>
        </h2>
        <p className="mf__text" data-placeholder="copy">
          {ru('Деликатно подчеркивать')}
          <br />
          {ru('природную гармонию')}
          <br />
          {ru('лица и кожи.')}
        </p>
        <p className="mf__aside" data-placeholder="copy">
          <span>{ru('Забота')}</span> <span className="mf__dot" aria-hidden="true" /> <span>{ru('в равновесии')}</span>{' '}
          <span className="mf__dot" aria-hidden="true" /> <span>{ru('с точностью')}</span>
        </p>
      </div>
    );
  },
);
