import { Environment, PerspectiveCamera, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { NoToneMapping, RepeatWrapping, SRGBColorSpace, Vector3, type PerspectiveCamera as PCam } from 'three';

import { Handoff } from '@/components/common';
import { Button, TextLink, WallLabel } from '@/components/ui';
import { cta } from '@/data/copy';
import { services } from '@/data/services';
import { cn, subIndex } from '@/lib/utils';
import { SceneCanvas } from '@/three/components/SceneCanvas';

import { createEraEnvironment } from '../hero/scene/eraEnvironment';
import { Direction1 } from './scene/Direction1';
import { Direction2 } from './scene/Direction2';
import { Direction3 } from './scene/Direction3';
import { cropOf, instrumentPlate } from './scene/shared';

/**
 * Services concept pass — three directions, pseudo-motion.
 *   dir=1|2|3   t=0..1 (transition 02.1 → 02.2)   dpr=   hud=0
 * No motion system, no interaction: frames are captured at fixed t.
 */
function readParams() {
  const q = new URLSearchParams(location.search);
  return {
    dir: (Number(q.get('dir')) || 1) as 1 | 2 | 3,
    t: Math.min(1, Math.max(0, Number(q.get('t') ?? 0))),
    dpr: q.get('dpr') ? Number(q.get('dpr')) : 1.5,
    hud: q.get('hud') !== '0',
  };
}

function Scene({ dir, t, pos, scale, onReady }: { dir: 1 | 2 | 3; t: number; pos: [number, number]; scale: number; onReady: () => void }) {
  const camera = useThree((s) => s.camera) as PCam;
  const [portrait, skin, veinNormal] = useTexture([
    '/spikes/hero/assets/portrait-test.png',
    '/spikes/hero/assets/skin-plate.jpg',
    '/spikes/hero/assets/vein-normal.png',
  ]);
  const env = useMemo(() => createEraEnvironment(), []);
  const images = useMemo(() => {
    portrait.colorSpace = SRGBColorSpace;
    skin.colorSpace = SRGBColorSpace;
    veinNormal.wrapS = veinNormal.wrapT = RepeatWrapping;
    // Same temporary set for all three: the portrait (4:5 crop), a second crop of the same
    // portrait (neck/shoulder — a different state, same woman), and an instrument plate.
    return [cropOf(portrait, 0.22, 0.0, 0.5, 1.0), cropOf(portrait, 0.0, 0.0, 0.5, 1.0), instrumentPlate()];
  }, [portrait, skin, veinNormal]);

  useEffect(() => {
    camera.position.set(0, 0.8, 6);
    camera.lookAt(new Vector3(0, 0, 0));
    camera.fov = 34;
    camera.updateProjectionMatrix();
    onReady();
  }, [camera, onReady]);

  const props = { t, images, veinNormal };
  return (
    <>
      <PerspectiveCamera makeDefault near={0.1} far={40} position={[0, 0.8, 6]} fov={34} />
      <Environment map={env} background={false} />
      <color attach="background" args={['#ece8df']} />
      <fog attach="fog" args={['#ece8df', 7, 13]} />
      <group position={[pos[0], pos[1], 0]} scale={scale}>
        {dir === 1 ? <Direction1 {...props} /> : dir === 2 ? <Direction2 {...props} /> : <Direction3 {...props} />}
      </group>
    </>
  );
}

export function ConceptSpike() {
  const params = useMemo(readParams, []);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState<{ p: [number, number]; scale: number }>({ p: [0, 0], scale: 1 });
  const active = params.t < 0.5 ? 0 : 1;
  const current = services[active]!;

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-stage-anchor="services-visual"]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
    const cy = -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1);
    const h = 2 * 6.05 * Math.tan((34 * Math.PI) / 360);
    const w = h * (window.innerWidth / window.innerHeight);
    const desktop = window.innerWidth >= 1024;
    const anchorW = (r.width / window.innerWidth) * w;
    setPos({ p: desktop ? [(cx * w) / 2 + 0.1, (cy * h) / 2 + 0.55] : [0, (cy * h) / 2 + 0.1], scale: desktop ? Math.min(0.9, anchorW / 2.9) : 0.7 });
  }, []);

  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = { params, ready };
  }, [params, ready]);

  return (
    <div className={cn('spike concept', ready && 'is-stage-ready')} data-dir={params.dir}>
      <header className="header" style={{ mixBlendMode: 'normal', color: '#0d0c0b' }}>
        <div className="header__inner u-shell">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>ЭРА COSMETOLOGY · услуги · направление {params.dir}</span>
          <div className="header__cta" style={{ pointerEvents: 'auto' }}>
            <Button href="#inquiry" compact>Записаться</Button>
          </div>
        </div>
      </header>
      <main id="main">
        <section id="services" className="room room--light room--services" aria-labelledby="services-heading" tabIndex={-1}>
          <div className="room__inner u-shell">
            <WallLabel id="services" className="room__label" />
            <h2 id="services-heading" className="sr-only">Услуги</h2>
            <div className="services services--tabs">
              <div className="services__index" role="tablist" aria-orientation="vertical" aria-label="Направления">
                {services.map((category, n) => (
                  <div className="services__item" key={category.id}>
                    <button type="button" role="tab" aria-selected={n === active} tabIndex={n === active ? 0 : -1} className={cn('services__tab', n === active && 'is-selected')}>
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
                <div className="wheel-anchor" data-stage-anchor="services-visual" />
                <Handoff className="services__handoff" primary={<Button href="#inquiry">{cta.book}</Button>}>
                  <TextLink href="#pricing">{cta.seePricing}</TextLink>
                  <TextLink href="#cases">{cta.seeCases}</TextLink>
                </Handoff>
              </div>
            </div>
          </div>
        </section>
        <section className="room room--dark" style={{ minHeight: '40svh' }} aria-hidden="true" />
      </main>
      <div className="u-canvas-layer" data-stage-canvas aria-hidden="true">
        <SceneCanvas dpr={params.dpr} frameloop="always" gl={{ preserveDrawingBuffer: true, antialias: false, alpha: true, toneMapping: NoToneMapping }}>
          <Suspense fallback={null}>
            <Scene dir={params.dir} t={params.t} pos={pos.p} scale={pos.scale} onReady={() => setReady(true)} />
          </Suspense>
        </SceneCanvas>
      </div>
      {params.hud && (
        <div className="spike-hud" aria-hidden="true">
          <span>concept · dir {params.dir} · t {params.t.toFixed(2)} · active {subIndex('02', active + 1)}</span>
          <span><a href="?dir=1">1 focus field</a> · <a href="?dir=2">2 aperture</a> · <a href="?dir=3">3 strata</a> · t: <a href={`?dir=${params.dir}&t=0`}>0</a> <a href={`?dir=${params.dir}&t=0.5`}>0.5</a> <a href={`?dir=${params.dir}&t=1`}>1</a></span>
        </div>
      )}
    </div>
  );
}
