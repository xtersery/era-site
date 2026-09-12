import { useRef, useState } from 'react';

import { useHorizontalPin } from '@/animations/scroll';
import { Handoff, MetaList } from '@/components/common';
import { InquiryLink, Placeholder, TextLink, WallLabel } from '@/components/ui';
import { cta, proposed } from '@/data/copy';
import { specialists } from '@/data/specialists';
import { useVisualTier } from '@/hooks';
import { isLiveTier } from '@/lib/stage';
import { sectionIndex } from '@/lib/constants/sections';
import { cn, subIndex } from '@/lib/utils';
import type { SectionProps, Specialist } from '@/types';

import './Specialists.css';

function SpecialistPanel({
  person,
  n,
  index,
}: {
  readonly person: Specialist;
  readonly n: number;
  readonly index: string;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = `${person.id}-details`;

  return (
    <article className="specialist" aria-labelledby={`${person.id}-name`}>
      <div className="specialist__inner u-shell room__grid">
        <Placeholder
          kind="portrait"
          label={person.portraitLabel}
          ratio="4 / 5"
          className="specialist__portrait bleed-left"
        />
        <div className="specialist__text">
          <p className="specialist__index t-meta t-muted">{subIndex(index, n + 1)}</p>
          <h3 id={`${person.id}-name`} className="specialist__name t-h2" data-placeholder="fact">
            {person.name}
          </h3>
          <p className="specialist__role t-body">{person.role}</p>
          <MetaList items={person.facts} layout="table" className="specialist__facts" />
          <p className="specialist__sentence t-lg" data-placeholder="copy">
            {person.sentence}
          </p>
          <div className="specialist__cta">
            <InquiryLink specialist={person.id}>{cta.bookWith(person.shortName)}</InquiryLink>
            <TextLink
              glyph={open ? 'none' : 'forward'}
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? cta.less : cta.more}
            </TextLink>
          </div>
          <ul id={detailsId} className="specialist__credentials t-meta" hidden={!open} role="list">
            {person.credentials.map((c, i) => (
              <li key={`${person.id}-cred-${i}`} data-placeholder="fact">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/**
 * 05 — Специалисты. Light. Horizontal pinned scroll on desktop in the `full`
 * tier when there are at least three people; a vertical stack otherwise.
 * Real photography only — placeholders are labelled as such.
 */
export function Specialists({ id, className }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const tier = useVisualTier();
  const index = sectionIndex(id);
  const count = specialists.length;
  const pinned = isLiveTier(tier) && count >= 3;

  useHorizontalPin({
    section: sectionRef,
    track: trackRef,
    count,
    enabled: pinned,
    onProgress: (p) => {
      if (!counterRef.current) return;
      const current = Math.min(count, Math.round(p * (count - 1)) + 1);
      counterRef.current.textContent = `${subIndex(index, current)} / ${subIndex(index, count)}`;
    },
  });

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn('room room--light specialists', pinned && 'specialists--pinnable', className)}
      aria-labelledby={`${id}-heading`}
      tabIndex={-1}
    >
      <div className="specialists__head u-shell">
        <WallLabel id={id} />
        <h2 id={`${id}-heading`} className="sr-only">
          Специалисты
        </h2>
        <p className="specialists__counter t-meta" aria-hidden="true">
          <span ref={counterRef}>
            {subIndex(index, 1)} / {subIndex(index, count)}
          </span>
        </p>
      </div>

      <div className="specialists__track" ref={trackRef}>
        {specialists.map((person, n) => (
          <SpecialistPanel key={person.id} person={person} n={n} index={index} />
        ))}
      </div>

      <div className="specialists__foot u-shell">
        <Handoff primary={<InquiryLink>{cta.pickSpecialist}</InquiryLink>}>
          <span className="t-meta t-muted" data-placeholder="copy">
            {proposed.specialistsHelp}
          </span>
        </Handoff>
      </div>
    </section>
  );
}
