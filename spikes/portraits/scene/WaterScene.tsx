import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  DataTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PlaneGeometry,
  RepeatWrapping,
  RGFormat,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  Vector2,
  Vector4,
  type Texture,
} from 'three';

import { WALL } from '../../founder/Founder';
import marbleUrl from '../assets/marble.jpg';
import compositeFrag from './composite.frag?raw';
import compositeVert from './composite.vert?raw';
import { createWall, type SceneDiag, type ShardState, type StonePlace } from './ShardScene';
import glintsFrag from './glints.frag?raw';
import { PORTRAIT_ASPECT } from '../people';
import { PASSAGE } from './passage';

export { PASSAGE };
import { debugTools } from '@/lib/env';

/**
 * Water as light — the glints — and the passage in which that light settles
 * into the wall of the clinic.
 *
 * AT REST (docs/references/water-glints-ref.png): nothing pours. The room is
 * lit by water somewhere out of frame: a slow caustic network lies on the
 * boundary between the wall and the frame and over the picture's backdrop —
 * never over her face — warm (one key, champagne), the faintest forest in the
 * cells between the light, the backdrop bending by a hair beneath it. A mood,
 * not an object. The change of specialist still comes out of that line (the
 * composite's front).
 *
 * THE PASSAGE (`state.exit` = t, 0 → 1, scrubbed by the page's scroll over the
 * pin's last `EXIT` vh, with a soft finish — see `PASSAGE` and `Sitting`):
 * the same light spreads over the whole view and grows as the view comes
 * closer; its motion slows to stillness and its cells draw out along the flow
 * of the wall's veins — light sliding on a surface, a liquid settling; the
 * threads thin into lines and inside them the wall's own structure rises
 * (its veins first, gilded by the light, then the slab); the glints settle
 * into the veins and go out; what is left is the sheet exactly as the
 * founder's room lays it (`.founder__wall`) — the project's approved marble
 * (`assets/marble.jpg`, cut from `docs/references/wallpapers.png` at native
 * scale; `WALL` in `spikes/founder/Founder.tsx` is the one rule both lay it
 * by). Every quantity is a continuous function of t; nothing is a stage or a
 * crossfade.
 *
 * One full-view plane, one draw call; the room is painted by the scene so the
 * light's bend is exact and needs no extra pass. `glints.frag`.
 */



interface Props {
  portraits: readonly string[];
  state: React.MutableRefObject<ShardState>;
  phone: boolean;
  frame: { x: number; y: number; w: number; h: number };
  place: StonePlace;
  still: boolean;
  onReady?: () => void;
  onDiag?: (d: SceneDiag) => void;
  /** a composing page's choice: `demand` while the section is far off screen */
  frameloop?: 'always' | 'demand';
}

const WORLD_H = 10;
const FOV = 30;
const CAM_Z = WORLD_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const LIGHT_Z = 0.5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

