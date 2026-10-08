import { cta } from '@/data/copy';
import { subIndex } from '@/lib/utils';

import { founderCopy } from './copy';

/**
 * The long read under the opening: her biography in chapters, then her
 * philosophy as the room's last thought, then the handoff. Ordinary document
 * flow — the page scrolls it; nothing here is pinned, staged or scrolled
 * inside itself. Each chapter: a mono marker (the calibration), one editorial
 * anchor (a year, a place, a subject — a label of the text, never a new fact)
 * and her text word for word.
 */
export function Biography({ index }: { index: string }) {
  const { record, philosophyMarker, secondary } = founderCopy;
  const { chapters, philosophy } = record;
  return (
    <>
      {chapters.map((c, i) => (
        <section key={c.id} className="founder__chapter" aria-labelledby={`founder-${c.id}`}>
          <h3 id={`founder-${c.id}`} className="founder__marker">
            <span className="founder__marker-no">{subIndex(index, i + 1)}</span>
            {c.marker}
          </h3>
          <p className="founder__anchor">{c.anchor}</p>
          <p className="founder__text">{c.text}</p>
        </section>
      ))}

      <section className="founder__chapter founder__philosophy" aria-labelledby="founder-philosophy">
        <h3 id="founder-philosophy" className="founder__marker">
          <span className="founder__marker-no">{subIndex(index, chapters.length + 1)}</span>
          {philosophyMarker}
        </h3>
        <p className="founder__text">{philosophy.lead}</p>
        <blockquote className="founder__quote">
          <p>
            «{philosophy.quote[0]}{' '}
            <span className="founder__quote-close">{philosophy.quote[1]}»</span>
          </p>
        </blockquote>
      </section>

      <div className="founder__cta">
        <a className="founder__primary" href="#inquiry">{cta.bookConsultation}</a>
        <a className="founder__link" href="#reviews">{secondary}</a>
      </div>
    </>
  );
}
