import React, { Suspense, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NoToneMapping } from 'three';

import { gsap, registerGsap, ScrollTrigger, useGSAP } from '@/animations/gsap';
import { ScrollContext, ScrollProvider } from '@/animations/scroll';
import { TextLink } from '@/components/ui';
import { cta } from '@/data/copy';
import { usePrefersReducedMotion, useVisualTier } from '@/hooks';
import { sectionAnchor, sectionIndex } from '@/lib/constants/sections';
import { isDev } from '@/lib/env';
import { InquiryProvider } from '@/lib/inquiry';
import { attachPointer, initTier, isLiveTier, stage } from '@/lib/stage';
import { damp } from '@/lib/utils';
import { ru } from '@/lib/utils/ru';
import { SceneCanvas } from '@/three/components/SceneCanvas';
import { hasWebGL } from '@/three/utils/webgl';

import emblemPhoneUrl from './assets/emblem@phone.webp';
import emblemUrl from './assets/emblem.webp';
import markUrl from './assets/era-mark-ink.png';
import onyxPhoneUrl from './assets/onyx-tiles@phone.jpg';
import onyxUrl from './assets/onyx-tiles.jpg';
import { GlassButton } from './GlassButton';
import { HeroHeader } from './HeroHeader';
import { Manifesto } from './Manifesto';
import { ServicesRadial } from '../radial/RadialSpike';
import { ManifestoGround } from './ManifestoGround';
import { GatewayHud } from './passage/GatewayHud';
import {
  createPassageGateway,
  DESCENT_RHYTHM,
  type GatewayState,
  type PassageGateway,
  type Rhythm,
  wantsGatewayHud,
} from './passage/passageGateway';
import { PassageScene, type EmblemBox } from './passage/PassageScene';

registerGsap();
// The visual tier decides the scroller: Lenis on `high`/`mid`, native otherwise
// (src/animations/scroll/ScrollProvider.tsx). Resolved once, before render.
initTier();
// dev probe for the QA scripts (`window.__ST`), as the flow page has
if (isDev) Object.assign(window as unknown as Record<string, unknown>, { __ST: ScrollTrigger, __gsap: gsap });

/** t at which the film's canvas is opaque and the document may change rests. */
const COVER = 0.12;

/** The film, scaled: the whole clock at `k` — shorter on the lean tier and on the phone. */
const scaled = (r: Rhythm, k: number): Rhythm => ({
  keys: r.keys.map(([s, t]) => [s * k, t] as const),
  hold: r.hold * k,
});

/* The official mark in the header — flat graphite on the light stone. The emblem's alpha masks its light. */
const pageStyle = {
  '--hs-mark': `url(${markUrl})`,
  '--hs-emblem': `url(${emblemUrl})`,
} as React.CSSProperties;

/**
 * 00 — Главная, after docs/references/hero-ref.png.
 *
 * The illuminated onyx (`stone.png`, as it is) is the field. The brand object —
 * the 3D emblem `era-logo_3.png`, gold and green glass — stands a little left of
 * centre as a physical thing under light: it drifts a few pixels with the
 * pointer and a highlight travels over its metal and glass, nothing rotates.
 * Copy on the right, two small tracked lines at the bottom corners. No people.
 */
export function HeroStoneSpike() {
  return (
    <InquiryProvider>
      <ScrollProvider>
        <HeroStage />
      </ScrollProvider>
    </InquiryProvider>
  );
}

/**
 * The stage, composable: `services` is what stands in the `.sv-frame` after the
 * manifesto (the approved Услуги by default; the full page passes its own,
 * driven instance) and `onPassage` hears the descent's t (the full page fades
 * its own bar in with it). Nothing about the hero, the film or the manifesto
 * changes with these.
 */
