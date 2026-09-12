import { useEffect, useState } from 'react';

import { Room } from '@/components/common';
import { InquiryLink, Placeholder, TextLink, WallLabel } from '@/components/ui';
import { heroMeta } from '@/data/contact';
import { cta, pending, proposed } from '@/data/copy';
import { sectionAnchor } from '@/lib/constants/sections';
import { cn } from '@/lib/utils';
import type { SectionProps } from '@/types';

import './Hero.css';

/** HH:MM, refreshed each minute — calm metadata, not a ticking dashboard. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return <time dateTime={`${hh}:${mm}`}>{`${hh}:${mm}`}</time>;
}

/**
 * 00 — Главная. Dark. The wordmark «эра» bottom-left, cropped by the viewport
 * edge; the lens (WebGL appearance 1 — placeholder in this phase) off-centre
 * right overlapping the «а»; headline, primary CTA and secondary upper-right;
 * mono metadata bottom-right. Phone: lens on top, wordmark read through it.
 */
export function Hero({ id, className }: SectionProps) {
  return (
    <Room id={id} ground="dark" hideLabel className={cn('room--hero', className)}>
      <div className="hero">
        <div className="hero__intro">
          <WallLabel id={id} label={`эра ${proposed.brandMono}`} className="hero__label" />
          <h1
            id={`${id}-heading`}
            className="hero__headline t-lead is-pending"
            data-placeholder="copy"
          >
            {pending.heroHeadline}
          </h1>
          <div className="hero__cta">
            <InquiryLink procedure="consultation">{cta.bookConsultation}</InquiryLink>
            <TextLink href={sectionAnchor('services')} glyph="down">
              {cta.seeServices}
            </TextLink>
          </div>
        </div>

        <div className="hero__lens" data-stage-anchor="hero-lens">
          <Placeholder
            kind="lens"
            label="Оптическая линза с рефракцией · за ней — портрет кампании (женщина 45–50, профиль)"
            className="hero__lens-ph"
          />
        </div>

        <p className="hero__wordmark t-hero" aria-hidden="true" data-stage-anchor="hero-wordmark">
          эра
        </p>

        <p className="hero__meta t-meta t-muted">
          <span data-placeholder="fact">{heroMeta}</span>
          <span className="hero__meta-sep" aria-hidden="true">
            {' · '}
          </span>
          <LiveClock />
        </p>
      </div>
    </Room>
  );
}
