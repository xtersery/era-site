import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './TextLink.css';

/** Literal direction: ↓ down the page · → across · ↗ external · ← back. */
export type LinkGlyph = 'down' | 'forward' | 'external' | 'back' | 'none';

const GLYPH: Record<LinkGlyph, string> = {
  down: '↓',
  forward: '→',
  external: '↗',
  back: '←',
  none: '',
};

interface BaseProps {
  readonly children: ReactNode;
  readonly glyph?: LinkGlyph;
  readonly className?: string;
  /** A link whose target the client has not supplied yet. Rendered inert and flagged. */
  readonly placeholder?: boolean;
}

type AnchorProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    readonly href: string;
  };

type NativeButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    readonly href?: undefined;
  };

export type TextLinkProps = AnchorProps | NativeButtonProps;

/**
 * The secondary CTA — mono text with a literal-direction glyph. Routing links
 * («Стоимость →», «Посмотреть кейсы →», «Открыть в картах ↗») are all this.
 */
export function TextLink(props: TextLinkProps) {
  const { children, glyph = 'forward', className, placeholder = false, ...rest } = props;
  const classes = cn('tlink', placeholder && 'tlink--placeholder', className);
  const content = (
    <>
      <span className="tlink__label">{children}</span>
      {glyph !== 'none' && (
        <span className="tlink__glyph" aria-hidden="true">
          {GLYPH[glyph]}
        </span>
      )}
    </>
  );

  if (placeholder) {
    return (
      <span className={classes} data-placeholder="link" title="[Ссылка будет добавлена клиентом]">
        {content}
      </span>
    );
  }

  if ('href' in rest && typeof rest.href === 'string') {
    const anchorRest = rest as Omit<AnchorProps, keyof BaseProps>;
    const external = glyph === 'external' && !anchorRest.href.startsWith('#');
    return (
      <a
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...anchorRest}
      >
        {content}
      </a>
    );
  }

  const buttonRest = rest as Omit<NativeButtonProps, keyof BaseProps>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {content}
    </button>
  );
}
