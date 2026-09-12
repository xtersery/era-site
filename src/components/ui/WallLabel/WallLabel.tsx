import { SECTION_LABELS, sectionIndex, type SectionId } from '@/lib/constants/sections';
import { cn } from '@/lib/utils';

import './WallLabel.css';

interface WallLabelProps {
  readonly id: SectionId;
  /** Override the visible label — the hero reads «эра cosmetology». */
  readonly label?: string;
  readonly className?: string;
}

/**
 * The wall label — `02 — Услуги` — top-left of every room, same position every
 * time, so the page reads as rooms in sequence (Relief) numbered like an
 * instrument (Calibration).
 */
export function WallLabel({ id, label, className }: WallLabelProps) {
  return (
    <p className={cn('wall-label t-meta', className)}>
      <span className="wall-label__index">{sectionIndex(id)}</span>
      <span className="wall-label__dash" aria-hidden="true">
        {' — '}
      </span>
      <span className="wall-label__name">{label ?? SECTION_LABELS[id]}</span>
    </p>
  );
}