export function HeroStage({
  services,
  onPassage,
}: {
  services?: ReactNode;
  onPassage?: (t: number) => void;
} = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const tier = useVisualTier();
  const scrollRef = useContext(ScrollContext);
  const webgl = hasWebGL();
  /* The film samples the picture the page shows: the `@phone` art below 1024 px
     (the same media as the <picture> sources) — a quarter of the texture memory
     of the desktop pair on a phone's GPU. Desktop: unchanged. */
  const phoneArt = useMemo(() => window.matchMedia('(max-width: 1023px)').matches, []);
  /* The passage plays only when it can be a film: motion allowed, WebGL present,
     a live tier. Otherwise the manifesto is a still room after the hero. */
  const passage = webgl && !reducedMotion && isLiveTier(tier);
  const sectionRef = useRef<HTMLElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const emblemBox = useRef<EmblemBox>({ x: 0, y: 0, size: 1, dx: 0, dy: 0 });
  const frame = useRef<() => void>(() => {});
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const gateway = useRef<PassageGateway | null>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const [hud, setHud] = useState<GatewayState | null>(null);
  const wantsHud = wantsGatewayHud();

  // The object under light: pointer → a damped drift (≤ 10 px), a tilt (≤ 1.5°)
  // and the highlight's position on the material. The section is the grip.
  useEffect(() => {
    const section = sectionRef.current;
    const emblem = emblemRef.current;
    if (!section || !emblem || reducedMotion) return;
    const detach = attachPointer(section);
    const s = { x: 0, y: 0, lx: 0.38, ly: 0.28 };
    const w = { px: '', py: '', lx: '', ly: '' };
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = stage.pointer;
      // The pointer keeps the object alive while the hero is at rest; once the
      // passage has begun the object settles and the canvas takes it over.
      const live = p.active && progress.current === 0;
      const tx = live ? p.nx : 0;
      const ty = live ? p.ny : 0;
      s.x = damp(s.x, tx, 0.02, dt);
      s.y = damp(s.y, ty, 0.02, dt);
      // The highlight moves opposite the tilt, as a light would across a turned surface.
      s.lx = damp(s.lx, 0.38 + (live ? p.nx * 0.22 : 0), 0.02, dt);
      s.ly = damp(s.ly, 0.28 + (live ? -p.ny * 0.22 : 0), 0.02, dt);
      // written only on change: at rest the damping converges and the loop
      // costs nothing but its own call
      const px = s.x.toFixed(4);
      const py = s.y.toFixed(4);
      const lx = `${(s.lx * 100).toFixed(2)}%`;
      const ly = `${(s.ly * 100).toFixed(2)}%`;
      if (px !== w.px) emblem.style.setProperty('--px', (w.px = px));
      if (py !== w.py) emblem.style.setProperty('--py', (w.py = py));
      if (lx !== w.lx) emblem.style.setProperty('--lx', (w.lx = lx));
      if (ly !== w.ly) emblem.style.setProperty('--ly', (w.ly = ly));
      // The canvas's emblem follows the same drift (see .hs__emblem's transform).
      emblemBox.current.dx = s.x * 10;
      emblemBox.current.dy = s.y * -8;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      detach();
    };
  }, [reducedMotion]);

  // The passage. ScrollTrigger only PINS the stage for one viewport — the pin's
  // start and end are the two rests, and its progress is a fallback (a dragged
  // scrollbar). The timeline is paused: the gateway writes its progress, and
  // the scene reads the same number on its frame. One writer at a time.
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !passage) return;
      const measure = () => {
        const s = section.getBoundingClientRect();
        const e = emblemRef.current?.getBoundingClientRect();
        if (!e) return;
        const box = emblemBox.current;
        // The rect includes the drift; the box is the resting centre.
        box.x = e.left - s.left + e.width / 2 - box.dx;
        box.y = e.top - s.top + e.height / 2 - box.dy;
        box.size = e.width;
      };
      measure();

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      // 0..1 of the timeline == 0..1 of the passage.
      tl.to([uiRef.current, '.hh'], { autoAlpha: 0, duration: 0.1 }, 0)
        // A · the canvas takes over from the DOM with the identical frame
        // (opacity, not autoAlpha: the layer keeps its compositor surface at 0 — see .hs__passage)
        .to(passageRef.current, { opacity: 1, duration: 0.09 }, 0.02)
        // under the opaque cover: the manifesto's ground is put beneath the film
        .to('.mf-ground', { autoAlpha: 1, duration: 0.005 }, COVER - 0.005)
        // B–E · the ground settles — its own, slower velocity in the descent
        .fromTo(
          '.mf-ground',
          { scale: 1.06, yPercent: 3.5 },
          { scale: 1, yPercent: 0, duration: 1 - COVER, ease: 'power2.out' },
          COVER,
        )
        // D · the manifesto arrives — the label and the eyebrow first, then the
        // three large voices rise into the field one by one (clip + rise), the
        // ginkgo settles in from the right edge, the drapery rises a beat later,
        // the note and the aside last. Opacity and a few px only: no fly-in, no zoom.
        .fromTo(
          ['.mf__label', '.mf__line--eyebrow'],
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.02, ease: 'power1.out' },
          0.6,
        )
        .fromTo(
          '.mf__line:not(.mf__line--eyebrow)',
          { clipPath: 'inset(115% 0 -0.12em 0)', yPercent: 24 },
          {
            clipPath: 'inset(-0.18em 0 -0.12em 0)',
            yPercent: 0,
            duration: 0.16,
            stagger: 0.04,
            ease: 'power2.out',
          },
          0.66,
        )
        .fromTo(
          '.mf__obj--ginkgo',
          { autoAlpha: 0, x: 28, y: -14 },
          { autoAlpha: 1, x: 0, y: 0, duration: 0.2, ease: 'power2.out' },
          0.72,
        )
        .fromTo(
          '.mf__obj--drape',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' },
          0.78,
        )
        .fromTo(
          ['.mf__text', '.mf__aside'],
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.03, ease: 'power1.out' },
          0.86,
        )
        // E · whatever light the film still holds goes
        .to(passageRef.current, { opacity: 0, duration: 0.06 }, 0.94);
      timeline.current = tl;

      // The canvas draws only while its layer can be seen (opacity > 0: t in
      // (0.02, 1)). A frame drawn into a layer the compositor is not showing
      // is GPU work nobody schedules; the first shown frame then waits for all
      // of it — measured as a 50–85 ms hitch at t 0.02 on every play but the
      // first. The layer at 0 holds its last frame, which is nothing by 0.94.
      const seen = (t: number) => t > 0.015 && t < 1;
      const draw = () => {
        if (seen(progress.current)) frame.current();
      };
      const apply = (t: number) => {
        progress.current = t;
        tl.progress(t);
        draw();
        onPassage?.(t);
      };

      const pin = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=100%',
        pin: true,
        anticipatePin: 1,
        onRefresh: () => {
          measure();
          // the canvas draws only when asked: after a re-measure, once more
          draw();
          gateway.current?.realign();
        },
        onUpdate: (self) => gateway.current?.sync(self.progress),
      });

      const phone = window.innerWidth < 1024;
      let hudShown = { status: '', at: 0 };
      const gw = createPassageGateway({
        scroller: () => scrollRef?.current ?? null,
        bounds: () => ({ start: pin.start, end: pin.end }),
        apply,
        cover: COVER,
        // the lean tier and the phone play the same film, shorter
        rhythm: scaled(DESCENT_RHYTHM, phone ? 0.6 : tier === 'mid' ? 0.85 : 1),
        anchor: 'manifesto',
        onChange: (st) => {
          // the readout is React state, so it follows the status and samples
          // the progress ten times a second — not on every write of t
          if (wantsHud && (st.status !== hudShown.status || performance.now() - hudShown.at > 100)) {
            hudShown = { status: st.status, at: performance.now() };
            setHud(st);
          }
          // Dev-only handle for the QA scripts (`window.__transition`). Never shipped.
          if (isDev) (window as Window & { __transition?: GatewayState }).__transition = st;
        },
      });
      gateway.current = gw;
      apply(pin.progress);
      gw.settle();

      // Манифест → Услуги is a normal page scroll. One light trigger over the
      // viewport between the two — no pin, no scrub of a timeline, nothing that
      // touches the scroll position — interpolates a little: the manifesto's
      // ground lags the page a touch, its words soften as they leave, and Услуги
      // arrives 40 px up with its opacity settling. Услуги's own pin takes over
      // where the trigger ends (its start), by then every value is at rest and
      // the frame carries no transform, so the pin's containing block is untouched.
      const svFrame = servicesRef.current!;
      const words = wordsRef.current!;
      const ground = groundRef.current!;
      // On the phone the seam veils carry the whole way from the forest to
      // Услуги (the manifesto's tail is one tone, `.mf__foot`), and both live
      // inside these two layers: fading either let the wall and the page's
      // bone through the veils as a step at the meeting line, and moving
      // either opened a gap the head veil had to cover with a solid overlap —
      // which lay over the manifesto's last line. The phone keeps the two
      // layers still; the ground's lag stays.
      const phoneSeam = window.matchMedia('(max-width: 1023px)');
      const flow = (p: number) => {
        const moves = !phoneSeam.matches;
        const e = p * p * (3 - 2 * p);
        // the frame: 40 px → 0, 0.9 → 1 — inside the window only. Outside it
        // (below the viewport, or at rest) the frame carries no transform at
        // all: below the viewport the offset is invisible anyway, and a
        // trigger created or measured then (a composing page's rooms after
        // Услуги) sees the true layout.
        const inWindow = moves && p > 0 && p < 1;
        svFrame.style.transform = inWindow ? `translate3d(0, ${(40 * (1 - e)).toFixed(2)}px, 0)` : '';
        svFrame.style.opacity = inWindow ? (0.9 + 0.1 * e).toFixed(3) : '';
        // the manifesto: the words soften and drift a touch ahead of the page,
        // the ground lags it — a shallow parallax
        words.style.opacity = moves ? (1 - 0.15 * e).toFixed(3) : '';
        words.style.transform = moves ? `translate3d(0, ${(-24 * e).toFixed(2)}px, 0)` : '';
        gsap.set(ground, { y: 36 * e });
      };
      const flowTrigger = ScrollTrigger.create({
        trigger: svFrame,
        start: 'top bottom',
        end: 'top top',
        onUpdate: (self) => flow(self.progress),
      });
      // Measured with the frame at rest — for EVERY trigger, not only this one.
      // A per-trigger `onRefreshInit` / `onRefresh` pair fires around its OWN
      // recalculation only: Услуги's pin (created earlier) would be measured
      // with the 40 px entrance still applied, and anything created after this
      // trigger (a composing page's rooms) with it re-applied. The global
      // events bracket the whole pass: cleared before any trigger measures,
      // restored after the last one has.
      const atRest = () => flow(1);
      const restored = () => flow(flowTrigger.progress);
      ScrollTrigger.addEventListener('refreshInit', atRest);
      ScrollTrigger.addEventListener('refresh', restored);
      flow(flowTrigger.progress);

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', atRest);
        ScrollTrigger.removeEventListener('refresh', restored);
        flowTrigger.kill();
        svFrame.style.transform = '';
        svFrame.style.opacity = '';
        words.style.opacity = '';
        words.style.transform = '';
        gw.destroy();
        gateway.current = null;
        pin.kill();
        tl.kill();
        timeline.current = null;
      };
    },
    { scope: sectionRef, dependencies: [passage, tier, wantsHud, onPassage] },
  );

  // Without the film the manifesto is a still room: the same order of arrival
  // (label + eyebrow → the three voices → ginkgo → drapery → note and aside), played
  // once as the room comes into view. Reduced motion: nothing runs — the room
  // is simply there, in its final state.
  useGSAP(
    () => {
      if (passage || reducedMotion || !roomRef.current) return;
      gsap
        .timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: { trigger: roomRef.current, start: 'top 70%', once: true },
        })
        .from(['.mf__label', '.mf__line--eyebrow'], { autoAlpha: 0, y: 10, duration: 0.6, stagger: 0.08 })
        .from(
          '.mf__line:not(.mf__line--eyebrow)',
          { clipPath: 'inset(115% 0 -0.12em 0)', yPercent: 24, duration: 0.9, stagger: 0.14 },
          0.25,
        )
        .from('.mf__obj--ginkgo', { autoAlpha: 0, x: 28, y: -14, duration: 1.2 }, 0.55)
        .from('.mf__obj--drape', { autoAlpha: 0, y: 18, duration: 1.1 }, 0.85)
        .from(['.mf__text', '.mf__aside'], { autoAlpha: 0, y: 12, duration: 0.7, stagger: 0.1 }, 1.15);
    },
    { scope: roomRef, dependencies: [passage, reducedMotion] },
  );

  // Манифест → Услуги, the seam (14.10). The forest room and the bone room
  // meet through ONE tone both sides are painted from — the site's seam
  // language (`spikes/flow/`): a veil at the foot of the manifesto and a veil
  // over the head of Услуги, both in a tone that goes forest → bone across the
  // window between them (Услуги's top from the viewport's foot to its top). At
  // the meeting line the two veils are the same colour, so there is never a
  // step. At either rest the veils paint nothing: the manifesto at rest and
  // Услуги pinned are exactly as approved. Scrubbed, position-linked, no
  // autonomous tween — so it is the same under reduced motion and without
  // the film, and exactly reversible.
  useGSAP(() => {
    const frame = servicesRef.current;
    if (!frame) return;
    const veils = [
      ...document.querySelectorAll<HTMLElement>('.mf__foot'),
      ...frame.querySelectorAll<HTMLElement>(':scope > .sv-seam'),
    ];
    if (!veils.length) return;
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    // the tone stays forest while the manifesto fills the screen, and turns to bone as Услуги takes it
    tl.fromTo(veils, { '--seam-k': 0 }, { '--seam-k': 1, duration: 0.9, ease: 'power2.in' }, 0.1)
      // the foot veil is on within the first fifth of the window
      .fromTo(veils, { '--seam-foot': 0 }, { '--seam-foot': 1, duration: 0.2 }, 0)
      // the head veil lifts over the last fifth, so Услуги pins clear
      .fromTo(veils, { '--seam-head': 1 }, { '--seam-head': 0, duration: 0.2 }, 0.8);
    const st = ScrollTrigger.create({
      trigger: frame,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      animation: tl,
    });
    return () => {
      st.kill();
      tl.kill();
      gsap.set(veils, { clearProps: '--seam-k,--seam-foot,--seam-head' });
    };
  }, { dependencies: [passage] });

  return (
    <main className="hs-page" style={pageStyle}>
      <section
        id="hero"
        ref={sectionRef}
        className="hs room room--light"
        aria-labelledby="hero-heading"
        tabIndex={-1}
      >
        <picture className="hs__field" aria-hidden="true">
          <source media="(max-width: 1023px)" srcSet={onyxPhoneUrl} />
          <img src={onyxUrl} alt="" decoding="async" fetchPriority="high" />
        </picture>

        <HeroHeader />

        {/* The brand object. */}
        <div ref={emblemRef} className="hs__emblem" aria-hidden="true">
          <picture>
            <source media="(max-width: 1023px)" srcSet={emblemPhoneUrl} />
            <img src={emblemUrl} alt="" decoding="async" fetchPriority="high" />
          </picture>
          <div className="hs__emblem-light" />
        </div>

        <div ref={uiRef} className="hs__ui u-shell">
          <div className="hs__copy">
            <p className="hs__eyebrow" data-placeholder="copy">
              {ru('Эстетическая косметология')}
            </p>
            <h1 id="hero-heading" className="hs__headline t-h2" data-placeholder="copy">
              {ru('Тонкая работа')}
              <br />
              {ru('с красотой')}
            </h1>
            <p className="hs__support t-lg" data-placeholder="copy">
              {ru('Индивидуальный подход. Естественные результаты. Забота, которая остаётся.')}
            </p>
            <div className="hs__cta">
              <GlassButton href={sectionAnchor('inquiry')} arrow>
                {cta.bookConsultation}
              </GlassButton>
            </div>
          </div>

          <p className="hs__corner hs__corner--left" data-placeholder="copy">
            {ru('Забота сегодня. Красота завтра.')}
          </p>
          <p className="hs__corner hs__corner--right">
            <span data-placeholder="copy">{ru('Наука — Гармония — Результат')}</span>
            <span className="hs__corner-index">{sectionIndex('hero')}</span>
          </p>
          <TextLink href={sectionAnchor('services')} glyph="down" className="hs__more">
            {cta.seeServices}
          </TextLink>
        </div>

        {passage && (
          <>
            {/* The manifesto's ground, beneath the film; the film uncovers it. */}
            <ManifestoGround ref={groundRef} />
            {/* The passage: one full-screen alpha layer, hidden until the gesture; drawn only on the tick that writes t. */}
            <div ref={passageRef} className="hs__passage" aria-hidden="true">
              <SceneCanvas
                dpr={[1, 1.5]}
                frameloop="never"
                data-scene="film"
                data-frameloop="advance"
                gl={{ antialias: false, alpha: true, toneMapping: NoToneMapping }}
              >
                <Suspense fallback={null}>
                  <PassageScene
                    onyxUrl={phoneArt ? onyxPhoneUrl : onyxUrl}
                    emblemUrl={phoneArt ? emblemPhoneUrl : emblemUrl}
                    progress={progress}
                    emblem={emblemBox}
                    quality={tier === 'high' ? 1 : 0}
                    frameRef={frame}
                  />
                </Suspense>
              </SceneCanvas>
            </div>
            {/* 01 — Манифест arrives inside the pinned stage, over the ground. */}
            <Manifesto ref={wordsRef} asLayer />
          </>
        )}
      </section>

      {/* Without the film, the manifesto is a still room after the hero. */}
      {!passage && (
        <section ref={roomRef} className="mf-room" aria-labelledby="manifesto-heading">
          <ManifestoGround />
          <Manifesto />
        </section>
      )}

      {/* 02 — Услуги: the approved section as it is; the page scrolls into it. */}
      <div ref={servicesRef} className="sv-frame">
        {services ?? <ServicesRadial />}
        {/* the seam: the head of Услуги, painted from the manifesto's tone (see the seam above) */}
        <div className="sv-seam" aria-hidden="true" />
      </div>

      {wantsHud && (
        <div className="gw-huds">
          <GatewayHud title="HERO → MANIFEST" state={hud} tier={tier} />
        </div>
      )}
    </main>
  );
}
