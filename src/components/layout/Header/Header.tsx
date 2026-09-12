import { useEffect, useState } from 'react';

import { InquiryLink } from '@/components/ui';
import { cta } from '@/data/copy';
import {
  NAV_SECTION_IDS,
  SECTION_LABELS,
  sectionAnchor,
  sectionIndex,
  type SectionId,
} from '@/lib/constants/sections';
import { cn } from '@/lib/utils';

import './Header.css';

/** Tracks which room owns the top of the viewport, for the index. */
function useCurrentSection(): SectionId | null {
  const [current, setCurrent] = useState<SectionId | null>(null);

  useEffect(() => {
    const sections = NAV_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id as SectionId);
        }
      },
      // A thin band just below the header: whichever room crosses it is current.
      { rootMargin: '-64px 0px -85% 0px', threshold: 0 },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return current;
}

/**
 * Fixed header: wordmark · mono room index (desktop) · persistent «Записаться».
 *
 * Drawn in light and composited with `mix-blend-mode: difference`, so it reads
 * correctly over dark and light rooms without knowing which one it is over.
 */
export function Header() {
  const current = useCurrentSection();

  return (
    <header className="header">
      <div className="header__inner u-shell">
        <a
          className="header__wordmark"
          href={sectionAnchor('hero')}
          aria-label="эра cosmetology — на главную"
        >
          <span className="header__wordmark-serif">эра</span>
        </a>

        <nav className="header__nav" aria-label="Разделы">
          <ol className="header__index" role="list">
            {NAV_SECTION_IDS.map((id) => (
              <li key={id}>
                <a
                  className={cn('header__link t-meta', current === id && 'is-current')}
                  href={sectionAnchor(id)}
                  aria-current={current === id ? 'true' : undefined}
                >
                  <span className="header__link-index">{sectionIndex(id)}</span>
                  <span className="header__link-label">{SECTION_LABELS[id]}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="header__cta">
          <InquiryLink compact>{cta.book}</InquiryLink>
        </div>
      </div>
    </header>
  );
}
