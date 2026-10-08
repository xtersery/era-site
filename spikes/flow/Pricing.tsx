import { useEffect, useRef, useState } from 'react';

import { proposed } from '@/data/copy';
import { priceItems, priceList } from '@/data/priceList';
import { usePrefersReducedMotion } from '@/hooks';

import { PriceTable } from './PriceTable';

/**
 * 03 — Стоимость, the price layer of the flow spike.
 *
 * Content is the clinic's real price list (`@/data/priceList`, 2026) — seven
 * categories, one table each, under a sticky local index so the long list is
 * a set of rooms, not a wall. Prices are static (they never count up).
 *
 * It lives in the layer, not in the document: the vertical story runs
 * Услуги → Кейсы and this is reached deliberately. Its handoff leads back out
 * of the layer — «Посмотреть результаты →» closes it and goes to Кейсы. The
 * index is buttons, not `#` anchors: the layer treats every `#` link as a
 * way out.
 */

const anchorId = (categoryId: string) => `price-${categoryId}`;
const no = (i: number) => `03.${i + 1}`;
const ITEM_COUNT = priceItems().length;

export function SpikePricing() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(priceList[0]?.id ?? '');
  const sections = useRef<Map<string, HTMLElement>>(new Map());
  const rail = useRef<HTMLOListElement>(null);

  // The index follows reading: the category whose head has passed the upper
  // fifth of the viewport. State changes only when the category does.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset['category'] ?? '');
        }
      },
      { rootMargin: '-20% 0px -75% 0px' },
    );
    sections.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // On the phone the index is one sideways rail: keep the current entry in it.
  useEffect(() => {
    const ol = rail.current;
    const btn = ol?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!ol || !btn || ol.scrollWidth <= ol.clientWidth) return;
    const left = btn.offsetLeft - ol.offsetLeft - (ol.clientWidth - btn.offsetWidth) / 2;
    ol.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }, [active, reduced]);

  const jump = (categoryId: string) => {
    const el = sections.current.get(categoryId);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    el.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    setActive(categoryId);
  };

  return (
    <section className="spike-pricing" id="pricing" aria-labelledby="pricing-title">
      <p className="spike-pricing__label" aria-hidden="true">
        <span>03 — Стоимость</span>
        <span>
          {priceList.length} разделов · {ITEM_COUNT} позиций · прайс-лист 2026
        </span>
      </p>

      <div className="spike-pricing__body">
        <h2 id="pricing-title" className="spike-pricing__title">
          Стоимость
        </h2>
        <p className="spike-pricing__lead">{proposed.pricingPlaque}</p>

        <nav className="spike-pricing__index" aria-label="Разделы прайс-листа">
          <ol ref={rail}>
            {priceList.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="spike-pricing__index-link"
                  aria-current={active === c.id ? 'true' : undefined}
                  onClick={() => jump(c.id)}
                >
                  <span className="spike-pricing__index-no">{no(i)}</span>
                  {c.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {priceList.map((c, i) => (
          <section
            key={c.id}
            id={anchorId(c.id)}
            data-category={c.id}
            className="spike-pricing__category"
            aria-labelledby={`${anchorId(c.id)}-title`}
            ref={(el) => {
              if (el) sections.current.set(c.id, el);
              else sections.current.delete(c.id);
            }}
          >
            <header className="spike-pricing__category-head">
              <span className="spike-pricing__category-no" aria-hidden="true">
                {no(i)}
              </span>
              <h3 id={`${anchorId(c.id)}-title`} tabIndex={-1}>
                {c.fullTitle ?? c.title}
              </h3>
            </header>
            <PriceTable category={c} />
          </section>
        ))}

        <p className="spike-pricing__colophon">{proposed.pricingColophon}</p>

        <div className="spike-pricing__handoff">
          <a className="state__btn" href="#inquiry">
            Оставить заявку
          </a>
          <a className="state__link" href="#cases">
            Посмотреть результаты →
          </a>
        </div>
      </div>
    </section>
  );
}
