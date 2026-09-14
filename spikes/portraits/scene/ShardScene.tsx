import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MultiplyBlending,
  NoToneMapping,
  PlaneGeometry,
  ClampToEdgeWrapping,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Color,
  Vector2,
  type Texture,
} from 'three';

import quartzUrl from '../../../src/assets/smoky-quartz.png';
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import marbleUrl from '../assets/marble.jpg';
import marbleLumaUrl from '../assets/marble-luma.jpg';
import compositeFrag from './composite.frag?raw';
import compositeVert from './composite.vert?raw';
import marbleFrag from './marble.frag?raw';
import reliefFrag from './relief.frag?raw';
import reliefVert from './relief.vert?raw';
import { createEdgeProfile, createQuartzGeometry, createRidgeMap, QUARTZ_ASPECT } from './quartzGeometry';
import { trace } from './quartzTrace';

/**
 * The quartz as a resident of the layout, and the mediator of the change.
 *
 * The canvas covers the whole section. The stone stands on the boundary
 * between the wall and the frame, on the left half, near the words — the
 * name crosses in front of it — and stays: a slow breath at rest. When the
 * specialist changes, the change comes OUT of the stone: the arriving portrait
 * is first seen inside the stone's clear zones, then a front leaves the
 * stone's edge and moves across the frame, the departing portrait compressed
 * ahead of it, the arriving one drawn out behind it and settling. The stone
 * turns a few degrees as the front leaves it and settles back. The front's
 * shape is the stone's own edge, rounded beyond its ends. Remove the stone
 * and there is no source for the change.
 *
 * The scene paints the wall and the frame itself (the DOM plates and wall
 * remain beneath for the no-WebGL path), so the stone's transmission sees
 * what a stone there would see. The canvas takes no pointer.
 */
export interface ShardState {
  /** a transition is in progress */
  on: boolean;
  /** the transition, 0…1 */
  f: number;
  /** the portrait being left and the one arriving, with their crop anchors (object-position y, 0…1) */
  from: number;
  next: number;
  anchorFrom: number;
  anchorNext: number;
  /** the current portrait at rest (the frame is painted by the scene at all times) */
  current: number;
  anchorCurrent: number;
  /** the exit: 0 in the section … 1 settled into the marble wall */
  exit: number;
}

/** where the stone lives, in fractions of the section */
export interface StonePlace {
  /** centre, 0…1 of the section width and height */
  x: number;
  y: number;
  /** height, 0…1 of the section height */
  h: number;
  /** narrower than the photograph's proportion by this */
  narrow: number;
}

export interface SceneDiag {
  canvasCreated?: boolean;
  renderer?: string;
  webgl2?: boolean;
  quartz?: 'loading' | 'ok' | string;
  stoneMounted?: boolean;
  firstFrame?: boolean;
  stoneVisible?: boolean;
  drawCalls?: number;
  layers?: string;
  error?: string;
}

interface Props {
  portraits: readonly string[];
  state: React.MutableRefObject<ShardState>;
  phone: boolean;
  /** the frame's box in fractions of the section: left, top, width, height */
  frame: { x: number; y: number; w: number; h: number };
  place: StonePlace;
  still: boolean;
  onReady?: () => void;
  onDiag?: (d: SceneDiag) => void;
}

const WORLD_H = 10;
const FOV = 30;
/** the camera distance at which a plane WORLD_H tall exactly fills the view */
const CAM_Z = WORLD_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const STONE_Z = 1.5;
/** the wall sheet: 836 × 1882 (height / width), the section's top 195 px down it */
const SHEET_ASPECT = 1882 / 836;
const SHEET_TOP = 195 / 1882;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

function usePortraitTextures(urls: readonly string[]): Texture[] {
  return useMemo(() => {
    const loader = new TextureLoader();
    return urls.map((u) => {
      const t = loader.load(u);
      t.colorSpace = SRGBColorSpace;
      t.minFilter = LinearFilter;
      t.magFilter = LinearFilter;
      t.generateMipmaps = false;
      return t;
    });
  }, [urls]);
}

