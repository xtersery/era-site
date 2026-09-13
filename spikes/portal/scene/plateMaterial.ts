import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector2, type Texture } from 'three';

/**
 * The case plate seen *through* the threshold.
 *
 * Two states, one plane, identical UVs: «после» is the plate as shot, «до» is
 * the same frame graded. `uReveal` is depth, not a crop — 0 keeps the result at
 * the front of the aperture, 1 looks through it into the state the visitor came
 * from. Where the two mix, they mix by opacity only: no scale, no offset, no
 * warp, so the face cannot move. The portal may bend light around the plate;
 * the plate itself stays honest.
 *
 * `uField` lets the pointer open the deeper state locally — a soft elliptical
 * field, feathered to nothing, never a rectangle and never a lens.
 *
 * The edges are eaten by the aperture: the plate dissolves into the mineral
 * darkness instead of ending as a rectangle inside the ring.
 */
export function createPlateMaterial(after: Texture, before: Texture): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uAfter: { value: after },
      uBefore: { value: before },
      uReveal: { value: 0 }, // 0 «после» · 1 «до»
      uField: { value: new Vector2(0.5, 0.5) }, // pointer, in plate space
      uFieldAmount: { value: 0 }, // how much of the reveal is pointer-driven
      uOpacity: { value: 1 },
      uAperture: { value: 1.18 }, // where the plate starts to be eaten by the dark
      uHaze: { value: 0 }, // green-black taking the plate with distance
      uHazeColor: { value: new Color('#0b1a14') },
      uWarm: { value: new Color('#f7e4b1') },
      uKey: { value: 0.16 }, // the warm key falling across the plate, upper left
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uAfter;
      uniform sampler2D uBefore;
      uniform float uReveal;
      uniform vec2 uField;
      uniform float uFieldAmount;
      uniform float uOpacity;
      uniform float uAperture;
      uniform float uHaze;
      uniform vec3 uHazeColor;
      uniform vec3 uWarm;
      uniform float uKey;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec4 after = texture2D(uAfter, uv);
        vec4 before = texture2D(uBefore, uv);

        // the pointer opens the deeper state as a soft field, feathered to nothing
        vec2 d = (uv - uField) / vec2(0.46, 0.58);
        float field = 1.0 - smoothstep(0.55, 1.0, length(d));
        float mixAmount = clamp(max(uReveal, field * uFieldAmount), 0.0, 1.0);

        // OPACITY ONLY — the two states are sampled at exactly the same uv
        vec3 col = mix(after.rgb, before.rgb, mixAmount);

        // one controlled warm key, upper left, falling across the plate
        float key = smoothstep(1.15, -0.15, uv.x + (1.0 - uv.y));
        col += uWarm * key * uKey * 0.5;

        // the aperture eats the edges: the plate belongs to the threshold, not to a frame
        vec2 c = (uv - 0.5) * vec2(2.0, 2.5); // the plate is taller than the opening: top and bottom go first
        float r = length(c);
        float edge = 1.0 - smoothstep(uAperture * 0.42, uAperture, r);

        // and the green-black takes it with distance
        col = mix(col, uHazeColor, uHaze);

        float a = uOpacity * edge;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * The haze that lives between the thresholds: a single soft quad per gap,
 * additive and very quiet, so the depth has air in it rather than a gradient.
 */
export function createHazeMaterial(color: string, strength: number): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        vec2 c = (vUv - 0.5) * 2.0;
        float r = length(c * vec2(1.0, 1.25));
        float a = pow(1.0 - clamp(r, 0.0, 1.0), 2.4) * uStrength;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}
