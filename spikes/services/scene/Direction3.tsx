import { useMemo } from 'react';
import { Color, ShaderMaterial, SRGBColorSpace, type Texture } from 'three';

import { ease, glassMaterial, lerp, smoothstep } from './shared';
import fragment from './strata.frag?raw';
import vertex from './strata.vert?raw';

const COUNT = 5;
const ANGLE = 0.61; // the wall's diagonal

/**
 * Direction 3 — Mineral Strata.
 * The image is one composition cut into five diagonal strata (the wall's angle).
 * On change the strata separate along the cut, step in depth, the image
 * reorganises inside them, and they reassemble as the next state. Two thin glass
 * strata ride with them.
 */
export function Direction3({ t, images, veinNormal }: { t: number; images: Texture[]; veinNormal: Texture }) {
  const e = ease(t);
  const sep = Math.sin(Math.PI * e);
  const mix = smoothstep(0.3, 0.7, e);
  const W = 1.75;
  const H = 2.2;
  const along = [-Math.sin(ANGLE), Math.cos(ANGLE)]; // direction of the cuts

  const materials = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, k) => {
        images[0]!.colorSpace = SRGBColorSpace;
        return new ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fragment,
          transparent: false,
          uniforms: {
            uMap: { value: images[0]! },
            uNext: { value: images[1]! },
            uMix: { value: 0 },
            uBand: { value: k },
            uCount: { value: COUNT },
            uAngle: { value: ANGLE },
            uGlint: { value: 0 },
            uGold: { value: new Color('#f7e4b1') },
            uTeal: { value: new Color('#7fb0a4') },
            uBrightness: { value: 1 },
          },
        });
      }),
    [images],
  );
  materials.forEach((m, k) => {
    m.uniforms.uMix!.value = mix;
    m.uniforms.uGlint!.value = 0.55 * sep;
    m.uniforms.uBrightness!.value = 1 - 0.25 * sep * (k % 2 ? 1 : 0.4);
  });
  const glassA = useMemo(() => glassMaterial(veinNormal, 0.3, 0.14), [veinNormal]);
  const glassB = useMemo(() => glassMaterial(veinNormal, 0.2, 0.18), [veinNormal]);

  const offset = (k: number) => {
    const g = (k - 2) * 0.3 * sep;
    const z = ((k % 2 ? 1 : -1) * 0.26 + (k - 2) * 0.04) * sep;
    return [along[0]! * g, along[1]! * g, z] as [number, number, number];
  };

  return (
    <group>
      <directionalLight position={[-3, 3.4, 3]} intensity={3} color="#f7e4b1" />
      <directionalLight position={[3.5, -1, 1.5]} intensity={0.5} color="#7fb0a4" />
      <ambientLight intensity={0.16} color="#8a948c" />
      {/* graphite depth behind the cut */}
      <mesh position={[0.1, 0, -0.9]}>
        <planeGeometry args={[2.9, 3.0]} />
        <meshBasicMaterial color="#10201a" />
      </mesh>
      {materials.map((m, k) => (
        <mesh key={k} material={m} position={offset(k)}>
          <planeGeometry args={[W, H]} />
        </mesh>
      ))}
      {/* two glass strata riding with the cut */}
      <mesh position={[offset(1)[0] - 0.02, offset(1)[1] + 0.02, lerp(0.16, 0.42, sep)]} rotation={[0, 0, ANGLE]} material={glassA}>
        <boxGeometry args={[0.36, 2.9, 0.14]} />
      </mesh>
      <mesh position={[offset(3)[0] + 0.05, offset(3)[1] - 0.04, lerp(0.12, 0.34, sep)]} rotation={[0, 0, ANGLE]} material={glassB}>
        <boxGeometry args={[0.28, 2.9, 0.18]} />
      </mesh>
    </group>
  );
}