/** the light's line for the frame's front: straight, its full width */
function createStreamProfile(): DataTexture {
  const rows = 4;
  const data = new Uint8Array(rows * 2);
  for (let r = 0; r < rows; r++) { data[r * 2] = 0; data[r * 2 + 1] = 255; }
  const t = new DataTexture(data, 1, rows, RGFormat, UnsignedByteType);
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * `onLoad` asks the canvas for one frame when a texture arrives, so its GPU
 * upload happens then — at idle — and not on whatever frame next needs the
 * scene (which, with the loop on demand, was the middle of the hero's film).
 */
function usePortraitTextures(urls: readonly string[], onLoad: () => void): Texture[] {
  return useMemo(() => {
    const loader = new TextureLoader();
    return urls.map((u) => {
      const t = loader.load(u, onLoad);
      t.colorSpace = SRGBColorSpace;
      t.minFilter = LinearFilter;
      t.magFilter = LinearFilter;
      t.generateMipmaps = false;
      return t;
    });
  }, [urls, onLoad]);
}

/** cover-fit of a portrait into the frame, anchored like its DOM plate */
function fit(frameAspect: number, anchorY: number) {
  const imgAspect = PORTRAIT_ASPECT;
  const vx = Math.min(1, frameAspect / imgAspect);
  const vy = Math.min(1, imgAspect / frameAspect);
  return { repeat: new Vector2(vx, vy), offset: new Vector2((1 - vx) * 0.5, 1 - vy - anchorY * (1 - vy)) };
}

function Water({ portraits, state, phone, frame, place, still, onReady, onDiag }: Props) {
  const { scene, size, gl, invalidate } = useThree();
  const wall = useMemo(() => createWall(), []);
  const textures = usePortraitTextures(portraits, invalidate);
  const profile = useMemo(() => createStreamProfile(), []);
  const worldW = (WORLD_H * size.width) / size.height;
  const frameW = worldW * frame.w, frameH = WORLD_H * frame.h;
  const frameX = (frame.x + frame.w / 2 - 0.5) * worldW, frameY = (0.5 - frame.y - frame.h / 2) * WORLD_H;
  const frameAspect = (size.width * frame.w) / (size.height * frame.h);

  // the wall: the approved marble (WALL), with mipmaps (the shader reads it broad for the structure under the light)
  const marble = useMemo(() => {
    const t = new TextureLoader().load(marbleUrl, invalidate);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }, [invalidate]);

  // the frame: the portrait pair and the front (as approved)
  const composite = useMemo(() => {
    const mat = new ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      uniforms: {
        uOut: { value: null }, uIn: { value: null },
        uOutRepeat: { value: new Vector2(1, 1) }, uOutOffset: { value: new Vector2() },
        uInRepeat: { value: new Vector2(1, 1) }, uInOffset: { value: new Vector2() },
        uProfile: { value: profile },
        uStone: { value: new Vector2(1.2, 0.5) },
        uStoneSize: { value: new Vector2(0.14, 0.56) },
        uSkew: { value: 0 },
        uWake: { value: 0.16 },
        uAmount: { value: 0.05 },
        uAspect: { value: 1 },
        uSettle: { value: 1 },
        uFront: { value: 0 },
        uVeil: { value: 0 },
        uWallTone: { value: new Color('#e9ebe6') },
      },
    });
    return new Mesh(new PlaneGeometry(1, 1), mat);
  }, [profile]);

  // the light: one plane over the whole view
  const water = useMemo(() => {
    const field = phone ? PASSAGE.field.phone : PASSAGE.field.desktop;
    const mat = new ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: glintsFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPortrait: { value: null }, uRepeat: { value: new Vector2(1, 1) }, uOffset: { value: new Vector2() },
        uFrame: { value: new Vector4() }, uWallTone: { value: new Color('#e9ebe6') },
        uMarble: { value: marble },
        uSheet: { value: new Vector4() }, uView: { value: new Vector4() }, uAspect: { value: 1 },
        uTime: { value: 0 }, uT: { value: 0 },
        uField: { value: new Vector2(place.x, field.hw) },
        uGlint: { value: PASSAGE.glint },
        uFace: { value: phone ? PASSAGE.face.phone : PASSAGE.face.desktop },
        uPointer: { value: new Vector2() }, uPhone: { value: phone ? 1 : 0 },
      },
    });
    const m = new Mesh(new PlaneGeometry(1, 1), mat);
    m.renderOrder = 10;
    m.frustumCulled = false;
    return m;
  }, [marble, place.x, phone]);

  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const ready = useRef(false);
  const reportedCalls = useRef(-1);

  // the pointer: the key light and the refraction answer it a hair — nothing follows it
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [still]);

  useEffect(() => {
    onDiag?.({ stoneMounted: true, layers: 'water' });
    scene.add(wall, composite, water);
    return () => {
      scene.remove(wall, composite, water);
      marble.dispose();
      (wall.material as MeshBasicMaterial).map?.dispose();
      profile.dispose();
      (composite.material as ShaderMaterial).dispose();
      (water.material as ShaderMaterial).dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, wall, composite, water, marble, profile, textures]);

  // the water's own time: accumulated from clamped steps, so it runs on from where it was
  // when the page parks and wakes the canvas (R3F resets the root clock on every frameloop switch)
  const clockTime = useRef(0);
  useFrame((_, delta) => {
    const s = state.current;
    clockTime.current += Math.min(Math.max(delta, 0), 0.05);
    const time = still ? 0 : clockTime.current;
    if (!ready.current) {
      ready.current = true; onReady?.(); onDiag?.({ firstFrame: true, stoneVisible: true });
      if (debugTools) (window as unknown as Record<string, unknown>)['__three'] = { scene, composite, wall, water };
    }
    // the draw-call readout is reported only when it changes: a report is a
    // React state write in the section, and one per frame would re-render the
    // section — and, through the canvas, request the next frame — for ever,
    // even with `frameloop="demand"` and the room five viewports away
    if (gl.info.render.calls !== reportedCalls.current) {
      reportedCalls.current = gl.info.render.calls;
      onDiag?.({ drawCalls: reportedCalls.current });
    }

    // the room, painted by the scene at all times
    wall.scale.set(worldW - frameW + 0.02, WORLD_H, 1);
    wall.position.set(frameX - frameW / 2 - (worldW - frameW) / 2, 0, -0.02);
    composite.scale.set(frameW, frameH, 1);
    composite.position.set(frameX, frameY, 0);

    const on = s.on;
    const outIdx = on ? s.from : s.current;
    const inIdx = on ? s.next : s.current;
    const fOut = fit(frameAspect, on ? s.anchorFrom : s.anchorCurrent);
    const fIn = fit(frameAspect, on ? s.anchorNext : s.anchorCurrent);
    const u = (composite.material as ShaderMaterial).uniforms;
    u['uOut']!.value = textures[outIdx] ?? null;
    u['uIn']!.value = textures[inIdx] ?? null;
    (u['uOutRepeat']!.value as Vector2).copy(fOut.repeat);
    (u['uOutOffset']!.value as Vector2).copy(fOut.offset);
    (u['uInRepeat']!.value as Vector2).copy(fIn.repeat);
    (u['uInOffset']!.value as Vector2).copy(fIn.offset);

    // the front of the change leaves the light's line on the boundary
    const f = on ? s.f : 0;
    const lineX = (place.x - 0.5) * worldW;
    (u['uStone']!.value as Vector2).set(0.5 + (lineX - frameX) / frameW, 0.5);
    (u['uStoneSize']!.value as Vector2).set((0.016 * worldW) / frameW, 0.5);
    u['uSkew']!.value = 0;
    u['uAspect']!.value = frameAspect;
    u['uWake']!.value = phone ? 0.2 : 0.16;
    u['uAmount']!.value = phone ? 0.06 : 0.05;
    const travel = smooth(clamp(f / 0.85, 0, 1));
    u['uFront']!.value = on ? travel : 0;
    u['uSettle']!.value = on ? Math.max(0, (f - 0.85) / 0.15) : 1;
    // leaving: the picture recedes into the plaster, gradually, before the water reaches it
    u['uVeil']!.value = smooth((clamp(s.exit, 0, 1) - 0.24) / 0.36);

    // ---- the light ----
    const t = clamp(s.exit, 0, 1);
    const pt = pointer.current;
    pt.x += (pt.tx - pt.x) * 0.03;
    pt.y += (pt.ty - pt.y) * 0.03;
    // the plane rides at LIGHT_Z and exactly fills the view; its uv maps to the section's rect
    const k = (CAM_Z - LIGHT_Z) / CAM_Z;
    water.position.set(0, 0, LIGHT_Z);
    water.scale.set(worldW * k, WORLD_H * k, 1);
    const wu = (water.material as ShaderMaterial).uniforms;
    (wu['uView']!.value as Vector4).set(-worldW / 2, -WORLD_H / 2, worldW / 2, WORLD_H / 2);
    (wu['uFrame']!.value as Vector4).set(frameX - frameW / 2, frameY - frameH / 2, frameX + frameW / 2, frameY + frameH / 2);
    wu['uPortrait']!.value = textures[s.current] ?? null;
    const fc = fit(frameAspect, s.anchorCurrent);
    (wu['uRepeat']!.value as Vector2).copy(fc.repeat);
    (wu['uOffset']!.value as Vector2).copy(fc.offset);
    // the sheet exactly as the founder's room lays it: on the view's width (twice it on the phone), centred, its top WALL.top up
    const sheetW = worldW * (phone ? WALL.width.phone : WALL.width.desktop);
    (wu['uSheet']!.value as Vector4).set(-sheetW / 2, WORLD_H / 2 + WALL.top * sheetW, sheetW, sheetW * WALL.aspect);
    wu['uAspect']!.value = size.width / size.height;
    wu['uTime']!.value = time;
    wu['uT']!.value = t;
    (wu['uPointer']!.value as Vector2).set(pt.x, pt.y);
  });

  return null;
}

export function WaterScene(props: Props) {
  const { onDiag, frameloop = 'always' } = props;
  return (
    <Canvas
      frameloop={frameloop}
      data-scene="water"
      data-frameloop={frameloop}
      className="frame__canvas"
      dpr={[1, 1.5]}
      // never takes the pointer, so never re-measured on scroll (a frame after every scroll, screens away)
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      style={{ pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: true }}
      camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, CAM_Z] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping;
        gl.setClearColor('#000000', 0);
        const ctx = gl.getContext();
        const info = ctx.getExtension('WEBGL_debug_renderer_info');
        const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'masked';
        onDiag?.({ canvasCreated: true, webgl2: ctx instanceof WebGL2RenderingContext, renderer });
      }}
    >

      <Water {...props} />
    </Canvas>
  );
}
