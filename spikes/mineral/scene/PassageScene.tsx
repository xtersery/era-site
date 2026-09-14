import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackSide,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  FogExp2,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoToneMapping,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Texture,
} from 'three';

import quartzUrl from '../../../src/assets/smoky-quartz.png';
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import marbleUrl from '../assets/wall.jpg';
import marbleLumaUrl from '../assets/wall-luma.jpg';
import portraitUrl from '../../portraits/assets/p4.jpg';
import { createQuartzGeometry, createRidgeMap, QUARTZ_ASPECT } from '../../portraits/scene/quartzGeometry';
import { trace } from '../../portraits/scene/quartzTrace';
import { createQuartzMaps, createShadow, createWall } from '../../portraits/scene/ShardScene';
import becomingFragRaw from './becoming.frag?raw';
import becomingVert from './becoming.vert?raw';
import layerFragRaw from './layer.frag?raw';
import layerVert from './layer.vert?raw';
import noiseGlsl from './noise.glsl?raw';

const becomingFrag = becomingFragRaw.replace('__NOISE__', noiseGlsl);
const layerFrag = layerFragRaw.replace('__NOISE__', noiseGlsl);

/**
 * The passage — Spike E. The camera enters the smoky quartz of the Specialists
 * section; inside, the crystal becomes the marble architecture of the clinic;
 * the camera steps back and the wall is what remains.
 *
 * One timeline t (0 → 1), read from a ref so the scroll can scrub it:
 *   A  0.00 – 0.12  the sitting: the stone resident on the boundary
 *   B  0.12 – 0.44  the camera moves toward the stone until its facets fill the view
 *   C  0.44 – 0.58  through the front face: inside — smoke, layers, facets, fog
 *   D  0.52 – 0.84  the interior becomes mineral, then slab; the shell settles into the wall's plane
 *   E  0.74 – 1.00  the camera steps back: the wall of the clinic, the stone a faint relief in its band
 */
export const WORLD_H = 10;
const FOV = 30;
export const CAM_Z = WORLD_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const STONE_Z = 1.5;
const WALL_Z = -0.05;
/** the wall sheet (1289 × 1882, three whole slabs, mirror-repeated on a seam) laid 9.25 world units wide: a slab is 3.24 units, the final view holds 2.65 */
const SHEET_W = 9.25;
const SHEET_H = SHEET_W * (1882 / 1289);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
/** 0 → 1 over [a, b], eased */
const seg = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

export interface PassageProps {
  t: React.MutableRefObject<number>;
  onReady?: () => void;
}

/** the camera's path: positions and targets at the timeline's keys */
/** a monotone cubic through (x, y) keys — Fritsch–Carlson; interior tangents never zero, so nothing stops */
function monotone(keys: readonly (readonly [number, number])[], flatEnds = true) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = Array.from({ length: n - 1 }, (_, i) => (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  m[0] = flatEnds ? 0 : d[0]!; m[n - 1] = flatEnds ? 0 : d[n - 2]!;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i]! / d[i]!, b = m[i + 1]! / d[i]!;
    const h = a * a + b * b;
    if (h > 9) { const tt = 3 / Math.sqrt(h); m[i] = tt * a * d[i]!; m[i + 1] = tt * b * d[i]!; }
  }
  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!, u = (x - xs[i]!) / h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i]! + (u3 - 2 * u2 + u) * h * m[i]! + (-2 * u3 + 3 * u2) * ys[i + 1]! + (u3 - u2) * h * m[i + 1]!;
  };
}

/**
 * The camera's path: one continuous movement. From the sitting's camera it
 * pushes toward the stone, through its face and down its length; inside it
 * curves — never stopping — and glides back out the way it came while the
 * crystal around it becomes the wall, so what it comes out into is the wall.
 * Position and target are Catmull-Rom curves; the timeline maps to ARC
 * LENGTH through a monotone cubic with non-zero tangents at every key, so
 * the speed is continuous everywhere: no stops, no stages.
 */
