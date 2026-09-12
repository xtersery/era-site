import { useEffect, useRef } from 'react';

import { stage } from '@/lib/stage';

const SEGMENTS = 7;
const STEP_DEG = 360 / SEGMENTS;
const IMAGES = [
  '/spikes/hero/assets/portrait-test.png',
  '/spikes/hero/assets/calibration-strip.png',
  '/spikes/hero/assets/skin-plate.jpg',
  '/spikes/hero/assets/vein-luma.png',
  '/spikes/hero/assets/portrait-test.png',
  '/spikes/hero/assets/calibration-strip.png',
  '/spikes/hero/assets/skin-plate.jpg',
];

/**
 * Lighter fallback: a CSS 3D drum of seven facets driven by the same
 * `stage.services.wheelAngle` and the same motion module — no glass. This is
 * the basis of PASS B (add one WebGL glass pane) and PASS C (no wheel).
 */
export function CssWheel() {
  const drumRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const drum = drumRef.current;
      if (drum) {
        const deg = stage.services.wheelAngle;
        drum.style.setProperty('--wheel-angle', `${deg}deg`);
        const facets = drum.children;
        for (let k = 0; k < facets.length; k++) {
          const facing = Math.cos(((k * STEP_DEG + deg) * Math.PI) / 180);
          const b = 0.08 + 0.92 * Math.pow(Math.max(0, facing), 2.2);
          (facets[k] as HTMLElement).style.setProperty('--facet-b', b.toFixed(3));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="css-wheel" aria-hidden="true">
      <div
        ref={drumRef}
        className="css-wheel__drum"
        style={{ ['--facet-w' as string]: '26vw', ['--facet-h' as string]: '30vw', ['--facet-d' as string]: '27vw' }}
      >
        {IMAGES.map((src, k) => (
          <div
            key={k}
            className="css-wheel__facet"
            style={{ ['--facet-angle' as string]: `${k * STEP_DEG}deg`, backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
    </div>
  );
}
