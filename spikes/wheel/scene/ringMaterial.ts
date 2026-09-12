import { Color, MeshPhysicalMaterial, Vector2, type Texture, type WebGLProgramParametersWithUniforms } from 'three';

import { MINERAL } from '../../hero/scene/materials';

/**
 * Ring material — the approved hybrid path (B) with a per-segment clarity patch:
 * the segment facing the camera is nearly clear (ior → 1.02, thin), neighbours
 * refract and attenuate toward depth-green. Clarity is a pure function of the
 * segment angle + wheel angle, so ONE mesh / ONE draw call carries all seven
 * states and turns without any per-segment bookkeeping.
 */
export function createRingMaterial(veinNormal: Texture, opts: { vein: boolean }) {
  const m = new MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.34,
    ior: MINERAL.ior,
    dispersion: 0.1,
    roughness: MINERAL.roughness,
    attenuationColor: new Color(MINERAL.attenuationColor),
    attenuationDistance: 3.6,
    color: new Color('#f8f6f1'),
    normalMap: opts.vein ? veinNormal : null,
    normalScale: new Vector2(0.04, 0.04),
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.25,
  });

  const uniforms = {
    uWheelAngle: { value: 0 },
    uStep: { value: (13 * Math.PI) / 180 },
    uTeal: { value: new Color(MINERAL.teal) },
    uGold: { value: new Color(MINERAL.gold) },
  };

  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aSegment;
uniform float uWheelAngle;
uniform float uStep;
varying float vClarity;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
// Facing: 1 when this segment's centre points at the camera (+z after the wheel turn).
// Angular offset of this segment from the camera axis, in segment steps.
float eraOff = aSegment * uStep + uWheelAngle;
eraOff = atan(sin(eraOff), cos(eraOff));
float eraT = clamp(1.0 - abs(eraOff) / uStep / 1.35, 0.0, 1.0);
vClarity = smoothstep(0.0, 1.0, eraT) * 0.7;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vClarity;
uniform vec3 uTeal;
uniform vec3 uGold;`,
      )
      .replace('material.ior = ior;', 'material.ior = mix(ior, 1.02, vClarity);')
      .replace('material.thickness = thickness;', 'material.thickness = thickness * (1.0 - 0.8 * vClarity);')
      .replace(
        'material.attenuationDistance = attenuationDistance;',
        'material.attenuationDistance = attenuationDistance / max(0.12, 1.0 - vClarity);',
      )
      .replace(
        '#include <dithering_fragment>',
        `float eraNdv = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
float eraFres = pow(1.0 - eraNdv, 3.2);
gl_FragColor.rgb += uTeal * eraFres * 0.14 * (1.0 - vClarity);
gl_FragColor.rgb += uGold * pow(eraFres, 6.0) * 0.10;
#include <dithering_fragment>`,
      );
  };
  // Make the patched uniforms part of the program cache key.
  m.customProgramCacheKey = () => 'era-ring-v1';

  return { material: m, uniforms };
}
