import { Suspense, useEffect, useMemo, useState } from 'react';
import { NoToneMapping } from 'three';

import { Handoff } from '@/components/common';
import { Button, TextLink, WallLabel } from '@/components/ui';
import { cta } from '@/data/copy';
import { services } from '@/data/services';
import { cn, subIndex } from '@/lib/utils';
import { SceneCanvas } from '@/three/components/SceneCanvas';

import { ChamberSet } from './scene/ChamberSet';

/**
 * Services 360 chamber — proof page. ?t=0..1 turns from face `a` to face `a+1`.
 *   a=0..6  t=0..1  dpr=  hud=0
 */
function readParams() {
  const q = new URLSearchParams(location.search);
  return {
    a: Math.min(6, Math.max(0, Number(q.get('a') ?? 0))),
    t: Math.min(1, Math.max(0, Number(q.get('t') ?? 0))),
    dpr: q.get('dpr') ? Number(q.get('dpr')) : 1.5,
    hud: q.get('hud') !== '0',
  };
}

export function ChamberSpike() {
  const params = useMemo(readParams, []);
  const [ready, setReady] = useState(false);
  const [geom, setGeom] = useState({ axisX: 1.2, axisY: 0, scale: 0.72, fov: 40, mobile: false });
  const [clip, setClip] = useState<string | undefined>(undefined);
  const from = params.a;
  const to = (params.a + 1) % services.length;
  const active = params.t < 0.5 ? from : to;
  const current = services[active]!;
  // DOM title: a subtle perspective with the turn; flat when frontal.
  const mid = Math.sin(Math.PI * params.t);
  const faceTurn = `${(-9 * mid).toFixed(2)}deg`;
  const faceShift = `${(-2.5 * mid).toFixed(2)}%`;

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-stage-anchor="services-field"]');
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const mobile = window.innerWidth < 1024;
      const fov = mobile ? 48 : 46;
      // World size at the facing wall: 5 units from the camera (scale 1).
      const dist = 5;
      const h = 2 * dist * Math.tan((fov * Math.PI) / 360);
      const w = h * (window.innerWidth / window.innerHeight);
      const cx = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      const cy = -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1);
      const scale = 1;
      setGeom({ axisX: (cx * w) / 2 + 0.2, axisY: (cy * h) / 2 - 0.05, scale, fov, mobile });
      // The field is a window onto the chamber: clip the fixed canvas to its rectangle.
      setClip(
        `inset(${Math.round(r.top)}px ${Math.round(window.innerWidth - r.right)}px ${Math.round(window.innerHeight - r.bottom)}px ${Math.round(r.left)}px)`,
      );
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = { params, ready };
  }, [params, ready]);

  return (
    <div
      className={cn('spike chamber', ready && 'is-stage-ready')}
      style={{ ['--face-turn' as string]: faceTurn, ['--face-shift' as string]: faceShift }}
    >
      <header className="header" style={{ mixBlendMode: 'normal', color: '#0d0c0b' }}>
        <div className="header__inner u-shell">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            ЭРА COSMETOLOGY · услуги · 360 камера
          </span>
          <div className="header__cta" style={{ pointerEvents: 'auto' }}>
            <Button href="#inquiry" compact>
              Записаться
            </Button>
          </div>
        </div>
      </header>
      <main id="main">
        <section
          id="services"
          className="room room--light room--services"
          aria-labelledby="services-heading"
          tabIndex={-1}
        >
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
              >
                {services.map((category, n) => (
                  <div className="services__item" key={category.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={n === active}
                      tabIndex={n === active ? 0 : -1}
                      className={cn('services__tab', n === active && 'is-selected')}
                    >
                      <span className="services__tab-index t-meta">{subIndex('02', n + 1)}</span>
                      <span className="services__tab-name t-h3">{category.name}</span>
                    </button>
                  </div>
                ))}
              </div>
              <div role="tabpanel" className="services__spread" tabIndex={0}>
                <h3 className="services__title t-display">{current.name}</h3>
                <div className="services__spread-text">
                  <p className="services__promise t-lg">{current.promise}</p>
                  <p className="services__description t-body t-muted">{current.description}</p>
                </div>
                <div className="field" data-stage-anchor="services-field">
                  <h3 className="field__title t-h2">{current.name}</h3>
                  <p className="field__meta t-meta t-muted">
                    {subIndex('02', active + 1)} · {current.meta[0]![1]}
                  </p>
                </div>
                <Handoff
                  className="services__handoff"
                  primary={<Button href="#inquiry">{cta.book}</Button>}
                >
                  <TextLink href="#pricing">{cta.seePricing}</TextLink>
                  <TextLink href="#cases">{cta.seeCases}</TextLink>
                </Handoff>
              </div>
            </div>
          </div>
        </section>
        <section className="room room--dark" style={{ minHeight: '40svh' }} aria-hidden="true" />
      </main>
      <div
        className="u-canvas-layer"
        data-stage-canvas
        aria-hidden="true"
        style={clip ? { clipPath: clip } : undefined}
      >
        <SceneCanvas
          dpr={params.dpr}
          frameloop="always"
          gl={{
            preserveDrawingBuffer: true,
            antialias: false,
            alpha: true,
            toneMapping: NoToneMapping,
          }}
          onCreated={() => setReady(true)}
        >
          <Suspense fallback={null}>
            <ChamberSet
              t={params.t}
              from={from}
              to={to}
              axisX={geom.axisX}
              axisY={geom.axisY}
              scale={geom.scale}
              fov={geom.fov}
              mobile={geom.mobile}
            />
          </Suspense>
        </SceneCanvas>
      </div>
      {params.hud && (
        <div className="spike-hud" aria-hidden="true">
          <span>
            360 chamber · face {subIndex('02', from + 1)} → {subIndex('02', to + 1)} · t{' '}
            {params.t.toFixed(2)} ·{' '}
          </span>
          <a href={`?a=${from}&t=0`}>0</a> <a href={`?a=${from}&t=0.3`}>0.3</a>{' '}
          <a href={`?a=${from}&t=0.5`}>0.5</a> <a href={`?a=${from}&t=1`}>1</a>
        </div>
      )}
    </div>
  );
}
