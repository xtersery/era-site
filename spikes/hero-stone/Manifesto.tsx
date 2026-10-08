import { forwardRef } from 'react';

import { SECTION_LABELS, sectionIndex } from '@/lib/constants/sections';
import { ru } from '@/lib/utils/ru';

/**
 * 01 — Манифест, after docs/references/manifest-ref.png: the label with its
 * dash, the four-line uppercase serif statement in graphite and taupe, the
 * quiet paragraph, the three tracked words on the dark stone. The copy is the
 * reference's and is flagged; the manifesto text is formally pending.
 */
export const Manifesto = forwardRef<HTMLDivElement, { readonly asLayer?: boolean }>(
  function Manifesto({ asLayer = false }, ref) {
    return (
      <div ref={ref} className={asLayer ? 'mf mf--layer' : 'mf'} id="manifesto">
        <p className="mf__label">
          <span className="mf__dash" aria-hidden="true" />
          <span>
            {sectionIndex('manifesto')}
            {' — '}
            {SECTION_LABELS.manifesto}
          </span>
        </p>
        <h2 id="manifesto-heading" className="mf__heading" data-placeholder="copy">
          <span className="mf__line mf__line--graphite">{ru('Наша миссия:')}</span>
          <span className="mf__line mf__line--taupe">Сохранять</span>
          <span className="mf__line mf__line--taupe">Естественную</span>
          <span className="mf__line mf__line--graphite">Красоту</span>
        </h2>
        <p className="mf__text t-lg" data-placeholder="copy">
          {ru('Деликатно подчеркивать природную гармонию лица и кожи.')}
        </p>
        <p className="mf__aside" data-placeholder="copy">
          {ru('Забота')}
          <br />
          {ru('в равновесии')}
          <br />
          {ru('с точностью')}
        </p>
      </div>
    );
  },
);
