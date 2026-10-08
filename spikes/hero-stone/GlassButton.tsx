import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GlassButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  readonly href: string;
  readonly children: ReactNode;
  readonly compact?: boolean;
  /** The primary carries an arrow, as the reference does. */
  readonly arrow?: boolean;
  readonly className?: string;
}

/**
 * The hero's CTA after docs/references/button-ref.png: a deep-green pill with a
 * lit edge, a whisper of gold at the rim and a soft warm glow — an object, not
 * a flat block. Spike-local; the system's `Button` stays the primary CTA
 * elsewhere until this reading is approved.
 */
export function GlassButton({
  href,
  children,
  compact = false,
  arrow = false,
  className,
  ...rest
}: GlassButtonProps) {
  return (
    <a className={cn('gbtn', compact && 'gbtn--compact', className)} href={href} {...rest}>
      <span className="gbtn__label">{children}</span>
      {arrow && (
        <span className="gbtn__glyph" aria-hidden="true">
          →
        </span>
      )}
    </a>
  );
}
