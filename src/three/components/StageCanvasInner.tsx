import { Suspense } from 'react';

import { demoteTier } from '@/lib/stage';

import Stage from '../stage/Stage';
import { SceneCanvas } from './SceneCanvas';

/**
 * The canvas subtree — the only module in the lazy WebGL chunk that the
 * lifecycle shell (`StageCanvas`) loads. Everything three-related starts here.
 */
export default function StageCanvasInner() {
  return (
    <div className="u-canvas-layer" data-stage-canvas aria-hidden="true">
      <SceneCanvas
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            demoteTier('none');
          });
        }}
      >
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      </SceneCanvas>
    </div>
  );
}
