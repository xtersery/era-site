import { useState } from 'react';

import { Handoff, MetaList, Room } from '@/components/common';
import { InquiryLink, TextLink } from '@/components/ui';
import { CASE_STATUS_LABEL, cases } from '@/data/cases';
import { cta, pending } from '@/data/copy';
import { services } from '@/data/services';
import { specialistById } from '@/data/specialists';
import { useBreakpointUp, useHashParam } from '@/hooks';
import { sectionIndex } from '@/lib/constants/sections';
import { subIndex } from '@/lib/utils';
import type { CaseRecord, SectionProps } from '@/types';

import { CaseFigure } from './CaseFigure';
import './Cases.css';

function CaseArticle({
  record,
  n,
  index,
  defaultSideBySide,
}: {
  readonly record: CaseRecord;
  readonly n: number;
  readonly index: string;
  readonly defaultSideBySide: boolean;
}) {
  // Breakpoint sets the default; the visitor's toggle overrides it until the breakpoint changes.
  const [state, setState] = useState({ base: defaultSideBySide, value: defaultSideBySide });
  if (defaultSideBySide !== state.base)
    setState({ base: defaultSideBySide, value: defaultSideBySide });
  const sideBySide = state.value;
  const setSideBySide = (update: (v: boolean) => boolean) =>
    setState((s) => ({ ...s, value: update(s.value) }));

  const specialist = specialistById(record.specialistId);
  const items: Array<readonly [string, string]> = [
    ['Результат', record.resultAfter],
    ['Специалист', specialist?.name ?? '[Имя Фамилия]'],
  ];
  if (record.course) items.push(['Курс', record.course]);

  return (
    <article className="case room__grid" aria-labelledby={`${record.id}-title`}>
      <CaseFigure
        record={record}
        sideBySide={sideBySide}
        onToggleSideBySide={() => setSideBySide((v) => !v)}
      />
      <div className="case__text">
        <p className="case__index t-meta t-muted">{subIndex(index, n + 1)}</p>
        <h3 id={`${record.id}-title`} className="case__title t-h3">
          {record.title}
        </h3>
        <MetaList items={items} layout="table" className="case__meta" />
        <p className="case__commentary t-body" data-placeholder="copy">
          {record.commentary}
        </p>
        <p className="case__status t-meta" data-case-status={record.status}>
          {CASE_STATUS_LABEL[record.status]}
        </p>
        <div className="case__cta">
          <InquiryLink procedure={record.categoryId} specialist={record.specialistId}>
            {cta.bookThisProcedure}
          </InquiryLink>
        </div>
      </div>
    </article>
  );
}

/**
 * 04 — Кейсы · до / после. Light. Each case is a full-width editorial spread:
 * the figure (lens by default on desktop, diptych on phone) left, the title,
 * mono metadata, commentary and the honesty label right. Commercially the
 * decisive room — placed right after pricing.
 */
export function Cases({ id, className }: SectionProps) {
  const hashCat = useHashParam(id, 'cat');
  const [state, setState] = useState({ hash: hashCat, filter: hashCat });
  if (hashCat !== state.hash) setState({ hash: hashCat, filter: hashCat });
  const filter = state.filter;
  const setFilter = (next: string | null) => setState((s) => ({ ...s, filter: next }));
  const isDesktop = useBreakpointUp('md');
  const index = sectionIndex(id);

  const visible = filter ? cases.filter((c) => c.categoryId === filter) : cases;
  const filterName = filter ? services.find((s) => s.id === filter)?.name : null;

  return (
    <Room id={id} ground="light" {...(className ? { className } : {})}>
      <div className="cases__head room__grid">
        <h2
          id={`${id}-heading`}
          className="cases__headline t-display is-pending"
          data-placeholder="copy"
        >
          {pending.casesHeadline}
        </h2>
        {filter && (
          <p className="cases__filter t-meta">
            <span className="t-muted">Фильтр — </span>
            {filterName ?? filter}
            {'  '}
            <TextLink glyph="none" onClick={() => setFilter(null)}>
              {cta.allCases}
            </TextLink>
          </p>
        )}
      </div>

      <div className="cases__list">
        {(visible.length > 0 ? visible : cases).map((record, n) => (
          <CaseArticle
            key={record.id}
            record={record}
            n={n}
            index={index}
            defaultSideBySide={!isDesktop}
          />
        ))}
      </div>

      <Handoff
        className="cases__handoff"
        primary={<InquiryLink procedure="consultation">{cta.bookConsultation}</InquiryLink>}
      >
        <TextLink placeholder glyph="forward">
          {cta.allCases}
        </TextLink>
      </Handoff>
    </Room>
  );
}
