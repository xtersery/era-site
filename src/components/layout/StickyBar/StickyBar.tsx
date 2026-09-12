import { useEffect, useState } from 'react';

import { InquiryLink, TextLink } from '@/components/ui';
import { contact } from '@/data/contact';
import { cta } from '@/data/copy';
import { cn } from '@/lib/utils';

import './StickyBar.css';

/**
 * Phone-only sticky action bar: «Записаться» · «Позвонить» · «Telegram».
 * Hides while the inquiry form is on screen so it never covers the submit.
 */
export function StickyBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const form = document.getElementById('inquiry');
    if (!form) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(Boolean(entry?.isIntersecting)),
      { rootMargin: '0px 0px -40% 0px', threshold: 0 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Reserve room at the bottom of the page for the bar (phone only, via CSS var).
    document.documentElement.style.setProperty(
      '--body-padding-bottom',
      hidden ? '0px' : 'var(--stickybar-offset, 0px)',
    );
  }, [hidden]);

  return (
    <div className={cn('stickybar room--dark', hidden && 'is-hidden')} aria-hidden={hidden}>
      <InquiryLink className="stickybar__primary">{cta.book}</InquiryLink>
      <TextLink href={contact.phoneHref} glyph="none" className="stickybar__link">
        {cta.call}
      </TextLink>
      <TextLink
        href={contact.telegramHref}
        glyph="external"
        placeholder
        className="stickybar__link"
      >
        {cta.telegram}
      </TextLink>
    </div>
  );
}
