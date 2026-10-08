import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Suspense, type ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/hooks';
import { cn } from '@/lib/utils';

import { dprRange, hasWebGL } from '../utils/webgl';

export interface SceneCanvasProps extends Omit<CanvasProps, 'children' | 'fallback'> {
  readonly children: ReactNode;
  /**
   * Rendered instead of the canvas when WebGL is unavailable, or when the
   * visitor has asked for reduced motion and the scene has no still equivalent.
   * This is not optional in spirit: a scene with no fallback is a blank hole.
   */
  readonly fallback?: ReactNode;
  /**
   * Skip the canvas entirely for reduced-motion visitors. Default `false` —
   * most scenes should instead render themselves *still*, which keeps the
   * composition intact. Set `true` only when the motion IS the content.
   */
  readonly skipOnReducedMotion?: boolean;
  readonly className?: string;
}

/**
 * The single wrapper every R3F scene mounts through.
 *
 * It owns the decisions that are easy to get wrong per-scene and expensive to
 * get wrong globally:
 *
 * - **Capability gate** — no WebGL, no canvas, no crash.
 * - **DPR ceiling** — a range, not `window.devicePixelRatio` (see `dprRange`).
 * - **`frameloop="demand"` by default** — nothing renders until something asks.
 *   Scenes that genuinely animate every frame opt in with `frameloop="always"`.
 * - **`pointer-events: none`** — the canvas is a visual layer; the DOM keeps
 *   the interactions, the semantics and the accessibility tree — and so the
 *   canvas is not re-measured on scroll (R3F's default), which would redraw
 *   every canvas on the page after every scroll.
 * - **Suspense boundary** — model and texture loading never blocks the page.
 *
 * Anything visual belongs in the scene, not here.
 */
export function SceneCanvas({
  children,
  fallback = null,
  skipOnReducedMotion = false,
  className,
  gl,
  camera,
  ...props
}: SceneCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (!hasWebGL() || (skipOnReducedMotion && reducedMotion)) {
    return <>{fallback}</>;
  }

  return (
    <Canvas
      className={cn('scene-canvas', className)}
      dpr={dprRange()}
      // The canvas never takes the pointer, so its position on the page is of
      // no use to it: measuring on scroll would re-render the root and draw a
      // frame 50 ms after every scroll — for every canvas on the page.
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      frameloop="demand"
      camera={{ fov: 35, near: 0.1, far: 100, position: [0, 0, 5], ...camera }}
      gl={{
        antialias: false, // Post-processing or a higher DPR beats MSAA on cost.
        alpha: true,
        powerPreference: 'high-performance',
        ...gl,
      }}
      style={{ pointerEvents: 'none' }}
      {...props}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
