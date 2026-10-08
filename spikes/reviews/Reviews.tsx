import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { cta } from '@/data/copy';
import { sectionIndex } from '@/lib/constants/sections';
import { formatReviewDate, getReviews, REVIEWS_PLATFORM, type Review, type ReviewsProvider } from '@/lib/reviews';
import { ru } from '@/lib/utils/ru';

/**
 * 07 — Отзывы: a journal page of patients' voices on the forest ground.
 *
 * THE IDEA: not testimonials — one voice at a time, set large in the serif
 * as editorial text, with the four others waiting as a quiet index at the
 * right edge (01 … 05: the number, who, when, the first words). Choosing one
 * makes it the featured voice: a soft crossfade of the words, the champagne
 * line moving to its number. Nothing slides, nothing spins; the human words
 * are the only object. Rating, date and platform are always in the label —
 * the source is never hidden. No avatars: the platform's, if it gives one,
 * otherwise elegant initials.
 *
 * DATA: the room calls `getReviews()` (`src/lib/reviews`) and nothing else —
 * the provider and the selection rule live there. In the prototype the
 * records are samples and the room says so.
 *
 * SCROLL: none of the page's. The room is an ordinary section; the index is
 * buttons (a tablist, arrow keys move), the phone adds a horizontal swipe on
 * the featured voice. Reduced motion: the crossfade is a cut.
 */
const SOURCE_LABEL: Record<Review['source'], string> = {
  yandex: 'Яндекс Карты',
  '2gis': '2ГИС',
  manual: ru('Пример отзыва — [платформа]'),
};

/** «Анна М.» → «АМ»; «[Анна] М.» → «АМ» */
const initials = (author: string) =>
  author
    .replace(/[[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** the first words of a review, for the index */
const firstWords = (text: string, n = 7) => {
  const words = text.split(/\s+/);
  return words.length > n ? `${words.slice(0, n).join(' ')}…` : text;
};

function Rating({ rating }: { rating: number }) {
  return (
    <span className="rv__rating" role="img" aria-label={`Оценка ${rating} из 5`}>
      <span className="rv__ticks" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= rating || undefined} />)}
      </span>
      <span className="rv__rating-no" aria-hidden="true">{rating.toFixed(1).replace('.', ',')}</span>
    </span>
  );
}

/** one voice: its number, its words, who and when — the featured voice and its unseen sizers */
function VoiceBody({ voice, no }: { voice: Review; no: number }) {
  return (
    <>
      <p className="rv__no" aria-hidden="true">{String(no).padStart(2, '0')}</p>
      <blockquote className="rv__text" data-placeholder={voice.isPlaceholder ? 'copy' : undefined}>
        <p>{voice.text}</p>
      </blockquote>
      <footer className="rv__meta">
        <span className="rv__who">
          {voice.avatarUrl
            ? <img className="rv__avatar" src={voice.avatarUrl} alt="" />
            : <span className="rv__initials" aria-hidden="true">{initials(voice.author)}</span>}
          <span className="rv__author" data-placeholder={voice.isPlaceholder ? 'fact' : undefined}>{voice.author}</span>
        </span>
        <Rating rating={voice.rating} />
        <time className="rv__date" dateTime={voice.date}>{formatReviewDate(voice.date)}</time>
        <span className="rv__source">
          {voice.sourceUrl ? <a href={voice.sourceUrl} rel="noopener noreferrer" target="_blank">{SOURCE_LABEL[voice.source]} ↗</a> : SOURCE_LABEL[voice.source]}
        </span>
      </footer>
    </>
  );
}

