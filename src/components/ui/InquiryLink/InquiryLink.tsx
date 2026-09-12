import type { MouseEvent, ReactNode } from 'react';

import { sectionAnchor } from '@/lib/constants/sections';
import { useInquiry, type InquiryPrefill } from '@/lib/inquiry';

import { Button } from '../Button/Button';
import { TextLink, type LinkGlyph } from '../TextLink/TextLink';

interface InquiryLinkProps extends InquiryPrefill {
  readonly children: ReactNode;
  /** `primary` renders the rectangle; `text` renders the mono link. */
  readonly variant?: 'primary' | 'text';
  readonly compact?: boolean;
  readonly glyph?: LinkGlyph;
  readonly className?: string;
}

/**
 * Any CTA that leads to the form. Sets the pre-fill, then lets the global anchor
 * handler (ScrollProvider) scroll to `#inquiry`. Without JS it is still an anchor.
 */
export function InquiryLink({
  children,
  procedure,
  specialist,
  variant = 'primary',
  compact = false,
  glyph = 'forward',
  className,
}: InquiryLinkProps) {
  const { setPrefill } = useInquiry();
  const href = sectionAnchor('inquiry');

  const onClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    const next: { procedure?: string; specialist?: string } = {};
    if (procedure) next.procedure = procedure;
    if (specialist) next.specialist = specialist;
    setPrefill(next);
  };

  if (variant === 'text') {
    return (
      <TextLink href={href} glyph={glyph} onClick={onClick} {...(className ? { className } : {})}>
        {children}
      </TextLink>
    );
  }

  return (
    <Button href={href} compact={compact} onClick={onClick} {...(className ? { className } : {})}>
      {children}
    </Button>
  );
}
