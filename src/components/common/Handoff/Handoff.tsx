import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './Handoff.css';

interface HandoffProps {
  /** The one primary CTA for this viewport. */
  readonly primary: ReactNode;
  /** Routing secondaries — TextLinks. */
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * The row every room ends with: one primary, optional routing secondaries.
 * Enforces the "every section ends with a handoff" rule by existing.
 */
export function Handoff({ primary, children, className }: HandoffProps) {
  return (
    <div className={cn('handoff', className)}>
      <div className="handoff__primary">{primary}</div>
      {children && <div className="handoff__secondary">{children}</div>}
    </div>
  );
}