function useCameraPath(stoneX: number, stoneY: number) {
  return useMemo(() => {
    // (t, arc-length fraction) — where along the path each moment of the timeline is
    const posKeysT = [0, 0.14, 0.34, 0.46, 0.58, 0.72, 0.86, 1];
    const pos = new CatmullRomCurve3([
      new Vector3(0, 0, CAM_Z),
      new Vector3(stoneX - 0.7, stoneY - 0.5, 9.5),
      new Vector3(stoneX - 0.25, stoneY + 1.3, 3.4),
      new Vector3(stoneX - 0.02, stoneY + 1.9, STONE_Z + 0.62),
      new Vector3(stoneX + 0.05, stoneY + 1.35, STONE_Z + 0.05),
      new Vector3(stoneX + 0.1, stoneY + 0.55, STONE_Z + 1.5),
      new Vector3(0.1, 0.05, 5.6),
      new Vector3(0.55, 0.15, 10.05),
    ], false, 'centripetal', 0.35);
    const target = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(stoneX, stoneY, STONE_Z),
      new Vector3(stoneX, stoneY + 0.4, STONE_Z),
      new Vector3(stoneX + 0.15, stoneY - 2.2, STONE_Z - 0.25),
      new Vector3(stoneX + 0.2, stoneY - 2.9, STONE_Z - 0.55),
      new Vector3(stoneX + 0.12, stoneY + 0.25, STONE_Z - 2.0),
      new Vector3(0.25, 0.1, 0),
      new Vector3(0.55, 0.15, 0),
    ], false, 'centripetal', 0.35);
    // the arc-length fraction of each key on each curve
    const fractions = (c: CatmullRomCurve3) => {
      const lengths = c.getLengths(400);
      const total = lengths[lengths.length - 1]!;
      const n = c.points.length;
      // the length up to each control point: sample the curve param at i/(n−1)
      return Array.from({ length: n }, (_, i) => { const u = i / (n - 1); const k = Math.round(u * 400); return lengths[k]! / total; });
    };
    const posMap = monotone(posKeysT.map((tk, i) => [tk, fractions(pos)[i]!] as const), false);
    const targetMap = monotone(posKeysT.map((tk, i) => [tk, fractions(target)[i]!] as const), false);
    const u = (t: number) => clamp(posMap(t), 0, 1);
    const uTarget = (t: number) => clamp(targetMap(t), 0, 1);
    return { pos, target, u, uTarget };
  }, [stoneX, stoneY]);
}

