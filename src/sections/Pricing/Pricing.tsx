import { useState } from 'react';

import { Handoff, Room } from '@/components/common';
import { InquiryLink, TextLink } from '@/components/ui';
import { cta, proposed } from '@/data/copy';
import { pricing } from '@/data/pricing';
import { services } from '@/data/services';
import { useHashParam } from '@/hooks';
import { sectionAnchor } from '@/lib/constants/sections';
import { cn, formatRub, formatRubRange } from '@/lib/utils';
import type { PriceRow, SectionProps } from '@/types';

import './Pricing.css';

const ALL = 'all';

const priceText = (row: PriceRow): string =>
  'exact' in row.price ? formatRub(row.price.exact) : formatRubRange(row.price.from, row.price.to);

const categoryName = (categoryId: string): string =>
  categoryId === 'consultation'
    ? 'Консультация'
    : (services.find((s) => s.id === categoryId)?.name ?? categoryId);

/**
 * 03 — Стоимость. Dark, tight. A price list, not a table of plans: hairline
 * rows, name left, mono metadata centre, price right, tabular. Filtered by the
 * same seven categories (also via `#pricing?cat=`). Prices never animate.
 */
export function Pricing({ id, className }: SectionProps) {
  const hashCat = useHashParam(id, 'cat');
  // The hash is the external source; a local choice overrides it until the hash changes.
  const [state, setState] = useState({ hash: hashCat, filter: hashCat ?? ALL });
  if (hashCat !== state.hash) setState({ hash: hashCat, filter: hashCat ?? state.filter });
  const filter = state.filter;
  const setFilter = (next: string) => setState((s) => ({ ...s, filter: next }));

  const rows = filter === ALL ? pricing : pricing.filter((r) => r.categoryId === filter);
  const groups = [...new Set(rows.map((r) => r.categoryId))];

  return (
    <Room id={id} ground="dark" tight {...(className ? { className } : {})}>
      <div className="pricing__head room__grid">
        <h2 id={`${id}-heading`} className="pricing__plaque t-lead" data-placeholder="copy">
          {proposed.pricingPlaque}
        </h2>
        <div className="pricing__filters" role="group" aria-label="Фильтр по направлениям">
          <button
            type="button"
            className={cn('pricing__filter t-meta', filter === ALL && 'is-active')}
            aria-pressed={filter === ALL}
            onClick={() => setFilter(ALL)}
          >
            {cta.all}
          </button>
          {services.map((s) => (
            <button
              type="button"
              key={s.id}
              className={cn('pricing__filter t-meta', filter === s.id && 'is-active')}
              aria-pressed={filter === s.id}
              onClick={() => setFilter(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <table className="pricing__table">
        <caption className="sr-only">
          Стоимость процедур — примеры формата, не прайс клиники
        </caption>
        <thead>
          <tr className="pricing__row pricing__row--head t-meta t-muted">
            <th scope="col">Процедура</th>
            <th scope="col" className="pricing__cell--meta">
              Длительность · курс
            </th>
            <th scope="col" className="pricing__cell--price">
              Стоимость
            </th>
            <th scope="col" className="sr-only">
              Действие
            </th>
          </tr>
        </thead>
        {groups.map((categoryId) => (
          <tbody key={categoryId}>
            <tr className="pricing__group">
              <th scope="rowgroup" colSpan={4} className="pricing__group-label t-meta t-muted">
                — {categoryName(categoryId)}
              </th>
            </tr>
            {rows
              .filter((r) => r.categoryId === categoryId)
              .map((row) => (
                <tr className="pricing__row" key={row.id} data-placeholder="fact">
                  <th scope="row" className="pricing__cell pricing__cell--name">
                    <span className="pricing__name t-body">{row.name}</span>
                    {row.note && <span className="pricing__note t-meta t-muted">{row.note}</span>}
                  </th>
                  <td className="pricing__cell pricing__cell--meta t-meta">
                    {row.duration}
                    {row.course && <span className="pricing__course"> · {row.course}</span>}
                  </td>
                  <td className="pricing__cell pricing__cell--price t-price">{priceText(row)}</td>
                  <td className="pricing__cell pricing__cell--action">
                    <InquiryLink
                      variant="text"
                      procedure={
                        row.categoryId === 'consultation' ? 'consultation' : row.categoryId
                      }
                    >
                      {cta.book}
                    </InquiryLink>
                  </td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>

      <p className="pricing__colophon t-meta t-muted" data-placeholder="copy">
        {proposed.pricingColophon}
      </p>

      <Handoff className="pricing__handoff" primary={<InquiryLink>{cta.leaveRequest}</InquiryLink>}>
        <TextLink href={sectionAnchor('cases')} glyph="down">
          {cta.seeResults}
        </TextLink>
        <TextLink href={sectionAnchor('specialists')}>{cta.chooseSpecialist}</TextLink>
      </Handoff>
    </Room>
  );
}
