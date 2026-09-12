import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { NoToneMapping } from 'three';

import { Handoff, StageGrip } from '@/components/common';
import { Button, TextLink, WallLabel } from '@/components/ui';
import { cta } from '@/data/copy';
import { services } from '@/data/services';
import { resolveInitialTier, stage } from '@/lib/stage';
import { cn, subIndex } from '@/lib/utils';
import { SceneCanvas } from '@/three/components/SceneCanvas';

import { CssWheel } from './CssWheel';
import { WheelSet, type CameraPreset } from './scene/WheelSet';
import { createWheelMotion, STEP_DEG, type WheelMotion } from './wheelMotion';

/**
 * Spike B — Services optical wheel. URL parameters:
 *   cam=top|eye|arc|stack   camera preset (arc / stack are the phone interpretations)
 *   vein=0                  no vein normal map
 *   bm=0                    no book-match mirroring
 *   css=1                   CSS 3D fallback drum instead of WebGL
 *   tier=high|mid           dpr default by tier
 *   hud=0                   hide HUD
 */
function readParams() {
  const q = new URLSearchParams(location.search);
  const tier = (q.get('tier') as 'high' | 'mid' | null) ?? (resolveInitialTier() === 'high' ? 'high' : 'mid');
  return {
    cam: (q.get('cam') as CameraPreset | null) ?? 'top',
    vein: q.get('vein') !== '0',
    bookMatch: q.get('bm') !== '0',
    css: q.get('css') === '1',
    tier,
    dpr: q.get('dpr') ? Number(q.get('dpr')) : tier === 'high' ? 1.5 : 1.25,
    hud: q.get('hud') !== '0',
  };
}

