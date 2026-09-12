import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { PerspectiveCamera } from 'three';

import { setFrameRequester, stage } from '@/lib/stage';

/**
 * The stage scene — the one R3F tree behind the page.
 *
 * Skeleton: reads the stage state every rendered frame (camera only) and draws
 * nothing. Sets (HeroSet, ManifestoSet, …) are added per spike. Everything here
 * mutates refs; nothing sets React state on the frame path.
 */
export default function Stage() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    setFrameRequester(invalidate);
    return () => setFrameRequester(null);
  }, [invalidate]);

  useFrame((root) => {
    const cam = root.camera as PerspectiveCamera;
    if (cam.position.z !== stage.camera.z || cam.fov !== stage.camera.fov) {
      cam.position.z = stage.camera.z;
      cam.fov = stage.camera.fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
