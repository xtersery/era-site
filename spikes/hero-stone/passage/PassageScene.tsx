import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { NoBlending, NoColorSpace, ShaderMaterial, Vector2, Vector3 } from 'three';

import { composeShader } from '@/three/shaders/compose';
import fullscreenVert from '@/three/shaders/lib/fullscreen.vert?raw';
import simplex from '@/three/shaders/lib/simplex2d.glsl?raw';

import passageFrag from './passage.frag?raw';

export interface EmblemBox {
  x: number;
  y: number;
  size: number;
  /** the DOM emblem's pointer drift, px — so the canvas takes over exactly where it stands */
  dx: number;
  dy: number;
}

export interface PassageSceneProps {
  onyxUrl: string;
  emblemUrl: string;
  /** The passage's progress 0..1, written by the gateway; read on the frame path. */
  progress: { current: number };
  /** The emblem's centre and size in canvas px, measured from the DOM. */
  emblem: { current: EmblemBox };
  /** 1 — the full material · 0 — the lean one (`mid` tier) */
  quality: number;
  /** Receives the scene's frame call: one synchronous render, on the tick that wrote t. */
  frameRef: { current: () => void };
}

/**
 * One full-screen pass, an alpha layer: the hero's onyx and emblem rising out
 * of the frame, and the membrane crossing it. Where it draws nothing, the
 * manifesto's ground (DOM) shows through. Everything happens in the fragment
 * shader; this component owns the uniforms and the textures.
 */
export function PassageScene({ onyxUrl, emblemUrl, progress, emblem, quality, frameRef }: PassageSceneProps) {
  const size = useThree((s) => s.size);
  const advance = useThree((s) => s.advance);
  const [onyx, emblemTex] = useTexture([onyxUrl, emblemUrl]);
  useMemo(() => {
    for (const t of [onyx, emblemTex]) {
      t.colorSpace = NoColorSpace;
      t.generateMipmaps = true;
    }
  }, [onyx, emblemTex]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: composeShader(simplex, passageFrag),
        depthTest: false,
        depthWrite: false,
        // The shader writes premultiplied colour straight into the (transparent) canvas.
        blending: NoBlending,
        uniforms: {
          tOnyx: { value: onyx },
          uOnyxSize: { value: new Vector2(onyx.image.width, onyx.image.height) },
          tEmblem: { value: emblemTex },
          uRes: { value: new Vector2(1, 1) },
          uEmblem: { value: new Vector3(0, 0, 1) },
          uDrift: { value: new Vector2(0, 0) },
          uP: { value: 0 },
          uTime: { value: 0 },
          uQuality: { value: 1 },
        },
      }),
    [onyx, emblemTex],
  );
  useEffect(() => () => material.dispose(), [material]);

  // The canvas is `frameloop="never"`: the gateway writes t on the GSAP tick
  // and this draws the frame there and then, in the same rAF as the DOM — one
  // render per write, never a frame behind. (`invalidate` on a demand loop
  // lands only on the NEXT frame, and when the tick runs after R3F's own loop
  // has already passed, every other write is skipped: a 30 fps film.)
  useEffect(() => {
    const draw = () => advance(performance.now(), true);
    frameRef.current = draw;
    draw();
    return () => {
      frameRef.current = () => {};
    };
  }, [frameRef, advance]);

  useFrame(() => {
    const u = material.uniforms;
    u.uRes!.value.set(size.width, size.height);
    const e = emblem.current;
    u.uEmblem!.value.set(e.x, e.y, e.size);
    u.uDrift!.value.set(e.dx, e.dy);
    u.uP!.value = progress.current;
    // The loop does not run between frames: wall time.
    u.uTime!.value = performance.now() / 1000;
    u.uQuality!.value = quality;
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