export function WheelSpike() {
  const params = useMemo(readParams, []);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [ringPos, setRingPos] = useState({ x: 0, y: 0, scale: 0.62 });
  const baseId = useId();
  const gripRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<WheelMotion | null>(null);
  const lat = useRef({ clickAt: 0, firstAngleAt: 0, selectLatencyMs: 0, dragMoveAt: 0, dragLatencyMs: 0 });

  const onReady = useCallback(() => setReady(true), []);

  // Ring x from the DOM anchor: approximate world width at the camera distance.
  useEffect(() => {
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      const cy = -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1);
      const dist = params.cam === 'top' ? 6.05 : params.cam === 'eye' ? 5.63 : params.cam === 'arc' ? 3.64 : 4.75;
      const fov = params.cam === 'top' || params.cam === 'eye' ? 34 : params.cam === 'arc' ? 44 : 40;
      const h = 2 * dist * Math.tan((fov * Math.PI) / 360);
      const w = h * (window.innerWidth / window.innerHeight);
      const desktop = window.innerWidth >= 1024;
      // Ring diameter ≈ the anchor width (desktop) or the viewport width (phone presets).
      const anchorW = (r.width / window.innerWidth) * w;
      // The front segment ≈ the anchor width (desktop); on phones the arc fills the width.
      const segW = 2 * (5.2 - 0.42) * Math.sin((13 * Math.PI) / 360);
      const scale = desktop ? Math.max(0.55, Math.min(0.8, (anchorW / segW) * 0.5)) : params.cam === 'arc' ? 1.0 : 0.85;
      setRingPos({ x: desktop ? (cx * w) / 2 - 0.25 : 0, y: desktop ? (cy * h) / 2 + 0.35 : 0, scale });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [params.cam]);

  // Motion: one module drives both the WebGL ring and the CSS drum through the stage.
  useEffect(() => {
    const grip = gripRef.current;
    if (!grip) return;
    const m = createWheelMotion({
      grip,
      onAngle: (deg) => {
        stage.services.wheelAngle = deg;
        const now = performance.now();
        if (lat.current.clickAt && !lat.current.firstAngleAt) {
          lat.current.firstAngleAt = now;
          lat.current.selectLatencyMs = now - lat.current.clickAt;
        }
        if (lat.current.dragMoveAt) {
          lat.current.dragLatencyMs = now - lat.current.dragMoveAt;
          lat.current.dragMoveAt = 0;
        }
      },
      onActive: (i) => {
        setActive(i);
        stage.services.activeId = services[i]?.id ?? null;
      },
      onStart: () => {
        lat.current.firstAngleAt = 0;
      },
    });
    motionRef.current = m;
    const onMove = () => {
      lat.current.dragMoveAt = performance.now();
    };
    grip.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      grip.removeEventListener('pointermove', onMove);
      m.destroy();
      motionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = {
      ...(w.__spike ?? {}),
      params,
      stage,
      ready,
      active,
      latency: () => ({ ...lat.current }),
      turnTo: (i: number) => motionRef.current?.turnTo(i),
      preTurn: (d: -1 | 0 | 1) => motionRef.current?.preTurn(d),
      angle: () => stage.services.wheelAngle,
    };
  }, [params, ready, active]);

  const select = (i: number) => {
    lat.current.clickAt = performance.now();
    lat.current.firstAngleAt = 0;
    motionRef.current?.turnTo(i);
  };
  const hover = (i: number | null) => {
    if (i === null || i === active) return motionRef.current?.preTurn(0);
    motionRef.current?.preTurn(i > active ? -1 : 1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = active;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (active + 1) % services.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (active - 1 + services.length) % services.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = services.length - 1;
    if (next !== active) {
      event.preventDefault();
      select(next);
      document.getElementById(`${baseId}-tab-${next}`)?.focus();
    }
  };

  const current = services[active]!;

  return (
    <div className={cn('spike', ready && 'is-stage-ready')} data-cam={params.cam} data-css={params.css ? '1' : '0'}>
      <header className="header" style={{ mixBlendMode: 'normal', color: '#eae6dc' }}>
        <div className="header__inner u-shell">
          <span className="mono" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            ЭРА COSMETOLOGY · spike B
          </span>
          <div className="header__cta" style={{ pointerEvents: 'auto' }}>
            <Button href="#inquiry" compact style={{ background: '#cfaf72', color: '#0d0c0b', borderColor: '#cfaf72' }}>
              Записаться
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        <section id="services" className="room room--light room--services" aria-labelledby="services-heading" tabIndex={-1}>
          <div className="room__inner u-shell">
            <WallLabel id="services" className="room__label" />
            <h2 id="services-heading" className="sr-only">
              Услуги
            </h2>
            <div className="services services--tabs">
              <div
                className="services__index"
                role="tablist"
                aria-orientation="vertical"
                aria-label="Направления"
                onKeyDown={onKeyDown}
                onMouseLeave={() => hover(null)}
              >
                {services.map((category, n) => {
                  const selected = n === active;
                  return (
                    <div className="services__item" key={category.id}>
                      <button
                        type="button"
                        id={`${baseId}-tab-${n}`}
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`${baseId}-panel`}
                        tabIndex={selected ? 0 : -1}
                        className={cn('services__tab', selected && 'is-selected')}
                        onClick={() => select(n)}
                        onMouseEnter={() => hover(n)}
                        onFocus={() => hover(n)}
                        onBlur={() => hover(null)}
                      >
                        <span className="services__tab-index t-meta">{subIndex('02', n + 1)}</span>
                        <span className="services__tab-name t-h3">{category.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} className="services__spread" tabIndex={0}>
                <h3 className="services__title t-display">{current.name}</h3>
                <div className="services__spread-text">
                  <p className="services__promise t-lg">{current.promise}</p>
                  <p className="services__description t-body t-muted">{current.description}</p>
                </div>
                <div ref={anchorRef} className="wheel-anchor" data-stage-anchor="services-wheel">
                  {params.css && <CssWheel />}
                  <StageGrip ref={gripRef as never} />
                </div>
                <Handoff className="services__handoff" primary={<Button href="#inquiry">{cta.book}</Button>}>
                  <TextLink href="#pricing">{cta.seePricing}</TextLink>
                  <TextLink href="#cases">{cta.seeCases}</TextLink>
                </Handoff>
              </div>
            </div>
          </div>
        </section>
        <section className="room room--dark" style={{ minHeight: '60svh' }} aria-hidden="true" />
      </main>

      {!params.css && (
        <div className="u-canvas-layer" data-stage-canvas aria-hidden="true">
          <SceneCanvas dpr={params.dpr} frameloop="always" gl={{ preserveDrawingBuffer: true, antialias: false, alpha: true, toneMapping: NoToneMapping }}>
            <Suspense fallback={null}>
              <WheelSet cam={params.cam} vein={params.vein} bookMatch={params.bookMatch} ringX={ringPos.x} ringY={ringPos.y} ringScale={ringPos.scale} onReady={onReady} />
            </Suspense>
          </SceneCanvas>
        </div>
      )}

      {params.hud && (
        <div className="spike-hud" aria-hidden="true">
          <span>
            Spike B · cam {params.cam} · vein {params.vein ? 'on' : 'off'} · book-match {params.bookMatch ? 'on' : 'off'} · {params.css ? 'CSS drum' : 'WebGL ring'} · dpr {params.dpr}
          </span>
          <span>active {subIndex('02', active + 1)} · {ready || params.css ? 'ready' : 'loading'}</span>
          <span>
            <a href="?cam=top">top</a> · <a href="?cam=eye">eye</a> · <a href="?cam=arc">arc</a> · <a href="?cam=stack">stack</a> · <a href="?bm=0">no book-match</a> ·{' '}
            <a href="?vein=0">no vein</a> · <a href="?css=1">css</a>
          </span>
        </div>
      )}
    </div>
  );
}
