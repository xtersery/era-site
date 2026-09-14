precision highp float;

// The mineral field. As the visitor leaves the section the quartz stops being
// an object and becomes the beginning of a surface. Two passes on one plane:
//
//   uPass 0 — MULTIPLY: the wall's veining appears as shading in whatever is
//   already there — the plaster, the portrait — the way structure shows through
//   a thin skin of plaster over stone; and the room's light goes with it.
//   uPass 1 — the slab itself: the clinic's wall, its colour and its
//   book-matched flow, arriving where the veins already are.
//
// Nothing morphs: a field spreads out of the stone, and the stone is found
// to have been part of it.

uniform sampler2D uMarble;   // the clinic's wall, book-matched 2 × 2
uniform sampler2D uLuma;     // its veining as luminance
uniform vec2 uStone;         // the stone's centre, in section uv
uniform float uAspect;       // section width / height
uniform float uE;            // 0 in the section … 1 settled into the wall
uniform float uSheetW;       // how much of the sheet's width the section shows (1 on desktop, ½ on the phone)
uniform float uSheetV;       // how much of its height, top-aligned
uniform float uPass;
varying vec2 vUv;

void main() {
  // the sheet is laid on the section's width (twice it on the phone, centred),
  // top-aligned, so the next section continues it below without a seam
  vec2 suv = vec2(0.5 - uSheetW * 0.5 + vUv.x * uSheetW, 1.0 - (1.0 - vUv.y) * uSheetV);
  float vein = texture2D(uLuma, suv).r;

  // the field grows out of the stone: slowly at first, then across the section
  // the front is not a circle: it runs ahead along the veins, as the surface
  // shows first where the stone's structure lies nearest the skin of plaster
  vec2 d = (vUv - uStone) * vec2(uAspect, 1.0);
  float dist = length(d) + (0.5 - vein) * 0.34;
  float reach = max(uE - 0.04, 0.0) * 2.3;
  float spread = 1.0 - smoothstep(reach - 0.3, reach + 0.4, dist);

  if (uPass < 0.5) {
    // the veins as shading; the light leaving the room
    float veinStrength = 0.06 + 0.1 * smoothstep(0.0, 0.6, uE);
    float dim = 0.03 + 0.1 * smoothstep(0.1, 0.75, uE);
    float factor = 1.0 - spread * (veinStrength * (1.0 - vein) + dim);
    gl_FragColor = vec4(vec3(factor), 1.0);
    return;
  }

  // the slab: its colour and depth unfold from the stone behind the veins —
  // a second, later front, not a fade
  vec3 slab = texture2D(uMarble, suv).rgb;
  // the room's key light from the upper left still falls on the surface
  slab *= 0.9 + 0.18 * smoothstep(0.0, 1.0, (1.0 - vUv.x) * 0.5 + vUv.y * 0.5);
  float reachSlab = max(uE - 0.35, 0.0) * 2.2;
  float slabAmount = (1.0 - smoothstep(reachSlab - 0.3, reachSlab + 0.4, dist)) * smoothstep(0.35, 0.5, uE);
  gl_FragColor = vec4(slab, slabAmount);
  #include <colorspace_fragment>
}
