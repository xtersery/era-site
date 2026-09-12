import { useId, useState, type KeyboardEvent } from 'react';

import { Handoff, MetaList, Room } from '@/components/common';
import { InquiryLink, Placeholder, TextLink } from '@/components/ui';
import { cta } from '@/data/copy';
import { services } from '@/data/services';
import { useBreakpointUp } from '@/hooks';
import { sectionAnchor, sectionIndex } from '@/lib/constants/sections';
import { cn, subIndex } from '@/lib/utils';
import type { SectionProps, ServiceCategory } from '@/types';

import './Services.css';

interface SpreadProps {
  readonly category: ServiceCategory;
  readonly panelId: string;
  readonly tabId: string;
  readonly role: 'tabpanel' | 'region';
}

/** The selected category's spread: heading, promise, copy, metadata, image, handoff. */
function Spread({ category, panelId, tabId, role }: SpreadProps) {
  return (
    <div id={panelId} role={role} aria-labelledby={tabId} className="services__spread" tabIndex={0}>
      <h3 className="services__title t-display">{category.name}</h3>
      <div className="services__spread-text">
        <p className="services__promise t-lg">{category.promise}</p>
        <p className="services__description t-body" data-placeholder="copy">
          {category.description}
        </p>
        <MetaList items={category.meta} layout="table" className="services__meta" />
      </div>
      <Placeholder
        kind="image"
        label={category.imageLabel}
        ratio="4 / 5"
        className="services__image bleed-right"
      />
      <Handoff
        className="services__handoff"
        primary={<InquiryLink procedure={category.id}>{cta.book}</InquiryLink>}
      >
        <TextLink href={`${sectionAnchor('pricing')}?cat=${category.id}`}>
          {cta.seePricing}
        </TextLink>
        <TextLink href={`${sectionAnchor('cases')}?cat=${category.id}`}>{cta.seeCases}</TextLink>
      </Handoff>
    </div>
  );
}

/**
 * 02 — Услуги. Light. A typographic index, not cards: serif category names with
 * mono indices on the left; the selected category's spread on the right.
 * Desktop: tabs. Phone: an accordion, one open at a time.
 */
export function Services({ id, className }: SectionProps) {
  const [activeId, setActiveId] = useState(services[0]?.id ?? '');
  // Tabs need the full 12-column width; tablet gets the accordion.
  const isDesktop = useBreakpointUp('lg');
  const baseId = useId();
  const index = sectionIndex(id);

  const active = services.find((s) => s.id === activeId) ?? services[0];

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isDesktop) return;
    const i = services.findIndex((s) => s.id === activeId);
    let next = i;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % services.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (i - 1 + services.length) % services.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = services.length - 1;
    if (next !== i) {
      event.preventDefault();
      const target = services[next];
      if (target) {
        setActiveId(target.id);
        document.getElementById(`${baseId}-tab-${target.id}`)?.focus();
      }
    }
  };

  return (
    <Room id={id} ground="light" {...(className ? { className } : {})}>
      <h2 id={`${id}-heading`} className="sr-only">
        Услуги
      </h2>

      <div className={cn('services', isDesktop ? 'services--tabs' : 'services--accordion')}>
        <div
          className="services__index"
          role={isDesktop ? 'tablist' : undefined}
          aria-orientation={isDesktop ? 'vertical' : undefined}
          aria-label={isDesktop ? 'Направления' : undefined}
          onKeyDown={onTabKeyDown}
        >
          {services.map((category, n) => {
            const tabId = `${baseId}-tab-${category.id}`;
            const panelId = `${baseId}-panel-${category.id}`;
            const selected = category.id === activeId;
            return (
              <div className="services__item" key={category.id}>
                <button
                  type="button"
                  id={tabId}
                  className={cn('services__tab', selected && 'is-selected')}
                  role={isDesktop ? 'tab' : undefined}
                  aria-selected={isDesktop ? selected : undefined}
                  aria-expanded={isDesktop ? undefined : selected}
                  aria-controls={panelId}
                  tabIndex={isDesktop && !selected ? -1 : 0}
                  onClick={() => setActiveId(category.id)}
                >
                  <span className="services__tab-index t-meta">{subIndex(index, n + 1)}</span>
                  <span className="services__tab-name t-h3">{category.name}</span>
                </button>
                {!isDesktop && selected && (
                  <Spread category={category} panelId={panelId} tabId={tabId} role="region" />
                )}
              </div>
            );
          })}
        </div>

        {isDesktop && active && (
          <Spread
            category={active}
            panelId={`${baseId}-panel-${active.id}`}
            tabId={`${baseId}-tab-${active.id}`}
            role="tabpanel"
          />
        )}
      </div>
    </Room>
  );
}
