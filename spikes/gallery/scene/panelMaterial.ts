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
 * face cannot move); the archive recedes into the mineral dark with depth, along
 * its own curved surface; the sheet keeps a soft mineral edge and a warm key;
 * and the case the visitor has arrived at carries one fine gold edge — light,
 * not decoration — which is how she knows it is the one she can take out.
 */
export function createPanelMaterial(after: Texture, before: Texture, radius: number, dock: number): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    // transparent sheets are sorted back to front by the renderer; writing depth
    // as well is what makes them cut into each other, so they do not
    depthWrite: false,
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
      uRadius: { value: radius },
      uOpacity: { value: 1 },
      /** the archive stepping back while one case is read */
      uDim: { value: 0 },
      /** the gold edge, 0…1 — the docked case, and a sheet under the pointer */
      uEdge: { value: 0 },
      /** contrast and colour leaving the sheet with distance */
      uFlat: { value: 0 },
      /** whether the mineral dark gathers along the sheet with depth (off when it stands open) */
      uFog: { value: 1 },
      /** the distance at which the fog begins — the dock is always clear */
      uFogNear: { value: dock + 0.4 },
      uDark: { value: new Color('#07120e') },
      uWarm: { value: new Color('#f7e4b1') },
      uGold: { value: new Color('#d3b478') },
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
      uniform float uEdge;
      uniform float uFlat;
      uniform float uFog;
      uniform float uFogNear;
      uniform vec3 uDark;
      uniform vec3 uWarm;
      uniform vec3 uGold;
      varying vec2 vUv;
      varying float vDepth;

      // the far end of a receding sheet also thins out, so it dissolves into the ground
      float edgeAlpha(float full, float fog) { return full * (1.0 - fog * 0.55); }

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
        float full = (1.0 - smoothstep(0.9, 1.0, e.x)) * (1.0 - smoothstep(0.93, 1.0, e.y));

        // a case standing back on the rail loses contrast and colour
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, mix(vec3(l), uDark, 0.42), uFlat * 0.72);

        // and the mineral dark gathers along its surface with depth, so a curved
        // sheet turns away into the fog rather than being uniformly dimmed
        float fog = 1.0 - exp(-pow(max(0.0, vDepth - uFogNear) * 0.22, 2.0));
        col = mix(col, uDark, fog * uFog * 0.85);

        // the archive steps back while one case is being read
        col = mix(col, uDark, uDim * 0.82);

        // one fine gold glint just inside the mineral fade — a lit edge, not a frame:
        // it lives where the key falls (upper left) and dies away along the far edges
        float em = max(e.x, e.y * 0.965);
        float rim = exp(-pow((em - 0.905) / 0.0045, 2.0));
        float lit = smoothstep(1.35, 0.15, uv.x + (1.0 - uv.y));
        col += uGold * rim * uEdge * (0.03 + 0.42 * lit) * (1.0 - fog * uFog);

        float a = uOpacity * edgeAlpha(full, fog * uFog) * (1.0 - uDim * 0.3);
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
      uDim: { value: 0 }, // the rail recedes with the archive while a case is open
      uGold: { value: new Color('#d3b478') },
      uLine: { value: new Color('#96a09a') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uHere;
      uniform float uDim;
      uniform vec3 uGold;
      uniform vec3 uLine;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        // the glint sits where the visitor stands and breathes out along the rail
        float here = smoothstep(0.09, 0.0, abs(vUv.x - uHere));
        vec3 col = mix(uLine, uGold, here);
        float fog = 1.0 - exp(-pow(max(0.0, vDepth - 5.0) * 0.11, 2.0));
        float a = (0.22 + here * 0.62) * (1.0 - fog) * (1.0 - uDim * 0.6);
        if (a <= 0.002) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}