export function Reviews() {
  const index = sectionIndex('reviews');
  const baseId = useId();
  const [state, setState] = useState<{ reviews: Review[]; provider: ReviewsProvider['id'] } | null>(null);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0); // the voice on the page (lags `active` by the crossfade)
  const [fading, setFading] = useState(false);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    getReviews().then((r) => { if (alive) setState(r); });
    return () => { alive = false; };
  }, []);

  // the crossfade: the words go, the next words come — 0.4 s each way; a cut under reduced motion
  useEffect(() => {
    if (active === shown) return;
    if (reduced) { setShown(active); return; }
    setFading(true);
    const t = window.setTimeout(() => { setShown(active); setFading(false); }, 380);
    return () => window.clearTimeout(t);
  }, [active, shown, reduced]);

  const reviews = state?.reviews ?? [];
  const n = reviews.length;
  const select = useCallback((i: number, focus = false) => {
    if (!n) return;
    const next = ((i % n) + n) % n;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  }, [n]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select(active + 1, true); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select(active - 1, true); }
    if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
  };

  // the phone: a horizontal swipe on the voice turns the page; vertical scroll is untouched
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => { if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) select(active + (dx < 0 ? 1 : -1));
  };

  const voice = reviews[shown];
  const sample = state?.provider === 'local';

  return (
    <section className="rv" id="reviews" aria-labelledby="reviews-title" data-sample={sample || undefined}>
      <div className="rv__grain" aria-hidden="true" />

      <header className="rv__intro">
        <p className="rv__label"><span>{index} — Отзывы</span>{sample && <span className="rv__sample" data-placeholder="copy">{ru('примеры — заменить на опубликованные')}</span>}</p>
        <h2 id="reviews-title" className="rv__title" data-placeholder="copy">{ru('Ваши отзывы.')}</h2>
        <p className="rv__lede" data-placeholder="copy">{ru('Опыт пациенток — лучшее продолжение нашей философии.')}</p>
      </header>

      {voice && (
        <div className="rv__stage">
          {/*
            the featured voice, over every voice laid out unseen in the same cell:
            the frame is as tall as the longest voice, so turning the page never
            changes the page's height — which would re-measure every pin on it
            (a full ScrollTrigger refresh) under the visitor's scroll
          */}
          <div className="rv__frame">
          <article
            className="rv__voice"
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            data-fading={fading || undefined}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { swipe.current = null; }}
          >
            <VoiceBody voice={voice} no={shown + 1} />
          </article>
          {reviews.map((r, i) => (
            <div key={r.id} className="rv__voice rv__voice--ghost" aria-hidden="true" inert>
              <VoiceBody voice={r} no={i + 1} />
            </div>
          ))}
          </div>

          {/* the index: the other voices, waiting */}
          <div className="rv__index" role="tablist" aria-label="Отзывы" aria-orientation="vertical" onKeyDown={onKey}>
            {reviews.map((r, i) => (
              <button
                key={r.id}
                ref={(el) => { tabs.current[i] = el; }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${i}`}
                aria-selected={i === active}
                aria-controls={`${baseId}-panel`}
                tabIndex={i === active ? 0 : -1}
                className="rv__tab"
                onClick={() => select(i)}
                onMouseEnter={() => select(i)}
              >
                <span className="rv__tab-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="rv__tab-body">
                  <span className="rv__tab-who">{r.author} · <time dateTime={r.date}>{formatReviewDate(r.date)}</time></span>
                  <span className="rv__tab-words">{firstWords(r.text)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="rv__foot">
        <p className="rv__trust" data-placeholder={sample ? 'fact' : undefined}>
          {sample ? ru(`[Отзывы опубликованы пациентками на ${REVIEWS_PLATFORM.namePrepositional}]`) : ru(`Отзывы опубликованы пациентками на ${REVIEWS_PLATFORM.namePrepositional}`)}
        </p>
        <a
          className="rv__all"
          href={REVIEWS_PLATFORM.profileUrl || '#reviews'}
          {...(REVIEWS_PLATFORM.profileUrl ? { target: '_blank', rel: 'noopener noreferrer' } : { 'aria-disabled': true, 'data-placeholder': 'fact' })}
        >
          {cta.allReviews(REVIEWS_PLATFORM.namePrepositional)} ↗
        </a>
      </footer>

      <p className="sr-only" aria-live="polite">{voice ? `Отзыв ${shown + 1} из ${n} — ${voice.author}` : ''}</p>
    </section>
  );
}
