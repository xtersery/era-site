import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NoToneMapping } from 'three';

import { ScrollProvider } from '@/animations/scroll';
import { Button } from '@/components/ui';
import { InquiryProvider } from '@/lib/inquiry';
import { attachPointer, resolveInitialTier, stage } from '@/lib/stage';
import { cn } from '@/lib/utils';
import { Hero } from '@/sections';
import { SceneCanvas } from '@/three/components/SceneCanvas';

import { HeroSet, type Placement, type SpikeMode } from './scene/HeroSet';
import type { GlassPath } from './scene/materials';

/**
 * Spike A — Hero refraction. URL parameters:
 *   path=A|B|C     material path (default A on high tier, C on mid)
 *   mode=hero|compare|diag
 *   tier=high|mid  override the resolved tier
 *   dpr=1.5        override device pixel ratio
 *   poster=1       still at rest (no pointer), for the reduced-motion poster
 *   hud=0          hide the HUD
 */
function readParams() {
  const q = new URLSearchParams(location.search);
  const tier =
    (q.get('tier') as 'high' | 'mid' | null) ?? (resolveInitialTier() === 'high' ? 'high' : 'mid');
  const path = (q.get('path') as GlassPath | null) ?? (tier === 'high' ? 'A' : 'C');
  const mode = (q.get('mode') as SpikeMode | null) ?? 'hero';
  const dpr = q.get('dpr') ? Number(q.get('dpr')) : tier === 'high' ? 1.5 : 1.25;
  const poster = q.get('poster') === '1';
  const hud = q.get('hud') !== '0';
  const plate = q.get('plate') === '1';
  const debug = {
    veil: q.get('veil') !== '0',
    plain: q.get('plain') === '1',
    noNormal: q.get('nm') === '0',
    noClearcoat: q.get('cc') === '0',
    noDispersion: q.get('disp') === '0',
    noPatch: q.get('patch') === '0',
    ...(q.get('att') ? { attenuation: Number(q.get('att')) } : {}),
  };
  return { tier, path, mode, dpr, poster, hud, plate, debug };
}

/** Official mark — DOM only, flat gold, never in the scene. Traced placeholder until the vector arrives. */
function MarkPlaceholder() {
  return (
    <a className="mark" href="#hero" aria-label="ЭРА cosmetology" data-placeholder="mark">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="29" fill="none" stroke="#cfaf72" strokeWidth="1.2" />
        <circle cx="32" cy="32" r="25.5" fill="none" stroke="#cfaf72" strokeWidth="0.8" />
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fontFamily="Inter Variable, Inter, sans-serif"
          fontSize="15"
          fontWeight="500"
          fill="#cfaf72"
          letterSpacing="1"
        >
          ЭРА
        </text>
      </svg>
      <span className="mark__text">ЭРА COSMETOLOGY</span>
    </a>
  );
}

const DEFAULT_PLACEMENT: Placement = { offsetX: 0.09, offsetY: 0.02, scale: 1.35 };
const PORTRAIT_URLS = [
  '/spikes/hero/assets/portrait-test.png',
  '/spikes/hero/assets/portrait-test.jpg',
];
const PLATE_URL = '/spikes/hero/assets/skin-plate.jpg';

/** The test portrait, if it has been delivered; otherwise the procedural plate. */
function usePortrait(forcePlate: boolean) {
  const [state, setState] = useState<{ url: string; placement: Placement } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (forcePlate) return { url: PLATE_URL, placement: DEFAULT_PLACEMENT };
      let found: string | null = null;
      for (const url of PORTRAIT_URLS) {
        const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
        if (head && head.ok && (head.headers.get('content-type') ?? '').startsWith('image/')) {
          found = url;
          break;
        }
      }
      let placement = DEFAULT_PLACEMENT;
      if (found) {
        const json = await fetch('/spikes/hero/assets/portrait-test.json').catch(() => null);
        if (json && json.ok && (json.headers.get('content-type') ?? '').includes('json')) {
          placement = { ...DEFAULT_PLACEMENT, ...((await json.json()) as Partial<Placement>) };
        }
      }
      // URL overrides for scripted tuning: ?ox=0.1&oy=-0.08&sc=2.2
      const q = new URLSearchParams(location.search);
      const num = (k: string) => (q.get(k) !== null ? Number(q.get(k)) : undefined);
      placement = {
        offsetX: num('ox') ?? placement.offsetX,
        offsetY: num('oy') ?? placement.offsetY,
        scale: num('sc') ?? placement.scale,
      };
      return { url: found ?? PLATE_URL, placement };
    };
    void resolve().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [forcePlate]);
  return state;
}

