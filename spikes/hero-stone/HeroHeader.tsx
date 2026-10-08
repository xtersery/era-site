import { useEffect, useId, useRef, useState } from 'react';

import { NAV_SECTION_IDS, SECTION_LABELS, sectionAnchor } from '@/lib/constants/sections';
import { cn } from '@/lib/utils';
import { ru } from '@/lib/utils/ru';

import { GlassButton } from './GlassButton';

/**
 * The hero's header, after docs/references/hero-ref.png: transparent, over the
 * onyx. Left — the official mark, the name, a hairline and the descriptor.
 * Right — the «Стоимость» capsule, the word «Меню» and a round gold-ringed
 * button; the room index unfolds leftwards from it on the stone alone.
 */
export function HeroHeader() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <header className="hh">
      <a
        className="hh__brand"
        href={sectionAnchor('hero')}
        aria-label="эра cosmetology — на главную"
      >
        <span className="hh__mark" aria-hidden="true" />
        <span className="hh__name">эра</span>
        <span className="hh__descriptor" data-placeholder="copy">
          {ru('Клиника эстетической косметологии')}
        </span>
      </a>

      <div className="hh__right">
        {/* opens the price layer on the composed page (its delegated `#pricing` handler) */}
        <GlassButton href={sectionAnchor('pricing')} compact className="hh__cta">
          {SECTION_LABELS.pricing}
        </GlassButton>

        <nav ref={navRef} className={cn('hh__nav', open && 'is-open')} aria-label="Разделы">
          <ul id={listId} className="hh__index" role="list">
            {NAV_SECTION_IDS.map((id, i) => (
              <li key={id} style={{ '--i': NAV_SECTION_IDS.length - 1 - i } as React.CSSProperties}>
                <a className="hh__link" href={sectionAnchor(id)} onClick={() => setOpen(false)}>
                  {SECTION_LABELS[id]}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="hh__menu"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="hh__menu-word">{open ? 'Закрыть' : 'Меню'}</span>
            <span className="hh__menu-ring" aria-hidden="true">
              <span className="hh__menu-icon" />
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
