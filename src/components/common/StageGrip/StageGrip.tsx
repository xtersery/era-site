import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import './StageGrip.css';

/**
 * A grip — the DOM surface that captures interaction for a stage set
 * (docs/ARCHITECTURE.md §0.8). `aria-hidden`, never focusable, content-free;
 * `touch-action: pan-y` so vertical scroll always survives. Grips write to the
 * stage; the canvas never receives events.
 */
export function StageGrip({
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  return <div className={cn('stage-grip', className)} aria-hidden="true" {...rest} />;
}
