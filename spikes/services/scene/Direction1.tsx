import { useMemo } from 'react';
import { Color, type Texture } from 'three';

import { ease, glassMaterial, lerp } from './shared';

/**
 * Direction 1 — Spatial Focus Field.
 * One dominant image plane; the next state waits behind, a third further back;
 * two tall mineral-glass slabs and one diagonal blade stand in the field. On change
 * the active plane recedes, the next comes forward, the slabs sweep and the key dips:
 * the field refocuses.
 */
export function Direction1({ t, images, veinNormal }: { t: number; images: Texture[]; veinNormal: Texture }) {
  const e = ease(t);
  const dip = Math.sin(Math.PI * e);
  const g1 = useMemo(() => glassMaterial(veinNormal, 0.25, 0.2), [veinNormal]);
  const g2 = useMemo(() => glassMaterial(veinNormal, 0.15, 0.26), [veinNormal]);
  const g3 = useMemo(() => glassMaterial(veinNormal, 0.35, 0.16), [veinNormal]);
  const W = 1.6;
  const H = 2.0;
  const b0 = lerp(1, 0.32, e);
  const b1 = lerp(0.32, 1, e);

  return (
    <group>
      <directionalLight position={[-3, 3.4, 3]} intensity={3 - 1.5 * dip} color="#f7e4b1" />
      <directionalLight position={[3.5, -1, 1.5]} intensity={0.5} color="#7fb0a4" />
      <ambientLight intensity={0.16} color="#8a948c" />

      {/* third state, far back */}
      <mesh position={[1.05 - 0.2 * e, 0.35, -1.7]} rotation={[0, 0.3, 0]} scale={0.62}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={images[2]!} color={new Color().setScalar(0.22)} />
      </mesh>
      {/* next state — comes forward */}
      <mesh
        position={[lerp(-0.6, 0, e), lerp(0.3, 0, e), lerp(-0.95, 0, e)]}
        rotation={[0, lerp(0.2, -0.1, e), 0]}
        scale={lerp(0.78, 1, e)}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={images[1]!} color={new Color().setScalar(b1)} />
      </mesh>
      {/* active state — recedes */}
      <mesh
        position={[lerp(0, 0.6, e), lerp(0, 0.28, e), lerp(0, -0.95, e)]}
        rotation={[0, lerp(-0.1, -0.24, e), 0]}
        scale={lerp(1, 0.78, e)}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={images[0]!} color={new Color().setScalar(b0)} />
      </mesh>

      {/* mineral-glass slabs: the field's optics */}
      <mesh position={[-0.72 + 1.15 * dip, 0.05, 0.48]} rotation={[0, -0.16 - 0.3 * dip, 0.03]} material={g1}>
        <boxGeometry args={[0.5, 2.5, 0.2]} />
      </mesh>
      <mesh position={[0.95 - 0.35 * e, -0.15, -0.4]} rotation={[0, 0.24, -0.02]} material={g2}>
        <boxGeometry args={[0.42, 2.3, 0.26]} />
      </mesh>
      {/* the wall's diagonal: one blade at 35° */}
      <mesh position={[0.35 + 0.15 * e, 0.95 - 0.1 * e, 0.32]} rotation={[0, -0.1, -0.61]} material={g3}>
        <boxGeometry args={[1.9, 0.34, 0.16]} />
      </mesh>
    </group>
  );
}
