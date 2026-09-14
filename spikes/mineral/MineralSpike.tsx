import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ru } from '@/lib/utils/ru';

import { sitters } from '../portraits/people';
import { CINEMATIC_RHYTHM, createPassageController, type PassageController, type TransitionState } from './passageController';
import { PassageScene } from './scene/PassageScene';

/**
 * Spike E — THE PASSAGE: quartz → marble, as one material.
 *
 * One timeline t (0 → 1). It is not scrubbed by the scroll: when the section
 * fills the viewport, ONE intentional gesture (wheel, touch, keys) plays the
 * passage to its end while the document is held in place; then the page is
 * released and scrolls on into the next section. Scrolling back up at the
 * end plays it home the same way. `passageController.ts` is the single
 * source of truth; the scene only reads t. `?t=` freezes a moment; the
 * slider at the foot scrubs by hand (review only).
 */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };

function readParams() {
  const q = new URLSearchParams(location.search);
  const t = q.get('t');
  const d = q.get('d');
  return { t: t === null ? null : clamp(Number(t), 0, 1), hud: q.get('hud') !== '0', duration: d === null ? null : clamp(Number(d), 1, 30), ease: q.get('ease') };
}

export function MineralSpike() {
  const { t: frozen, hud, duration: durationParam, ease: easeParam } = useMemo(readParams, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const t = useRef(frozen ?? 0);
  const sectionRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const founderRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(frozen ?? 0);
  const [live, setLive] = useState(false);
  const controller = useRef<PassageController | null>(null);
  const [status, setStatus] = useState<TransitionState['status']>('idle');
  const sitter = sitters[3]!;

  /** paints the DOM for a moment of the timeline; the scene reads t itself */
  const paint = useCallback((v: number) => {
    t.current = v;
    // the sitting's words leave as the camera starts to move; the founder's arrive with the wall
    if (wordsRef.current) {
      const gone = smooth((v - 0.06) / 0.16);
      wordsRef.current.style.opacity = String(1 - gone);
      wordsRef.current.style.transform = `translate3d(0, ${(-14 * gone).toFixed(1)}px, 0)`;
    }
    if (founderRef.current) {
      const here = smooth((v - 0.88) / 0.1);
      founderRef.current.style.opacity = String(here);
      founderRef.current.style.transform = `translate3d(0, ${(12 * (1 - here)).toFixed(1)}px, 0)`;
    }
    setShown((prev) => (Math.abs(prev - v) < 0.004 ? prev : v));
  }, []);

  useEffect(() => { paint(t.current); }, [paint]);

  useEffect(() => {
    if (frozen !== null || !sectionRef.current) return;
    const c = createPassageController({
      section: sectionRef.current,
      apply: paint,
      initial: 0,
      threshold: 20,
      // the film's rhythm; `?d=` scales it (the phone plays it at 0.7)
      rhythm: (() => { const k = (durationParam ?? (phone ? 0.7 : 1)) * (durationParam !== null ? 1 / (CINEMATIC_RHYTHM.keys[CINEMATIC_RHYTHM.keys.length - 1]![0] + CINEMATIC_RHYTHM.hold) : 1); return { keys: CINEMATIC_RHYTHM.keys.map(([s, t]) => [s * k, t] as const), hold: CINEMATIC_RHYTHM.hold * k }; })(),
      returnEase: easeParam ?? 'power2.inOut',
      reduced,
      onChange: (st) => { setStatus(st.status); (window as unknown as Record<string, unknown>)['__transition'] = st; },
    });
    controller.current = c;
    return () => { c.destroy(); controller.current = null; };
  }, [frozen, reduced, phone, paint, durationParam, easeParam]);

  return (
    <>
      <section ref={sectionRef} className="passage" aria-label="Проход: кварц становится мрамором" data-live={live || undefined}>
        <PassageScene t={t} onReady={() => setLive(true)} />
        <div className="passage__ui">
          <div className="passage__label"><span>05 — Специалисты</span><span className="passage__count">05.4 / 04</span></div>
          <div ref={wordsRef} className="passage__words">
            <p className="passage__index">05.4</p>
            <h2 className="passage__name">{sitter.person.name}</h2>
            <p className="passage__role">{ru(sitter.person.role)}</p>
            <p className="passage__approach">{ru(sitter.approach)}</p>
          </div>
          <div ref={founderRef} className="passage__founder">
            <p className="passage__label-small">06 — Основатель</p>
            <p className="passage__founder-line">{ru('[Имя Фамилия] — основатель ЭРА. Комната на настоящей стене клиники.')}</p>
          </div>
        </div>
        {hud && (
          <div className="passage__hud">
            <label>
              <span>t {shown.toFixed(2)} · {phaseOf(shown)}{frozen === null ? ` · ${status}` : ''}</span>
              <input type="range" min={0} max={1} step={0.001} value={shown} onChange={(e) => { const v = Number(e.target.value); if (controller.current) controller.current.scrub(v); else paint(v); }} aria-label="Момент перехода" />
            </label>
          </div>
        )}
      </section>
      {frozen === null && <div className="passage__after" aria-hidden="true" />}
    </>
  );
}

function phaseOf(v: number): string {
  if (v < 0.12) return 'A · кварц';
  if (v < 0.44) return 'B · камера входит';
  if (v < 0.56) return 'C · внутри';
  if (v < 0.84) return 'D · становится камнем стены';
  return 'E · стена клиники';
}