function Passage({ t, onReady, photo }: PassageProps & { photo: Texture }) {
  const { scene, camera, size } = useThree();
  const worldW = (WORLD_H * size.width) / size.height;

  // the room: the plaster wall and the portrait, as the Specialists section lays them
  const frame = { x: 0.44, w: 0.56 };
  const place = { x: 0.455, y: 0.6, h: 0.64, narrow: 0.92 };
  const stoneH = WORLD_H * place.h;
  const stoneW = stoneH * QUARTZ_ASPECT * place.narrow;
  const stoneX = (place.x - 0.5) * worldW, stoneY = (0.5 - place.y) * WORLD_H;
  const path = useCameraPath(stoneX, stoneY);

  const env = useMemo(() => createEraEnvironment(1024, 512), []);
  const wall = useMemo(() => createWall(), []);
  const portrait = useMemo(() => {
    const tex = new TextureLoader().load(portraitUrl);
    tex.colorSpace = SRGBColorSpace;
    // cover-fit a 4 : 5 portrait into the frame, anchored at 28 % like its plate
    const frameAspect = (worldW * frame.w) / WORLD_H, img = 4 / 5;
    const vx = Math.min(1, frameAspect / img), vy = Math.min(1, img / frameAspect);
    tex.repeat.set(vx, vy); tex.offset.set((1 - vx) * 0.5, 1 - vy - 0.28 * (1 - vy));
    return new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  }, [worldW, frame.w]);
  const shadow = useMemo(() => createShadow(), []);

  // the stone, exactly as approved: the photograph's body and its glass overlay
  const maps = useMemo(() => createQuartzMaps(photo, trace.box), [photo]);
  const ridge = useMemo(() => createRidgeMap(5), []);
  const geometry = useMemo(() => createQuartzGeometry({ height: stoneH, depth: 1.3, narrow: place.narrow, seed: 5 }), [stoneH, place.narrow]);
  const body = useMemo(() => new MeshPhysicalMaterial({
    map: maps.tint, alphaMap: maps.bodyAlpha, transparent: true, opacity: 0.86, depthWrite: true,
    roughness: 0.58, roughnessMap: maps.rough, bumpMap: maps.bump, bumpScale: 0.04,
    color: new Color('#e4ddd3'), clearcoat: 0.35, clearcoatRoughness: 0.24, envMapIntensity: 0.7, toneMapped: false,
  }), [maps]);
  const glass = useMemo(() => new MeshPhysicalMaterial({
    map: maps.tint, alphaMap: maps.clearAlpha, transparent: true, opacity: 1, depthWrite: false,
    transmission: 0.9, thickness: 1.3, ior: 1.54, roughness: 0.46, roughnessMap: maps.rough,
    attenuationColor: new Color('#a89a8c'), attenuationDistance: 4, clearcoat: 0.2, envMapIntensity: 0.45, toneMapped: false,
  }), [maps]);

  // the marble: the clinic's wall at native scale, in world units
  const marble = useMemo(() => {
    const loader = new TextureLoader();
    const load = (u: string, srgb: boolean) => { const tx = loader.load(u); if (srgb) tx.colorSpace = SRGBColorSpace; tx.wrapS = tx.wrapT = RepeatWrapping; return tx; };
    return { sheet: load(marbleUrl, true), luma: load(marbleLumaUrl, false) };
  }, []);
  const becoming = useMemo(() => {
    const uniforms = (inside: number, flatten: number) => ({
      uPhoto: { value: maps.interior }, uRidge: { value: ridge }, uMarble: { value: marble.sheet }, uLuma: { value: marble.luma },
      uBox: { value: new Vector2(stoneX, stoneY) }, uBoxHalf: { value: new Vector2(stoneW / 2, stoneH / 2) },
      // the sheet is placed so its graphite band passes through the stone and the pale slab sits left of the view's centre
      uSheet: { value: new Vector2(-3.9, -3.33) }, uSheetSize: { value: new Vector2(SHEET_W, SHEET_H) },
      uBecome: { value: 0 }, uSpread: { value: 0 }, uFogDensity: { value: 0 }, uFogColor: { value: new Color('#5a524b') },
      uKey: { value: new Vector3(-0.5, 0.55, 0.75) }, uInside: { value: inside }, uFlatten: { value: flatten }, uWallZ: { value: WALL_Z + 0.01 * (1 - inside) + 0.012 * inside }, uOpacity: { value: 1 },
    });
    const shell = new ShaderMaterial({ vertexShader: becomingVert, fragmentShader: becomingFrag, uniforms: uniforms(1, 0), side: BackSide, transparent: true });
    const wallMat = new ShaderMaterial({ vertexShader: becomingVert, fragmentShader: becomingFrag, uniforms: uniforms(0, 1) });
    return { shell, wallMat };
  }, [maps, ridge, marble, stoneX, stoneY, stoneW, stoneH]);

  // the interior: dark translucent planes of the same smoke, at the facets' angles
  // the interior: slices across the crystal's length — the viewer looks down it
  // and passes through them — each tilted a little, like sediment
  const layers = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const k = i / 5 - 0.5;
    return { y: k * 0.72, rx: Math.PI / 2 + Math.sin(i * 2.1) * 0.22, ry: Math.cos(i * 1.7) * 0.12, s: 1, seed: i };
  }), []);
  const layerMats = useMemo(() => layers.map((l) => new ShaderMaterial({
    vertexShader: layerVert, fragmentShader: layerFrag, transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uPhoto: { value: maps.interior }, uOpacity: { value: 0 }, uSeed: { value: l.seed }, uFogDensity: { value: 0 }, uFogColor: { value: new Color('#5a524b') }, uTime: { value: 0 }, uKey: { value: new Vector3(-0.5, 0.55, 0.75) } },
  })), [maps, layers]);

  const fog = useMemo(() => new FogExp2('#5a524b', 0), []);
  const stone = useRef<Mesh>(null);
  const front = useRef<Mesh>(null);
  const glassRef = useRef<Mesh>(null);
  const shellRef = useRef<Mesh>(null);
  const layerRefs = useRef<(Mesh | null)[]>([]);
  const marbleWall = useRef<Mesh>(null);
  const ready = useRef(false);

  useEffect(() => {
    scene.environment = env;
    scene.add(wall, portrait, shadow);
    return () => { scene.environment = null; scene.remove(wall, portrait, shadow); scene.fog = null; };
  }, [scene, env, wall, portrait, shadow]);

  const tmpPos = useMemo(() => new Vector3(), []);
  const tmpTarget = useMemo(() => new Vector3(), []);
  useFrame(({ clock }) => {
    const tt = clamp(t.current, 0, 1);
    const time = clock.elapsedTime;
    // review overrides from the console: window.__ov = { nofog, nolayers, noshell }
    const ov = ((window as unknown as Record<string, unknown>)['__ov'] ?? {}) as Record<string, boolean>;
    if (!ready.current) { ready.current = true; onReady?.(); (window as unknown as Record<string, unknown>)['__passage'] = { scene, camera, stone: stone.current, shell: shellRef.current, wall, portrait, marbleWall: marbleWall.current, layers: layerRefs.current, becoming, path, stoneBox: { x: stoneX, y: stoneY, w: stoneW, h: stoneH, z: STONE_Z, depth: 1.3 }, wallZ: WALL_Z }; }

    // the room
    wall.scale.set(worldW * (1 - frame.w) + 0.02, WORLD_H, 1);
    wall.position.set((frame.x / 2 - 0.5) * worldW, 0, -0.02);
    portrait.scale.set(worldW * frame.w, WORLD_H, 1);
    portrait.position.set((frame.x + frame.w / 2 - 0.5) * worldW, 0, 0);
    // the room is left behind once the viewer is inside; the marble wall stands where it stood
    const roomGone = seg(tt, 0.46, 0.56);
    (wall.material as MeshBasicMaterial).transparent = roomGone > 0;
    (wall.material as MeshBasicMaterial).opacity = 1 - roomGone;
    (portrait.material as MeshBasicMaterial).opacity = 1 - roomGone;
    wall.visible = roomGone < 1; portrait.visible = roomGone < 1;

    // the camera on its path
    path.pos.getPointAt(path.u(tt), tmpPos);
    path.target.getPointAt(path.uTarget(tt), tmpTarget);
    camera.position.copy(tmpPos);
    camera.lookAt(tmpTarget);

    // the stone at rest: breathing, a shadow; both still as the camera approaches
    const breathe = 1 - seg(tt, 0.1, 0.34);
    const g = stone.current;
    if (g) {
      g.position.set(stoneX, stoneY + 0.05 * Math.sin(time * 0.31) * breathe, STONE_Z);
      g.rotation.set((-2 + 1.5 * Math.sin(time * 0.13 + 2) * breathe) * Math.PI / 180 * breathe, (-4 + 3 * Math.sin(time * 0.23) * breathe) * Math.PI / 180 * breathe, (-4 + 1.2 * Math.sin(time * 0.17 + 1) * breathe) * Math.PI / 180 * breathe);
    }
    shadow.position.set(stoneX + stoneW * 0.3, stoneY - WORLD_H * 0.05, 0.04);
    shadow.scale.set(stoneW * 2.0, stoneH * 1.25, 1);
    (shadow.material as MeshBasicMaterial).opacity = 1 - seg(tt, 0.26, 0.42);

    // through the front face: the approved surface gives way as the viewer passes it
    const through = seg(tt, 0.4, 0.47);
    body.opacity = 0.86 * (1 - through);
    glass.opacity = 1 - seg(tt, 0.36, 0.45);
    if (front.current) front.current.visible = through < 1;
    if (glassRef.current) glassRef.current.visible = glass.opacity > 0.01;

    // inside: the shell of the crystal and its layers, the smoke around the viewer
    const insideIn = seg(tt, 0.3, 0.42);
    becoming.shell.uniforms['uOpacity']!.value = insideIn;
    if (shellRef.current) shellRef.current.visible = insideIn > 0.01 && !ov['noshell'];
    const layersOn = ov['nolayers'] ? 0 : seg(tt, 0.32, 0.46) * (1 - seg(tt, 0.64, 0.78));
    const fogD = ov['nofog'] ? 0 : 0.16 * seg(tt, 0.38, 0.52) * (1 - seg(tt, 0.66, 0.84));
    layerRefs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = layersOn > 0.01;
      const l = layers[i]!;
      m.rotation.set(l.rx + 0.03 * Math.sin(time * 0.2 + i), 0, l.ry + 0.04 * Math.sin(time * 0.17 + i * 1.3));
      const um = layerMats[i]!.uniforms;
      um['uOpacity']!.value = 0.5 * layersOn; um['uFogDensity']!.value = fogD; um['uTime']!.value = time;
    });
    fog.density = fogD;
    scene.fog = fogD > 0.001 ? fog : null;

    // the becoming: mineral, then slab, across the shell and the wall alike;
    // the shell settles into the wall's plane, a faint relief kept
    const become = seg(tt, 0.54, 0.82);
    const spread = 9 * seg(tt, 0.66, 0.92);
    const flatten = 0.94 * seg(tt, 0.66, 0.9);
    for (const m of [becoming.shell, becoming.wallMat]) {
      m.uniforms['uBecome']!.value = become;
      m.uniforms['uSpread']!.value = spread;
      m.uniforms['uFogDensity']!.value = fogD;
    }
    becoming.shell.uniforms['uFlatten']!.value = flatten;
    if (marbleWall.current) {
      marbleWall.current.visible = roomGone > 0.01;
      marbleWall.current.position.set(0, 0, WALL_Z);
      marbleWall.current.scale.set(worldW * 3, WORLD_H * 3, 1);
    }
  });

  return (
    <>
      <group ref={stone} position={[stoneX, stoneY, STONE_Z]}>
        {/* the interior: the far shell of the same geometry, and the layers */}
        <mesh ref={shellRef} geometry={geometry} material={becoming.shell} renderOrder={1} />
        {layers.map((l, i) => (
          <mesh key={l.seed} ref={(el) => { layerRefs.current[i] = el; }} position={[0, l.y * stoneH, 0]} rotation={[l.rx, 0, l.ry]} scale={[stoneW * 1.1, 2.2, 1]} material={layerMats[i]} renderOrder={2}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        ))}
        {/* the approved stone: the photograph's body, and the glass over its clear zones */}
        <mesh ref={front} geometry={geometry} material={body} renderOrder={3} />
        <mesh ref={glassRef} geometry={geometry} material={glass} scale={[1.004, 1.004, 1.004]} renderOrder={4} />
      </group>
      {/* the wall of the clinic, where the room's wall stood */}
      <mesh ref={marbleWall} material={becoming.wallMat} position={[0, 0, WALL_Z]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <directionalLight position={[-6, 7, 6]} intensity={1.5} color="#ffe6b8" />
      <directionalLight position={[3, 9, 8]} intensity={0.9} color="#fff4de" />
      <directionalLight position={[5, -2, 4]} intensity={0.18} color="#7fb0a4" />
    </>
  );
}

function Loader(props: PassageProps) {
  const [photo, setPhoto] = useState<Texture | null>(null);
  useEffect(() => { new TextureLoader().load(quartzUrl, (tx) => setPhoto(tx)); }, []);
  return photo ? <Passage {...props} photo={photo} /> : null;
}

export function PassageScene(props: PassageProps) {
  return (
    <Canvas
      className="passage__canvas"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.03, far: 80, position: [0, 0, CAM_Z] }}
      gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping, powerPreference: 'high-performance' }}
      frameloop="always"
    >
      <Loader {...props} />
    </Canvas>
  );
}
