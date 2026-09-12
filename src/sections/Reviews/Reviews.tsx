import { useId, useState, type KeyboardEvent } from 'react';

import { Handoff, Room } from '@/components/common';
import { InquiryLink, TextLink } from '@/components/ui';
import { cta } from '@/data/copy';
import { reviews, reviewsPlatform } from '@/data/reviews';
import { services } from '@/data/services';
import { sectionIndex } from '@/lib/constants/sections';
import { cn, subIndex } from '@/lib/utils';
import type { SectionProps } from '@/types';

import './Reviews.css';

const categoryName = (categoryId: string) =>
  categoryId === 'consultation'
    ? 'консультация'
    : (services.find((s) => s.id === categoryId)?.name.toLowerCase() ?? categoryId);

/**
 * 07 — Отзывы. Dark. One quote at a time in the serif; a mono list of
 * reviewers shows the depth. No stars, no carousel, no autoplay. Every quote
 * is an attributable format example until verified reviews replace it.
 */
export function Reviews({ id, className }: SectionProps) {
  const [activeId, setActiveId] = useState(reviews[0]?.id ?? '');
  const baseId = useId();
  const index = sectionIndex(id);
  const i = reviews.findIndex((r) => r.id === activeId);
  const active = reviews[i] ?? reviews[0];

  const select = (n: number) => {
    const target = reviews[(n + reviews.length) % reviews.length];
    if (target) {
      setActiveId(target.id);
      document.getElementById(`${baseId}-tab-${target.id}`)?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(i + 1);
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      select(i - 1);
    }
  };

  if (!active) return null;

  return (
    <Room id={id} ground="dark" {...(className ? { className } : {})}>
      <h2 id={`${id}-heading`} className="sr-only">
        Отзывы
      </h2>

      <div className="reviews room__grid">
        <div
          className="reviews__list"
          role="tablist"
          aria-label="Авторы отзывов"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
        >
          {reviews.map((review, n) => {
            const selected = review.id === activeId;
            return (
              <button
                type="button"
                key={review.id}
                id={`${baseId}-tab-${review.id}`}
                role="tab"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={cn('reviews__tab t-meta', selected && 'is-selected')}
                onClick={() => setActiveId(review.id)}
              >
                <span className="reviews__tab-index">{subIndex(index, n + 1)}</span>
                <span className="reviews__tab-author" data-placeholder="fact">
                  {review.author}
                </span>
                <span className="reviews__tab-meta t-muted">
                  {review.date} · {categoryName(review.categoryId)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
          className="reviews__quote"
          tabIndex={0}
        >
          <blockquote className="reviews__blockquote" data-placeholder="copy">
            <p className="t-h3">«{active.quote}»</p>
          </blockquote>
          <p className="reviews__source t-meta t-muted" data-placeholder="fact">
            {active.source}
          </p>
          <p className="reviews__nav t-meta" aria-hidden="true">
            <button
              type="button"
              className="reviews__arrow"
              onClick={() => select(i - 1)}
              tabIndex={-1}
            >
              ← предыдущий
            </button>
            <span className="t-muted">
              {subIndex(index, i + 1)} / {subIndex(index, reviews.length)}
            </span>
            <button
              type="button"
              className="reviews__arrow"
              onClick={() => select(i + 1)}
              tabIndex={-1}
            >
              следующий →
            </button>
          </p>
        </div>
      </div>

      <Handoff className="reviews__handoff" primary={<InquiryLink>{cta.book}</InquiryLink>}>
        <TextLink placeholder glyph="external">
          {cta.allReviews(reviewsPlatform)}
        </TextLink>
      </Handoff>
    </Room>
  );
}