/**
 * The stone's surface and inside, from the photograph itself: its crop box
 * drawn to four maps — the photograph as the colour (its real facets,
 * fractures and smoke, lifted only a little), a transmission map from its
 * luminance (the clear zones let the next portrait through, the dense smoke
 * does not), a roughness map (dark smoke is cloudier), and a bump map (the
 * fractures and planes).
 */
function createQuartzMaps(photo: Texture, box: { x: number; y: number; w: number; h: number }) {
  const img = photo.image as HTMLImageElement;
  const W = 512, H = Math.round(512 / (box.w / box.h));
  const draw = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')!] as const; };
  // the colour: the photograph, a little smokier and quieter — toward the
  // taupe of its own shadowed zones, contrast eased, so it sits in the light
  // of the room rather than in its own
  const [tc, tg] = draw();
  tg.fillStyle = '#8f8479';
  tg.fillRect(0, 0, W, H);
  tg.globalAlpha = 0.78;
  tg.filter = 'contrast(0.82) saturate(0.82) brightness(1.04)';
  tg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  tg.filter = 'none';
  tg.globalAlpha = 1;
  // the interior as it is: the photograph in its box, alpha outside the
  // silhouette, no grade — what the wall takes up from the stone
  const [ic, ig] = draw();
  ig.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  // luminance → transmission, roughness, bump
  const [lc, lg] = draw();
  lg.fillStyle = '#6a6a6a';
  lg.fillRect(0, 0, W, H);
  lg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  const d = lg.getImageData(0, 0, W, H);
  const n = d.data.length;
  const trans = new Uint8ClampedArray(n), rough = new Uint8ClampedArray(n), bump = new Uint8ClampedArray(n);
  const bodyAlpha = new Uint8ClampedArray(n), clearAlpha = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i += 4) {
    const l = (0.2126 * d.data[i]! + 0.7152 * d.data[i + 1]! + 0.0722 * d.data[i + 2]!) / 255;
    const clear = 0.12 + 0.88 * Math.pow(l, 1.4); // how clear the stone is here (its own smoke decides)
    const t = Math.round(clear * 255);
    const r = Math.round((0.28 + 0.6 * (1 - l)) * 255);
    const b = Math.round(l * 255);
    // the body: opaque in the smoke, thinning where the stone is clear — so the
    // portrait behind shows through the clear zones with no transmission pass at all
    const ba = Math.round((1 - 0.66 * clear) * 255);
    // the glass layer over it: present only where the stone is clear
    const ca = Math.round(Math.pow(clear, 1.2) * 0.9 * 255);
    trans[i] = trans[i + 1] = trans[i + 2] = t; trans[i + 3] = 255;
    rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255;
    bump[i] = bump[i + 1] = bump[i + 2] = b; bump[i + 3] = 255;
    bodyAlpha[i] = bodyAlpha[i + 1] = bodyAlpha[i + 2] = ba; bodyAlpha[i + 3] = 255;
    clearAlpha[i] = clearAlpha[i + 1] = clearAlpha[i + 2] = ca; clearAlpha[i + 3] = 255;
  }
  const [xc, xg] = draw(); xg.putImageData(new ImageData(trans, W, H), 0, 0);
  const [rc, rg] = draw(); rg.putImageData(new ImageData(rough, W, H), 0, 0);
  const [bc, bg] = draw(); bg.putImageData(new ImageData(bump, W, H), 0, 0);
  const [ac, ag] = draw(); ag.putImageData(new ImageData(bodyAlpha, W, H), 0, 0);
  const [cc, cg] = draw(); cg.putImageData(new ImageData(clearAlpha, W, H), 0, 0);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(c);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = ClampToEdgeWrapping;
    return t;
  };
  return { tint: tex(tc, true), interior: tex(ic, true), trans: tex(xc, false), rough: tex(rc, false), bump: tex(bc, false), bodyAlpha: tex(ac, false), clearAlpha: tex(cc, false) };
}

