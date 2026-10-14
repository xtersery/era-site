import { forwardRef } from 'react';

import { SECTION_LABELS, sectionIndex } from '@/lib/constants/sections';
import { ru } from '@/lib/utils/ru';

import drapeUrl from './assets/manifest/gold-drape.webp';
import ginkgoUrl from './assets/manifest/gold-ginkgo.webp';

/**
 * 01 — Манифест: FOREST AND GOLD (14.10, the client's target boards
 * `docs/references/manifest-target-{desktop,mobile}.png`). The statement on
 * the dark ceramic wall (`ManifestoGround`), set in four voices — a tracked
 * micro eyebrow, «сохранять» as a heavy grotesk on a sage plate, a thin serif
 * «естественную», the largest serif «красоту» — with two gold objects as
 * collectible reliefs on the wall: the drapery entering low from the left
 * edge, the ginkgo hung on the right edge. Both stand BEHIND the words.
 *
 * The gold is cut from the client's references (`scripts/manifest-gold.py`),
 * never repainted.
 */
export const Manifesto = forwardRef<HTMLDivElement, { readonly asLayer?: boolean }>(
  function Manifesto({ asLayer = false }, ref) {
    return (
      <div ref={ref} className={asLayer ? 'mf mf--layer' : 'mf'} id="manifesto">
        <img className="mf__obj mf__obj--drape" src={drapeUrl} alt="" aria-hidden="true" decoding="async" draggable={false} />
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
