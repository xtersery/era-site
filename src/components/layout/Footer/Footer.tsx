import { TextLink } from '@/components/ui';
import { proposed } from '@/data/copy';

import './Footer.css';

/** Mono colophon under the last room. Every fact is the client's. */
export function Footer() {
  return (
    <footer className="footer room--dark">
      <div className="footer__inner u-shell t-meta">
        <p>
          <span className="footer__brand">эра</span> {proposed.brandMono} · © [год] ·{' '}
          <span data-placeholder="fact">[ООО «Название», лицензия № 00000]</span>
        </p>
        <p className="footer__links">
          <TextLink placeholder glyph="external">
            Политика обработки персональных данных
          </TextLink>
          <TextLink placeholder glyph="external">
            Правовая информация
          </TextLink>
        </p>
      </div>
    </footer>
  );
}