/** the wall as the scene sees it: the same light mineral surface as the CSS, drawn once */
function createWall(): Mesh {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#e9ebe6');
  g.addColorStop(0.7, '#e9ebe6');
  g.addColorStop(1, '#dfe3dd');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: t, toneMapped: false }));
}

/** the shadow the stone throws on the portrait: a soft pool, drawn once */
function createShadow(): Mesh {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const ctx = c.getContext('2d')!;
  // an ellipse that reaches zero before the canvas edges on every side
  ctx.save();
  ctx.translate(128, 256);
  ctx.scale(1, 2);
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 120);
  g.addColorStop(0, 'rgba(8, 12, 10, 0.3)');
  g.addColorStop(0.55, 'rgba(8, 12, 10, 0.13)');
  g.addColorStop(1, 'rgba(8, 12, 10, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-128, -128, 256, 256);
  ctx.restore();
  const t = new CanvasTexture(c);
  return new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
}

/** cover-fit of a 4 : 5 portrait into the frame, anchored like its DOM plate */
function fit(frameAspect: number, anchorY: number) {
  const imgAspect = 4 / 5;
  const vx = Math.min(1, frameAspect / imgAspect);
  const vy = Math.min(1, imgAspect / frameAspect);
  return { repeat: new Vector2(vx, vy), offset: new Vector2((1 - vx) * 0.5, 1 - vy - anchorY * (1 - vy)) };
}

/** loads the reference explicitly — success and failure are both reported, nothing suspends */
function useQuartzPhoto(onDiag?: (d: SceneDiag) => void): Texture | null {
  const [photo, setPhoto] = useState<Texture | null>(null);
  useEffect(() => {
    onDiag?.({ quartz: 'loading' });
    const loader = new TextureLoader();
    loader.load(
      quartzUrl,
      (t) => { setPhoto(t); onDiag?.({ quartz: 'ok' }); },
      undefined,
      (e) => { onDiag?.({ quartz: `error: ${(e as ErrorEvent)?.message ?? 'image failed to load'}` }); },
    );
  }, [onDiag]);
  return photo;
}

function Quartz(props: Props) {
  const photo = useQuartzPhoto(props.onDiag);
  if (!photo) return null;
  return <QuartzBody {...props} photo={photo} />;
}

