import { MeshTransmissionMaterial } from '@react-three/drei';
import { useMemo, type JSX } from 'react';
import {
  Color,
  MeshPhysicalMaterial,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';

import fragment from './screenRefraction.frag?raw';
import vertex from './screenRefraction.vert?raw';

/**
 * ERA Mineral Glass — the three rendering paths under test (Spike A).
 * Shared: attenuation toward the logo green, the vein normal map, the ERA
 * environment, the teal ↔ gold poles. Per path: how refraction is produced.
 */
export type GlassPath = 'A' | 'B' | 'C';

export const MINERAL = {
  /**
   * Attenuation: the logo green (#012118) is ~0.0003/0.015/0.009 in linear light —
   * as a Beer–Lambert colour it turns skin olive over any path. The *hint* of
   * depth-green uses a lifted derivative with a long distance; the deep green
   * itself lives in the grounds and the veil, i.e. what the glass shows where
   * there is nothing bright behind it.
   */
  attenuationColor: '#3d6b58',
  attenuationDistance: 8,
  ior: 1.45,
  roughness: 0.11,
  teal: '#7fb0a4',
  gold: '#f7e4b1',
  goldMid: '#cfaf72',
} as const;

interface PathProps {
  veinNormal: Texture;
  clarity: number;
  tier: 'high' | 'mid';
  attenuation?: number | undefined;
  /** Debug bisection switches. */
  noNormal?: boolean | undefined;
  noClearcoat?: boolean | undefined;
  noDispersion?: boolean | undefined;
  noPatch?: boolean | undefined;
}

/** Path A — true transmission (drei), backbuffer sampled per pixel with dispersion. */
export function TransmissionPath({
  veinNormal,
  clarity,
  tier,
  attenuation,
}: PathProps): JSX.Element {
  const high = tier === 'high';
  const attDist = attenuation ?? MINERAL.attenuationDistance;
  return (
    <MeshTransmissionMaterial
      transmission={1}
      thickness={0.42 * (1 - clarity * 0.8)}
      ior={1 + (MINERAL.ior - 1) * (1 - clarity)}
      chromaticAberration={0.055 * (1 - clarity)}
      anisotropicBlur={0.06}
      roughness={MINERAL.roughness}
      attenuationColor={MINERAL.attenuationColor}
      attenuationDistance={attDist / Math.max(0.15, 1 - clarity)}
      color="#f8f6f1"
      normalMap={veinNormal}
      normalScale={new Vector2(0.05, 0.05)}
      clearcoat={1}
      clearcoatRoughness={0.06}
      envMapIntensity={1.35}
      samples={high ? 6 : 2}
      resolution={high ? 1024 : 512}
      backside={false}
    />
  );
}

/** Debug: bare physical transmission, nothing else. */
export function PlainPath(): JSX.Element {
  return (
    <meshPhysicalMaterial
      transmission={1}
      thickness={0.42}
      ior={1.45}
      roughness={0.05}
      color="#ffffff"
    />
  );
}

/** Path B — hybrid: built-in physical transmission + dispersion + a fresnel tint patch. */
export function HybridPath({
  veinNormal,
  clarity,
  attenuation,
  noNormal,
  noClearcoat,
  noDispersion,
  noPatch,
}: PathProps): JSX.Element {
  const attDist = attenuation ?? MINERAL.attenuationDistance;
  const material = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      transmission: 1,
      thickness: 0.42,
      ior: MINERAL.ior,
      dispersion: 0.22,
      roughness: MINERAL.roughness,
      attenuationColor: new Color(MINERAL.attenuationColor),
      attenuationDistance: MINERAL.attenuationDistance,
      color: new Color('#f8f6f1'),
      normalMap: noNormal ? null : veinNormal,
      normalScale: new Vector2(0.05, 0.05),
      clearcoat: noClearcoat ? 0 : 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.35,
    });
    if (!noPatch)
      m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uTeal = { value: new Color(MINERAL.teal) };
        shader.uniforms.uGold = { value: new Color(MINERAL.gold) };
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nuniform vec3 uTeal;\nuniform vec3 uGold;',
          )
          .replace(
            '#include <dithering_fragment>',
            `// ERA fresnel tint: teal at grazing, a little gold where light gathers.
  float eraNdv = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  float eraFres = pow(1.0 - eraNdv, 3.2);
  gl_FragColor.rgb += uTeal * eraFres * 0.16;
  gl_FragColor.rgb += uGold * pow(eraFres, 6.0) * 0.12;
  #include <dithering_fragment>`,
          );
      };
    return m;
  }, [veinNormal, noNormal, noClearcoat, noPatch]);

  // Clarity drives the physical parameters together.
  material.ior = 1 + (MINERAL.ior - 1) * (1 - clarity);
  material.thickness = 0.42 * (1 - clarity * 0.8);
  material.dispersion = noDispersion ? 0 : 0.22 * (1 - clarity);
  material.attenuationDistance = attDist / Math.max(0.15, 1 - clarity);

  return <primitive object={material} attach="material" />;
}

/** Path C — screen-space fake refraction from an FBO of the backdrop. Phone-viable. */
export function createScreenMaterial(veinNormal: Texture, sceneTexture: Texture): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uScene: { value: sceneTexture },
      uNormalMap: { value: veinNormal },
      uResolution: { value: new Vector2(1, 1) },
      uIor: { value: MINERAL.ior },
      uDispersion: { value: 0.08 },
      uAttenuation: { value: new Color(MINERAL.attenuationColor) },
      uAttenuationDistance: { value: MINERAL.attenuationDistance },
      uTeal: { value: new Color(MINERAL.teal) },
      uGold: { value: new Color(MINERAL.gold) },
      uKeyDir: { value: new Vector3(-0.55, 0.65, 0.52).normalize() },
      uClarity: { value: 0 },
      uVeinPhase: { value: 0 },
      uVeinStrength: { value: 0.022 },
    },
  });
}
