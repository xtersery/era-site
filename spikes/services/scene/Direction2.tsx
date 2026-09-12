import { useMemo } from 'react';
import { Color, type Texture } from 'three';

import { ease, glassMaterial, lerp } from './shared';

/**
 * Direction 2 — Optical Aperture.
 * Three thick glass blades form one asymmetric opening. The image field behind it
 * slides laterally on change while the blades reorient around an off-centre pivot
 * (ORBIT): part of the image is seen directly, part through the blades.
 */
export function Direction2({ t, images, veinNormal }: { t: number; images: Texture[]; veinNormal: Texture }) {
  const e = ease(t);
  const gA = useMemo(() => glassMaterial(veinNormal, 0.22, 0.34), [veinNormal]);
  const gB = useMemo(() => glassMaterial(veinNormal, 0.3, 0.3), [veinNormal]);
  const gC = useMemo(() => glassMaterial(veinNormal, 0.2, 0.3), [veinNormal]);
  const W = 1.9;
  const H = 2.3;

  return (
    <group>
      <directionalLight position={[-3, 3.4, 3]} intensity={3.1} color="#f7e4b1" />
      <directionalLight position={[3.5, -1, 1.5]} intensity={0.5} color="#7fb0a4" />
      <ambientLight intensity={0.16} color="#8a948c" />

      {/* the image field behind the aperture — slides, never fades */}
      <group position={[0, 0, -0.62]}>
        <mesh position={[lerp(0, -W * 1.02, e), 0, 0]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={images[0]!} color={new Color().setScalar(lerp(1, 0.4, e))} />
        </mesh>
        <mesh position={[lerp(W * 1.02, 0, e), 0, 0]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={images[1]!} color={new Color().setScalar(lerp(0.4, 1, e))} />
        </mesh>
        <mesh position={[lerp(W * 2.04, W * 1.02, e), 0, -0.1]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={images[2]!} color={new Color().setScalar(0.3)} />
        </mesh>
        {/* a graphite recess behind the field — the opening always has depth; sized to the aperture */}
        <mesh position={[0.15, 0.05, -0.4]}>
          <planeGeometry args={[3.3, 3.1]} />
          <meshBasicMaterial color="#10201a" />
        </mesh>
      </group>

      {/* the blades — pivot off-centre, reorient by ~6° on change */}
      <group position={[0.3, 0.2, 0]} rotation={[0, 0, 0.1 * e]}>
        <group position={[-0.3, -0.2, 0]}>
          <mesh position={[-1.02 + 0.14 * e, 0.05, 0.22]} rotation={[0, 0.2 - 0.08 * e, 0.06]} material={gA}>
            <boxGeometry args={[0.72, 2.7, 0.34]} />
          </mesh>
          <mesh position={[0.72 - 0.3 * e, 1.02 - 0.12 * e, 0.36]} rotation={[0, -0.14, -0.61]} material={gB}>
            <boxGeometry args={[2.3, 0.62, 0.3]} />
          </mesh>
          <mesh position={[0.78 + 0.18 * e, -1.02, 0.12]} rotation={[0, 0.08, 0.16 + 0.1 * e]} material={gC}>
            <boxGeometry args={[1.5, 0.5, 0.3]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