function QuartzBody({ portraits, state, phone, frame, place, still, onReady, onDiag, photo }: Props & { photo: Texture }) {
  const { scene, size, gl } = useThree();
  const wall = useMemo(() => createWall(), []);
  const textures = usePortraitTextures(portraits);
  const env = useMemo(() => createEraEnvironment(1024, 512), []);
  const maps = useMemo(() => createQuartzMaps(photo, trace.box), [photo]);
  const profile = useMemo(() => createEdgeProfile(), []);
  const ridge = useMemo(() => createRidgeMap(5), []);
  const worldW = (WORLD_H * size.width) / size.height;
  // the frame's box in world units
  const frameW = worldW * frame.w, frameH = WORLD_H * frame.h;
  const frameX = (frame.x + frame.w / 2 - 0.5) * worldW, frameY = (0.5 - frame.y - frame.h / 2) * WORLD_H;
  const frameAspect = (size.width * frame.w) / (size.height * frame.h);

  // the marble: the clinic's wall, loaded once; the field plane that carries it
  const marble = useMemo(() => {
    const loader = new TextureLoader();
    const load = (u: string) => { const t = loader.load(u); t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; return t; };
    const luma = loader.load(marbleLumaUrl);
    luma.wrapS = luma.wrapT = RepeatWrapping;
    return { sheet: load(marbleUrl), luma };
  }, []);
  const field = useMemo(() => {
    const uniforms = () => ({
      uMarble: { value: marble.sheet },
      uLuma: { value: marble.luma },
      uStoneTex: { value: maps.interior },
      uProfile: { value: profile },
      uRidge: { value: ridge },
      uStone: { value: new Vector2(0.45, 0.6) },
      uStoneSize: { value: new Vector2(0.1, 0.3) },
      uAspect: { value: 1.6 },
      uE: { value: 0 },
      uSheetW: { value: 1 },
      uSheetV: { value: 0.28 },
      uSheetTop: { value: SHEET_TOP },
      uPass: { value: 0 },
    });
    // pass 0: the veins as shading in what is there (multiply); pass 1: the slab
    const shade = new ShaderMaterial({ vertexShader: compositeVert, fragmentShader: marbleFrag, transparent: true, depthWrite: false, blending: MultiplyBlending, premultipliedAlpha: true, uniforms: uniforms() });
    const slab = new ShaderMaterial({ vertexShader: compositeVert, fragmentShader: marbleFrag, transparent: true, depthWrite: false, uniforms: uniforms() });
    slab.uniforms['uPass']!.value = 1;
    const geo = new PlaneGeometry(1, 1);
    const a = new Mesh(geo, shade);
    a.renderOrder = 2;
    const b = new Mesh(geo, slab);
    b.renderOrder = 3;
    const g = new Group();
    g.add(a, b);
    return Object.assign(g, { shade, slab });
  }, [marble, maps, profile, ridge]);
  // and its relief: the facets' shading multiplied into the slab
  const relief = useMemo(
    () => new ShaderMaterial({ vertexShader: reliefVert, fragmentShader: reliefFrag, transparent: true, depthWrite: false, blending: MultiplyBlending, premultipliedAlpha: true, uniforms: { uK: { value: 0 } } }),
    [],
  );
  // the visible plane: the field around the stone
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

  // the stone: the photograph's proportion, at its place on the boundary
  const stoneH = WORLD_H * place.h;
  const narrow = place.narrow;
  const stoneW = stoneH * QUARTZ_ASPECT * narrow;
  const stoneX = (place.x - 0.5) * worldW, stoneY = (0.5 - place.y) * WORLD_H;
  const geometry = useMemo(
    () => createQuartzGeometry({ height: stoneH, depth: phone ? 1.0 : 1.3, narrow, seed: 5 }),
    [stoneH, narrow, phone],
  );
  const shadow = useMemo(() => createShadow(), []);
  // the stone, in two layers. THE BODY cannot fail: a stock physical material
  // with the photograph as its colour, opaque in the smoke and thinning in the
  // clear zones (an alpha map), clearcoat and the environment for its polish —
  // no transmission pass, nothing custom. THE GLASS lies over the clear zones
  // only and adds transmission — the bend and the softening — where the
  // renderer supports the transmission pass; where it does not, the body alone
  // is still the stone. `?mat=body` shows the body alone.
  const bodyOnly = useMemo(() => new URLSearchParams(location.search).get('mat') === 'body', []);
  const body = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: maps.tint,
        alphaMap: maps.bodyAlpha,
        transparent: true,
        opacity: 0.86,
        depthWrite: true,
        roughness: 0.58,
        roughnessMap: maps.rough,
        bumpMap: maps.bump,
        bumpScale: 0.04,
        color: new Color('#e4ddd3'),
        clearcoat: 0.35,
        clearcoatRoughness: 0.24,
        envMapIntensity: 0.7,
        toneMapped: false,
      }),
    [maps],
  );
  // the fragments at the edges: the same stone, further off, quieter still
  const fragmentBody = useMemo(() => {
    const m = body.clone();
    m.opacity = 0.62;
    m.envMapIntensity = 0.5;
    m.clearcoat = 0.2;
    return m;
  }, [body]);
  const glass = useMemo(
    () =>
      new MeshPhysicalMaterial({
        alphaMap: maps.clearAlpha,
        transparent: true,
        depthWrite: false,
        transmission: 0.9,
        thickness: phone ? 1.0 : 1.3,
        ior: 1.54,
        roughness: 0.46,
        roughnessMap: maps.rough,
        attenuationColor: new Color('#8f847b'),
        attenuationDistance: 4,
        color: new Color('#ffffff'),
        clearcoat: 0.2,
        clearcoatRoughness: 0.24,
        envMapIntensity: 0.45,
        toneMapped: false,
      }),
    [maps, phone],
  );
  // the fragments: where they lie in the section (fractions), their size, their depth, their own slow drift
  const fragments = useMemo(
    () =>
      (phone
        ? [
            { x: 1.03, y: 0.3, h: 0.16, z: 0.5, rot: [0.2, -0.6, 0.9], seed: 1 },
            { x: -0.03, y: 0.92, h: 0.13, z: 0.35, rot: [-0.3, 0.5, -1.2], seed: 2 },
          ]
        : [
            { x: 0.985, y: 0.72, h: 0.26, z: 0.55, rot: [0.25, -0.7, 0.95], seed: 1 },
            { x: 0.905, y: 0.03, h: 0.18, z: 0.35, rot: [-0.4, 0.4, -1.1], seed: 2 },
            { x: 0.06, y: 1.03, h: 0.2, z: 0.3, rot: [0.3, 0.9, 0.5], seed: 3 },
          ]) as { x: number; y: number; h: number; z: number; rot: [number, number, number]; seed: number }[],
    [phone],
  );
  const fragmentRefs = useRef<(Group | null)[]>([]);
  const stone = useRef<Group>(null);
  const ready = useRef(false);

  useEffect(() => {
    onDiag?.({ stoneMounted: true, layers: bodyOnly ? 'body' : 'body + glass' });
    scene.environment = env;
    scene.add(wall);
    scene.add(composite);
    scene.add(shadow);
    scene.add(field);
    return () => {
      scene.environment = null;
      scene.remove(wall);
      scene.remove(composite);
      scene.remove(shadow);
      field.shade.dispose(); field.slab.dispose();
      marble.sheet.dispose(); marble.luma.dispose();
      relief.dispose(); ridge.dispose();
      (wall.material as MeshBasicMaterial).map?.dispose();
      env.dispose();
      body.dispose();
      fragmentBody.dispose();
      glass.dispose();
      maps.tint.dispose(); maps.interior.dispose(); maps.trans.dispose(); maps.rough.dispose(); maps.bump.dispose();
      profile.dispose();
      geometry.dispose();
      (composite.material as ShaderMaterial).dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, env, wall, composite, shadow, field, marble, relief, ridge, maps, profile, geometry, body, fragmentBody, glass, textures]);

  useFrame(({ clock }) => {
    const s = state.current;
    const mesh = stone.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    if (!ready.current) {
      ready.current = true; onReady?.(); onDiag?.({ firstFrame: true });
      // the scene's objects, for the diagnostic console (`window.__three`)
      (window as unknown as Record<string, unknown>)['__three'] = { scene, composite, field, wall, shadow, stone: mesh };
    }
    onDiag?.({ stoneVisible: true, drawCalls: gl.info.render.calls });

    // the wall and the frame, painted by the scene at all times
    wall.scale.set(worldW - frameW + 0.02, WORLD_H, 1);
    wall.position.set(frameX - frameW / 2 - (worldW - frameW) / 2, 0, -0.02);
    composite.scale.set(frameW, frameH, 1);
    composite.position.set(frameX, frameY, 0);

    // which portraits the frame shows: at rest the current one, in a transition the pair
    const on = s.on;
    const outIdx = on ? s.from : s.current;
    const inIdx = on ? s.next : s.current;
    const texOut = textures[outIdx], texIn = textures[inIdx];
    const fOut = fit(frameAspect, on ? s.anchorFrom : s.anchorCurrent);
    const fIn = fit(frameAspect, on ? s.anchorNext : s.anchorCurrent);
    const u = (composite.material as ShaderMaterial).uniforms;
    u['uOut']!.value = texOut ?? null;
    u['uIn']!.value = texIn ?? null;
    (u['uOutRepeat']!.value as Vector2).copy(fOut.repeat);
    (u['uOutOffset']!.value as Vector2).copy(fOut.offset);
    (u['uInRepeat']!.value as Vector2).copy(fIn.repeat);
    (u['uInOffset']!.value as Vector2).copy(fIn.offset);

    // the exit: the field grows out of the stone, and the stone settles into it
    const e = clamp(s.exit, 0, 1);
    // the sheet (836 × 1882, a vertical mirror pair) is laid on the section's
    // width on desktop, on twice it on the phone, its top SHEET_TOP down
    const sheetW = phone ? 0.5 : 1;
    const sheetV = ((size.height / size.width) * sheetW) / SHEET_ASPECT;
    for (const fm of [field.shade.uniforms, field.slab.uniforms]) {
      fm['uE']!.value = e;
      fm['uAspect']!.value = size.width / size.height;
      fm['uSheetW']!.value = sheetW;
      fm['uSheetV']!.value = sheetV;
    }
    field.visible = e > 0.001;
    // the plane sits in front of the frame; scaled back so it covers the
    // viewport exactly and the sheet continues into the next section pixel for pixel
    const fieldMag = CAM_Z / (CAM_Z - 0.9);
    field.scale.set(worldW / fieldMag, WORLD_H / fieldMag, 1);
    field.position.set(0, 0, 0.9);
    // the portrait loses its light before the marble reaches it
    u['uVeil']!.value = smooth((e - 0.05) / 0.55);
    // the stone: its glass goes first (translucent → opaque mineral); then the
    // same body on the same geometry polishes — rough edges to a polished
    // surface, its smoke deepening to the wall's graphite; late, its skin gives
    // way to its own interior, expanded into the wall beneath (the field), its
    // facets kept as shading. Its shadow lifts as it comes to rest.
    const settle = smooth((e - 0.1) / 0.7);
    const polish = smooth((e - 0.15) / 0.45);
    glass.opacity = 1 - smooth(e / 0.35);
    body.opacity = 0.86 * (1 - smooth((e - 0.55) / 0.4));
    body.depthWrite = e < 0.05;
    body.roughness = 0.58 - 0.36 * polish;
    body.clearcoat = 0.35 + 0.45 * polish;
    body.clearcoatRoughness = 0.24 - 0.1 * polish;
    body.bumpScale = 0.04 * (1 - polish);
    body.envMapIntensity = 0.7 - 0.3 * polish;
    body.color.setStyle('#e4ddd3').lerp(new Color('#a09c98'), polish);
    relief.uniforms['uK']!.value = smooth((e - 0.4) / 0.45);
    fragmentBody.opacity = 0.62 * (1 - smooth(e / 0.5));
    (shadow.material as MeshBasicMaterial).opacity = 1 - smooth(e / 0.5);

    // the stone: resident, breathing; it turns a few degrees as the change leaves it
    const f = on ? s.f : 0;
    const swing = Math.sin(Math.PI * clamp(f / 0.7, 0, 1));
    const breathe = still ? 0 : 1;
    // as it settles the stone comes to rest: flat to the wall, still, thinner
    const rest = 1 - settle;
    const rotY = ((-4 + 3 * Math.sin(t * 0.23) * breathe + 7 * swing) * Math.PI / 180) * rest;
    const rotZ = ((-4 + 1.2 * Math.sin(t * 0.17 + 1) * breathe) * Math.PI / 180) * rest;
    const rotX = ((-2 + 1.5 * Math.sin(t * 0.13 + 2) * breathe) * Math.PI / 180) * rest;
    const bob = 0.05 * Math.sin(t * 0.31) * breathe * rest;
    const z = (STONE_Z + 0.25 * swing) * rest + 0.96 * settle;
    mesh.position.set(stoneX, stoneY + bob, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    // the field needs the stone where it is SEEN: it stands ahead of the plane
    {
      const m = CAM_Z / (CAM_Z - z);
      for (const fm of [field.shade.uniforms, field.slab.uniforms]) {
        (fm['uStone']!.value as Vector2).set(0.5 + (stoneX * m) / worldW, 0.5 + ((stoneY + bob) * m) / WORLD_H);
        (fm['uStoneSize']!.value as Vector2).set((stoneW * m) / (2 * worldW), (stoneH * m) / (2 * WORLD_H));
      }
    }
    // the fragments: each on its own slow drift, a little parallax with the change
    fragments.forEach((fr, i) => {
      const g = fragmentRefs.current[i];
      if (!g) return;
      g.visible = fragmentBody.opacity > 0.01;
      const ph = fr.seed * 1.7;
      const fx = (fr.x - 0.5) * worldW + (0.012 + 0.008 * fr.z) * worldW * (f - 0.5) * (i % 2 ? -1 : 1);
      const fy = (0.5 - fr.y) * WORLD_H + 0.08 * Math.sin(t * 0.19 + ph) * breathe;
      g.position.set(fx, fy, fr.z + 0.6 * settle);
      g.rotation.set(fr.rot[0] + 0.04 * Math.sin(t * 0.11 + ph) * breathe, fr.rot[1] + 0.06 * Math.sin(t * 0.14 + ph) * breathe, fr.rot[2]);
      g.scale.setScalar((fr.h * WORLD_H) / stoneH);
    });
    shadow.position.set(stoneX + stoneW * 0.3, stoneY - WORLD_H * 0.05 + bob, 0.04);
    shadow.rotation.set(0, 0, rotZ);
    shadow.scale.set(stoneW * 2.0, stoneH * 1.25, 1);

    // the field: the stone's place and edges in FRAME uv, and the front's position
    const mag = CAM_Z / (CAM_Z - z);
    const sx = 0.5 + ((stoneX - frameX) * mag) / frameW;
    const sy = 0.5 + ((stoneY + bob - frameY) * mag) / frameH;
    const halfW = ((stoneW * mag) / frameW) * 0.5 * Math.abs(Math.cos(rotY));
    const halfH = ((stoneH * mag) / frameH) * 0.5;
    (u['uStone']!.value as Vector2).set(sx, sy);
    (u['uStoneSize']!.value as Vector2).set(halfW, halfH);
    u['uSkew']!.value = -Math.tan(rotZ) * (frameH / frameW);
    u['uAspect']!.value = frameAspect;
    u['uWake']!.value = phone ? 0.2 : 0.16;
    u['uAmount']!.value = phone ? 0.06 : 0.05;
    // the front leaves the stone's edges and crosses the frame both ways; it is
    // gone past the far edge by 0.85, and the field lets go over the rest
    const travel = smooth(clamp(f / 0.85, 0, 1));
    u['uFront']!.value = on ? travel : 0;
    u['uSettle']!.value = on ? Math.max(0, (f - 0.85) / 0.15) : 1;
  });

  return (
    <>
      {/* the mineral environment: fragments of the same stone at the edges, behind the crystal, in front of the picture */}
      {fragments.map((fr, i) => (
        <group key={fr.seed} ref={(el) => { fragmentRefs.current[i] = el; }} position={[(fr.x - 0.5) * worldW, (0.5 - fr.y) * WORLD_H, fr.z]}>
          <mesh geometry={geometry} material={fragmentBody} />
        </group>
      ))}
      <group ref={stone} position={[0, 0, STONE_Z]}>
        {/* smoky quartz: the body (the photograph, opaque in the smoke), and the glass over its clear zones */}
        {/* drawn after the field, so the body composites over its own expanded interior and the relief shades both */}
        <mesh geometry={geometry} material={body} renderOrder={5} />
        <mesh geometry={geometry} material={relief} scale={[1.0, 1.0, 0.99]} renderOrder={6} />
        {!bodyOnly && <mesh geometry={geometry} material={glass} scale={[1.004, 1.004, 1.004]} renderOrder={7} />}
      </group>
      {/* one warm key from the upper left, a cool fill low right — the ERA studio */}
      <directionalLight position={[-6, 7, 6]} intensity={1.5} color="#ffe6b8" />
      <directionalLight position={[3, 9, 8]} intensity={0.9} color="#fff4de" />
      <directionalLight position={[5, -2, 4]} intensity={0.18} color="#7fb0a4" />
    </>
  );
}

export function ShardScene({ portraits, state, phone, frame, place, still, onReady, onDiag }: Props) {
  return (
    <Canvas
      className="frame__canvas"
      dpr={[1, 1.5]}
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
      <Quartz portraits={portraits} state={state} phone={phone} frame={frame} place={place} still={still} onReady={onReady} onDiag={onDiag} />
    </Canvas>
  );
}