export function HeroSpike() {
  const params = useMemo(readParams, []);
  const [ready, setReady] = useState(false);
  const portrait = usePortrait(params.plate);
  const placementRef = useRef<Placement>(DEFAULT_PLACEMENT);
  const [placementView, setPlacementView] = useState<Placement>(DEFAULT_PLACEMENT);
  useEffect(() => {
    if (!portrait) return;
    placementRef.current = portrait.placement;
    setPlacementView(portrait.placement);
  }, [portrait]);

  // HUD nudging: arrows move the plate, +/- scale it, S copies the JSON for portrait-test.json.
  useEffect(() => {
    if (!params.hud) return;
    const onKey = (e: KeyboardEvent) => {
      const p = placementRef.current;
      const step = e.shiftKey ? 0.05 : 0.01;
      let next: Placement | null = null;
      if (e.key === 'ArrowLeft') next = { ...p, offsetX: p.offsetX - step };
      if (e.key === 'ArrowRight') next = { ...p, offsetX: p.offsetX + step };
      if (e.key === 'ArrowUp') next = { ...p, offsetY: p.offsetY + step };
      if (e.key === 'ArrowDown') next = { ...p, offsetY: p.offsetY - step };
      if (e.key === '+' || e.key === '=') next = { ...p, scale: p.scale + step * 2 };
      if (e.key === '-') next = { ...p, scale: Math.max(0.5, p.scale - step * 2) };
      if (e.key === 's' || e.key === 'S')
        void navigator.clipboard.writeText(JSON.stringify(p, null, 2));
      if (next) {
        e.preventDefault();
        placementRef.current = next;
        setPlacementView(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [params.hud]);
  const [wordmarkEl, setWordmarkEl] = useState<HTMLElement | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const word = hero?.querySelector<HTMLElement>('[data-stage-anchor="hero-wordmark"]') ?? null;
    setWordmarkEl(word);
    if (!hero || params.poster) return;
    return attachPointer(hero);
  }, [params.poster]);

  // Light FPS readout for the HUD (the real measurement runs from Playwright).
  useEffect(() => {
    if (!params.hud) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [params.hud]);

  // Expose state for QA scripts.
  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = { ...(w.__spike ?? {}), params, stage, ready, portrait: portrait?.url ?? null };
  }, [params, ready, portrait]);

  return (
    <div
      className={cn('spike', ready && 'is-stage-ready')}
      data-path={params.path}
      data-mode={params.mode}
    >
      <ScrollProvider>
        <InquiryProvider>
          <header className="header" style={{ mixBlendMode: 'normal', color: '#eae6dc' }}>
            <div className="header__inner u-shell">
              <MarkPlaceholder />
              <div className="header__cta" style={{ pointerEvents: 'auto' }}>
                <Button
                  href="#inquiry"
                  compact
                  style={{ background: '#cfaf72', color: '#0d0c0b', borderColor: '#cfaf72' }}
                >
                  Записаться
                </Button>
              </div>
            </div>
          </header>
          <main id="main">
            <Hero id="hero" />
            <section className="spacer room room--dark" aria-hidden="true" />
          </main>
        </InquiryProvider>
      </ScrollProvider>

      <div className="u-canvas-layer" data-stage-canvas aria-hidden="true">
        <SceneCanvas
          dpr={params.dpr}
          frameloop="always"
          gl={{
            preserveDrawingBuffer: true,
            antialias: false,
            alpha: true,
            toneMapping: NoToneMapping,
          }}
        >
          <Suspense fallback={null}>
            {portrait && (
              <HeroSet
                path={params.path}
                mode={params.mode}
                tier={params.tier}
                wordmarkEl={wordmarkEl}
                onReady={onReady}
                debug={params.debug}
                portraitUrl={portrait.url}
                placement={placementRef}
              />
            )}
          </Suspense>
        </SceneCanvas>
      </div>

      {params.mode === 'compare' && (
        <div className="compare-labels" aria-hidden="true">
          <span>A · true transmission</span>
          <span>B · hybrid physical + dispersion</span>
          <span>C · screen-space (FBO)</span>
        </div>
      )}

      {params.hud && (
        <div className="spike-hud" aria-hidden="true">
          <span>
            Spike A · path {params.path} · tier {params.tier} · dpr {params.dpr}
          </span>
          <span>
            fps {fps ?? '—'} · {ready ? 'stage ready' : 'loading'}
          </span>
          <span>
            {portrait?.url.includes('portrait-test')
              ? 'portrait: test asset'
              : 'portrait: procedural plate'}{' '}
            · x {placementView.offsetX.toFixed(2)} y {placementView.offsetY.toFixed(2)} s{' '}
            {placementView.scale.toFixed(2)} · arrows / +− / S
          </span>
          <span>
            <a href="?path=A">A</a> · <a href="?path=B">B</a> · <a href="?path=C">C</a> ·{' '}
            <a href="?mode=compare">compare</a> · <a href="?mode=diag&path=A">diag</a> ·{' '}
            <a href="?poster=1">poster</a>
          </span>
        </div>
      )}
    </div>
  );
}
