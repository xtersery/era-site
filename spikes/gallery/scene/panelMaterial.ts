import { Color, DoubleSide, ShaderMaterial, Vector2, type Texture } from 'three';

/**
 * One case panel on the rail.
 *
 * Inherited from the ThreeUI gallery element: the panel is a *curved* editorial
 * sheet wrapped around a vertical cylindrical rail, not a flat card. The bend is
 * a uniform, so focusing a case can flatten it — the sheet unrolls as it comes
 * forward, which is the whole "unfold" moment.
 *
 * Extended for ERA: the two states of the case live on this one sheet, sampled
 * with the same uv and mixed by opacity only (no scale, no offset, no warp — the
 * face cannot move); the archive dims behind the focused case; the sheet keeps a
 * mineral edge and a warm key instead of a paper-grid look.
 */
export function createPanelMaterial(after: Texture, before: Texture): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    side: DoubleSide,
    uniforms: {
      uAfter: { value: after },
      uBefore: { value: before },
      /** 0 «после» · 1 «до» */
      uReveal: { value: 0 },
      /** pointer in sheet space, and how much of the reveal it owns */
      uField: { value: new Vector2(0.5, 0.5) },
      uFieldAmount: { value: 0 },
      /** 1 = wrapped around the rail, 0 = flat (focused) */
      uBend: { value: 1 },
      /** the rail's radius — the curvature the sheet is wrapped to */
      uRadius: { value: 3.2 },
      uOpacity: { value: 1 },
      /** the archive stepping back while one case is read */
      uDim: { value: 0 },
      /** pointer-over affordance, 0…1 */
      uHover: { value: 0 },
      uDark: { value: new Color('#07120e') },
      uWarm: { value: new Color('#f7e4b1') },
      uGold: { value: new Color('#cfaf72') },
    },
    vertexShader: /* glsl */ `
      uniform float uBend;
      uniform float uRadius;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec3 p = position;
        // wrap the sheet around the rail: an arc of curvature uBend / uRadius
        float k = uBend / uRadius;
        if (k > 0.0001) {
          float a = position.x * k;
          p = vec3(sin(a) / k, position.y, (cos(a) - 1.0) / k);
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
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
      uniform float uDim;
      uniform float uHover;
      uniform vec3 uDark;
      uniform vec3 uWarm;
      uniform vec3 uGold;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec3 after = texture2D(uAfter, uv).rgb;
        vec3 before = texture2D(uBefore, uv).rgb;

        // the pointer opens the earlier state as a soft field, feathered to nothing
        vec2 d = (uv - uField) / vec2(0.46, 0.56);
        float field = 1.0 - smoothstep(0.55, 1.0, length(d));
        float mixAmount = clamp(max(uReveal, field * uFieldAmount), 0.0, 1.0);

        // OPACITY ONLY — both states are sampled at exactly the same uv
        vec3 col = mix(after, before, mixAmount);

        // one warm key falling across the sheet from the upper left
        float key = smoothstep(1.2, -0.1, uv.x + (1.0 - uv.y));
        col += uWarm * key * 0.07;

        // the sheet keeps its image: only a narrow mineral edge is given to the dark
        vec2 e = abs(uv - 0.5) * 2.0;
        float edge = (1.0 - smoothstep(0.9, 1.0, e.x)) * (1.0 - smoothstep(0.93, 1.0, e.y));

        // the archive steps back while one case is being read
        col = mix(col, uDark, uDim * 0.82);

        // the sheet the pointer is over warms very slightly — the only hover tell
        col += uGold * uHover * 0.045 * (1.0 - uDim);

        float a = uOpacity * edge * (1.0 - uDim * 0.35);
        if (a <= 0.003) discard;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** the rail itself: a hairline of graphite with one warm glint where the visitor is */
export function createRailMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uHere: { value: 0 }, // where the visitor stands, in 0…1 of the rail
      uGold: { value: new Color('#cfaf72') },
      uLine: { value: new Color('#8a948c') },
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
      uniform float uHere;
      uniform vec3 uGold;
      uniform vec3 uLine;
      varying vec2 vUv;
      void main() {
        float line = smoothstep(0.5, 0.0, abs(vUv.x - 0.5) * 2.0);
        float fade = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float here = smoothstep(0.03, 0.0, abs(vUv.y - uHere));
        vec3 col = mix(uLine, uGold, here);
        float a = line * fade * (0.16 + here * 0.7);
        if (a <= 0.002) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}
