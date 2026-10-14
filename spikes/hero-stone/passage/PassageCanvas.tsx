import { Suspense, useEffect } from 'react';
import { NoToneMapping } from 'three';

import { SceneCanvas } from '@/three/components/SceneCanvas';

import { PassageScene, type PassageSceneProps } from './PassageScene';

/**
 * The film's canvas and scene — the hero's only WebGL, and the only thing on
 * the first screen that needs three.js. A module of its own so the page loads
 * it with `import()` once the hero's pictures are on screen, never in the
 * first load (`HeroStoneSpike`). `onReady` fires once the scene has mounted
 * with its textures — the film can be drawn from then on.
 */
export default function PassageCanvas({ onReady, ...scene }: PassageSceneProps & { onReady: () => void }) {
  return (
    <SceneCanvas
      dpr={[1, 1.5]}
      frameloop="never"
      data-scene="film"
      data-frameloop="advance"
      gl={{ antialias: false, alpha: true, toneMapping: NoToneMapping }}
    >
      <Suspense fallback={null}>
        <PassageScene {...scene} />
        <Ready onReady={onReady} />
      </Suspense>
    </SceneCanvas>
  );
}

/* Mounts in the same boundary as the scene, after it: its effect runs once the
   textures have resolved and the scene's own effect has handed over its frame. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}
