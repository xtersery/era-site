import type { HTMLAttributes, ReactNode } from 'react';

import { WallLabel } from '@/components/ui';
import type { SectionId } from '@/lib/constants/sections';
import { cn } from '@/lib/utils';

import './Room.css';

export type Ground = 'dark' | 'light';

interface RoomProps extends Omit<HTMLAttributes<HTMLElement>, 'id' | 'className' | 'children'> {
  readonly id: SectionId;
  readonly ground: Ground;
  /** Visible label override (hero). */
  readonly label?: string;
  /** Hide the wall label — only the hero places its own. */
  readonly hideLabel?: boolean;
  /** Tighter vertical rhythm for instrument rooms (pricing, contact). */
  readonly tight?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * A room: the section landmark, its ground and its wall label.
 *
 * `tabIndex={-1}` lets the anchor handler move focus here without adding the
 * section to the tab order. The heading the room is labelled by is
 * `${id}-heading` — every section renders one, visible or `.sr-only`.
 */
export function Room({
  id,
  ground,
  label,
  hideLabel = false,
  tight = false,
  className,
  children,
  ...rest
}: RoomProps) {
  return (
    <section
      id={id}
      className={cn('room', `room--${ground}`, tight && 'room--tight', className)}
      aria-labelledby={`${id}-heading`}
      tabIndex={-1}
      {...rest}
    >
      <div className="room__inner u-shell">
        {!hideLabel && <WallLabel id={id} {...(label ? { label } : {})} className="room__label" />}
        {children}
      </div>
    </section>
  );
}
