import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './Button.css';

interface BaseProps {
  readonly children: ReactNode;
  /** Header / dense contexts. Default is the 56 px touch-sized control. */
  readonly compact?: boolean;
  readonly className?: string;
}

type AnchorProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    readonly href: string;
  };

type NativeButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    readonly href?: undefined;
  };

export type ButtonProps = AnchorProps | NativeButtonProps;

/**
 * The primary CTA — a rectangle, no radius, filled with `--color-cta`.
 *
 * One per viewport (CLAUDE.md → Hard rule 5). Renders `<a>` when given an
 * `href`, otherwise `<button>`; never a div.
 */
export function Button(props: ButtonProps) {
  const { children, compact = false, className, ...rest } = props;
  const classes = cn('btn', compact && 'btn--compact', className);

  if ('href' in rest && typeof rest.href === 'string') {
    const anchorRest = rest as Omit<AnchorProps, keyof BaseProps>;
    return (
      <a className={classes} {...anchorRest}>
        <span className="btn__label">{children}</span>
      </a>
    );
  }

  const buttonRest = rest as Omit<NativeButtonProps, keyof BaseProps>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      <span className="btn__label">{children}</span>
    </button>
  );
}
