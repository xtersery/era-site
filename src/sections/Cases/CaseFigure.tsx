import { useRef, useState, type PointerEvent } from 'react';

import { Placeholder } from '@/components/ui';
import { cta } from '@/data/copy';
import { cn } from '@/lib/utils';
import type { CaseRecord } from '@/types';

interface CaseFigureProps {
  readonly record: CaseRecord;
  /** Phone default; also a user choice. */
  readonly sideBySide: boolean;
  readonly onToggleSideBySide: () => void;
}

/**
 * The «Линза»: the «после» is the default; a circular clip on the «до» layer
 * follows the pointer — a glass with a hairline rim, no distortion, identical
 * framing beneath (docs/ARCHITECTURE.md §0.3). CSS `transition` on
 * `clip-path` gives the glass its weight; no JS damping needed.
 *
 * Keyboard and screen readers use «Показать до / после» (`aria-pressed`);
 * «Сравнить рядом» swaps to a diptych, which is also the phone layout.
 */
export function CaseFigure({ record, sideBySide, onToggleSideBySide }: CaseFigureProps) {
  const [showBefore, setShowBefore] = useState(false);
  const [lensing, setLensing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    frameRef.current.style.setProperty('--lens-x', `${event.clientX - rect.left}px`);
    frameRef.current.style.setProperty('--lens-y', `${event.clientY - rect.top}px`);
    if (!lensing) setLensing(true);
  };

  const onPointerLeave = () => setLensing(false);

  if (sideBySide) {
    return (
      <div className="case__figure case__figure--side">
        <div className="case__pair">
          <figure className="case__half">
            <Placeholder kind="portrait" label={record.beforeLabel} ratio="4 / 5" />
            <figcaption className="case__half-label t-meta">до</figcaption>
          </figure>
          <figure className="case__half">
            <Placeholder kind="portrait" label={record.afterLabel} ratio="4 / 5" />
            <figcaption className="case__half-label t-meta">после</figcaption>
          </figure>
        </div>
        <div className="case__controls">
          <button
            type="button"
            className="case__control t-meta"
            aria-pressed={true}
            onClick={onToggleSideBySide}
          >
            {cta.compareSideBySide}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="case__figure">
      <div
        ref={frameRef}
        className={cn('case__frame', lensing && 'is-lensing', showBefore && 'is-before')}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className="case__after">
          <Placeholder kind="portrait" label={record.afterLabel} ratio="4 / 5" />
          <span className="case__state t-meta" aria-hidden="true">
            после
          </span>
        </div>
        <div className="case__before" aria-hidden={!showBefore}>
          <Placeholder kind="portrait" label={record.beforeLabel} ratio="4 / 5" />
          <span className="case__state t-meta" aria-hidden="true">
            до
          </span>
        </div>
        <div className="case__rim" aria-hidden="true" />
      </div>
      <div className="case__controls">
        <button
          type="button"
          className="case__control t-meta"
          aria-pressed={showBefore}
          onClick={() => setShowBefore((v) => !v)}
        >
          {cta.showBeforeAfter}
        </button>
        <button
          type="button"
          className="case__control t-meta"
          aria-pressed={false}
          onClick={onToggleSideBySide}
        >
          {cta.compareSideBySide}
        </button>
      </div>
    </div>
  );
}
