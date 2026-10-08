import { useCallback, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';

import { cn } from '@/lib/utils';

import './CompareSlider.css';

export interface CompareSliderImage {
  readonly src: string;
  readonly alt: string;
}

export interface CompareSliderProps {
  /** 0 … 1 — the share of the width, from the left, that shows «до». */
  readonly value: number;
  readonly onChange: (value: number, source: 'pointer' | 'keyboard') => void;
  /**
   * Optional photograph layers. Given, the control renders «после» as the base
   * and «до» clipped to the left of the divider. Omitted, the control is the
   * divider alone over whatever draws the two states beneath it (the archive's
   * WebGL sheet does its own mix at the same split).
   */
  readonly before?: CompareSliderImage;
  readonly after?: CompareSliderImage;
  readonly labels?: { readonly before: string; readonly after: string };
  readonly ariaLabel?: string;
  readonly loading?: 'lazy' | 'eager';
  readonly className?: string;
}

const STEP = 0.02;
const PAGE = 0.1;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * «До / после» — one vertical divider across a pair of photographs.
 *
 * The photographs are the evidence; the control only makes the difference easy
 * to see: a hairline, one small ring to take hold of, two quiet labels in the
 * upper corners that step aside when the divider reaches them. The whole
 * surface drags (mouse, trackpad, touch — horizontal only, so a vertical swipe
 * still scrolls the page), the ring is a real `role="slider"` for the keyboard
 * (arrows step 2 %, Shift/Page 10 %, Home/End to either photograph).
 *
 * The two layers share one box, one `object-fit`, one `object-position` — the
 * comparison is a clip, never a transform: nothing in either face moves.
 */
export function CompareSlider({
  value,
  onChange,
  before,
  after,
  labels = { before: 'до', after: 'после' },
  ariaLabel = 'Сравнение до и после',
  loading = 'lazy',
  className,
}: CompareSliderProps) {
  const root = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const id = useId();
  const v = clamp01(value);
  const pct = Math.round(v * 100);

  const fromPointer = useCallback(
    (e: PointerEvent) => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      onChange(clamp01((e.clientX - r.left) / r.width), 'pointer');
    },
    [onChange],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset['dragging'] = '';
      // the surface, not the ring, is what most people take hold of — keep the ring focused for the keyboard
      e.currentTarget.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true });
      e.preventDefault();
      fromPointer(e);
    },
    [fromPointer],
  );
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      fromPointer(e);
    },
    [fromPointer],
  );
  const onPointerEnd = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    delete e.currentTarget.dataset['dragging'];
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      let next: number;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          next = v - (e.shiftKey ? PAGE : STEP);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          next = v + (e.shiftKey ? PAGE : STEP);
          break;
        case 'PageDown':
          next = v - PAGE;
          break;
        case 'PageUp':
          next = v + PAGE;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange(clamp01(next), 'keyboard');
    },
    [onChange, v],
  );

  return (
    <div
      ref={root}
      className={cn('compare', className)}
      style={{ '--split': v } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      {after && <img className="compare__img compare__img--after" src={after.src} alt={after.alt} loading={loading} decoding="async" draggable={false} />}
      {before && <img className="compare__img compare__img--before" src={before.src} alt={before.alt} loading={loading} decoding="async" draggable={false} />}

      <span className="compare__tag compare__tag--before" data-hidden={v < 0.14 || undefined} aria-hidden="true">
        {labels.before}
      </span>
      <span className="compare__tag compare__tag--after" data-hidden={v > 0.86 || undefined} aria-hidden="true">
        {labels.after}
      </span>

      <div className="compare__line" aria-hidden="true" />
      <div
        id={id}
        className="compare__handle"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${labels.before} — ${pct} %, ${labels.after} — ${100 - pct} %`}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        <span className="compare__ring" aria-hidden="true" />
      </div>
    </div>
  );
}
