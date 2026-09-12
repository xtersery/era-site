import { cn } from '@/lib/utils';

import './Placeholder.css';

export type PlaceholderKind = 'image' | 'portrait' | 'map' | 'lens' | 'video';

interface PlaceholderProps {
  /** Russian description of the asset that will live here. */
  readonly label: string;
  readonly kind?: PlaceholderKind;
  /** CSS aspect-ratio, e.g. "4 / 5". Omit to fill the parent. */
  readonly ratio?: string;
  readonly className?: string;
}

const KIND_LABEL: Record<PlaceholderKind, string> = {
  image: 'Изображение',
  portrait: 'Портрет',
  map: 'Карта',
  lens: 'Линза · WebGL',
  video: 'Видео',
};

/**
 * A labelled frame where an asset will be. Never an unlabelled grey box — the
 * label names the asset class so the prototype cannot be mistaken for design,
 * and `data-placeholder` lets the launch gate find every one of them.
 */
export function Placeholder({ label, kind = 'image', ratio, className }: PlaceholderProps) {
  return (
    <figure
      className={cn('ph', `ph--${kind}`, className)}
      data-placeholder={kind}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <figcaption className="ph__caption t-meta">
        <span className="ph__kind">{KIND_LABEL[kind]}</span>
        <span className="ph__label">{label}</span>
      </figcaption>
    </figure>
  );
}
