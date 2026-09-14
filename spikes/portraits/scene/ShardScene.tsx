import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoToneMapping,
  PlaneGeometry,
  ClampToEdgeWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Color,
  Vector2,
  type Texture,
} from 'three';

import quartzUrl from '../../../src/assets/smoky-quartz.png';
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import compositeFrag from './composite.frag?raw';
import compositeVert from './composite.vert?raw';
import { createEdgeProfile, createQuartzGeometry, QUARTZ_ASPECT } from './quartzGeometry';
import { trace } from './quartzTrace';

/**
 * The quartz as the mechanism.
 *
 * During a transition the whole portrait frame is drawn here: a COMPOSITE
 * plane shows the portrait being left ahead of the stone and the portrait
 * arriving behind it, both pulled toward the stone's edges and softened there
 * — the field the stone makes as it passes. Over it, the QUARTZ: a smoky
 * slab of ERA mineral glass with the reference's form — large polished facets,
 * a broken flank, smoke gathering in its thickness, cloud inside — letting the
 * arriving portrait through where the stone is clear (three's own transmission
 * pass renders the field plane behind it; under the stone the field is the
 * arriving portrait). The seam has the stone's silhouette; without the stone
 * there is no seam and no field. At rest the canvas is clear and the DOM
 * plates show. The canvas takes no pointer.
 *
 * Built on three's built-in physical transmission rather than a custom buffer
 * material: fewer moving parts, and it compiles on the GPUs the custom one did
 * not — when the stone's shader fails, the stone is silently gone and only the
 * field remains, which is the one failure this room cannot afford.
 */
export interface ShardState {
  on: boolean;
  /** the transition, 0…1 */
  f: number;
  /** the stone's centre, in % of the frame width */
  seam: number;
  /** its turn about the vertical, degrees */
  rotY: number;
  rotZ: number;
  /** its drift down, in % of the frame height */
  rise: number;
  /** the portrait being left and the one arriving, with their crop anchors (object-position y, 0…1) */
  from: number;
  next: number;
  anchorFrom: number;
  anchorNext: number;
}

interface Props {
  portraits: readonly string[];
  state: React.MutableRefObject<ShardState>;
  phone: boolean;
  onReady?: () => void;
}

const WORLD_H = 10;
const FOV = 30;
/** the camera distance at which a plane WORLD_H tall exactly fills the view */
const CAM_Z = WORLD_H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const STONE_Z = 1.7;

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
  // the colour: the photograph, lifted a little toward the pale body
  const [tc, tg] = draw();
  tg.fillStyle = '#e6dfd5';
  tg.fillRect(0, 0, W, H);
  tg.globalAlpha = 0.86;
  tg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  tg.globalAlpha = 1;
  // luminance → transmission, roughness, bump
  const [lc, lg] = draw();
  lg.fillStyle = '#6a6a6a';
  lg.fillRect(0, 0, W, H);
  lg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  const d = lg.getImageData(0, 0, W, H);
  const n = d.data.length;
  const trans = new Uint8ClampedArray(n), rough = new Uint8ClampedArray(n), bump = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i += 4) {
    const l = (0.2126 * d.data[i]! + 0.7152 * d.data[i + 1]! + 0.0722 * d.data[i + 2]!) / 255;
    const t = Math.round((0.12 + 0.88 * Math.pow(l, 1.4)) * 255); // clear where the stone is clear
    const r = Math.round((0.28 + 0.6 * (1 - l)) * 255);
    const b = Math.round(l * 255);
    trans[i] = trans[i + 1] = trans[i + 2] = t; trans[i + 3] = 255;
    rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255;
    bump[i] = bump[i + 1] = bump[i + 2] = b; bump[i + 3] = 255;
  }
  const [xc, xg] = draw(); xg.putImageData(new ImageData(trans, W, H), 0, 0);
  const [rc, rg] = draw(); rg.putImageData(new ImageData(rough, W, H), 0, 0);
  const [bc, bg] = draw(); bg.putImageData(new ImageData(bump, W, H), 0, 0);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(c);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = ClampToEdgeWrapping;
    return t;
  };
  return { tint: tex(tc, true), trans: tex(xc, false), rough: tex(rc, false), bump: tex(bc, false) };
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
  g.addColorStop(0, 'rgba(8, 12, 10, 0.5)');
  g.addColorStop(0.55, 'rgba(8, 12, 10, 0.22)');
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

function Quartz({ portraits, state, phone, onReady }: Props) {
  const { scene, size } = useThree();
  const textures = usePortraitTextures(portraits);
  const env = useMemo(() => createEraEnvironment(1024, 512), []);
  const photo = useLoader(TextureLoader, quartzUrl);
  const maps = useMemo(() => createQuartzMaps(photo, trace.box), [photo]);
  const profile = useMemo(() => createEdgeProfile(), []);
  const worldW = (WORLD_H * size.width) / size.height;
  const frameAspect = size.width / size.height;

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
        uSettle: { value: 0 },
      },
    });
    return new Mesh(new PlaneGeometry(1, 1), mat);
  }, [profile]);

  // the stone: the photograph's proportion, an object inside the frame — its
  // top and bottom in view — thick, with a shadow on the portrait behind it
  const stoneH = WORLD_H * (phone ? 0.72 : 0.86);
  const narrow = phone ? 0.86 : 0.92;
  const stoneW = stoneH * QUARTZ_ASPECT * narrow;
  const geometry = useMemo(
    () => createQuartzGeometry({ height: stoneH, depth: phone ? 1.0 : 1.3, narrow, seed: 5 }),
    [stoneH, narrow, phone],
  );
  const shadow = useMemo(() => createShadow(), []);
  // the stone's material: the photograph on a body of smoky glass
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: maps.tint,
        transmission: 0.72,
        transmissionMap: maps.trans,
        thickness: phone ? 1.0 : 1.3,
        ior: 1.54,
        roughness: 0.5,
        roughnessMap: maps.rough,
        bumpMap: maps.bump,
        bumpScale: 0.05,
        attenuationColor: new Color('#8f847b'),
        attenuationDistance: 4,
        color: new Color('#efe9e0'),
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.0,
        toneMapped: false,
      }),
    [maps, phone],
  );
  const stone = useRef<Group>(null);
  const ready = useRef(false);

  useEffect(() => {
    scene.environment = env;
    scene.add(composite);
    scene.add(shadow);
    return () => {
      scene.environment = null;
      scene.remove(composite);
      scene.remove(shadow);
      env.dispose();
      material.dispose();
      maps.tint.dispose(); maps.trans.dispose(); maps.rough.dispose(); maps.bump.dispose();
      profile.dispose();
      geometry.dispose();
      (composite.material as ShaderMaterial).dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, env, composite, shadow, maps, profile, geometry, material, textures]);

  useFrame(() => {
    const s = state.current;
    const mesh = stone.current;
    if (!mesh) return;
    mesh.visible = s.on;
    composite.visible = s.on;
    shadow.visible = s.on;
    if (!s.on) {
      if (!ready.current) { ready.current = true; onReady?.(); }
      return;
    }
    const texIn = textures[s.next];
    const texOut = textures[s.from];
    const fIn = fit(frameAspect, s.anchorNext);
    const fOut = fit(frameAspect, s.anchorFrom);
    if (texIn) { texIn.repeat.set(1, 1); texIn.offset.set(0, 0); }

    // the stone's pose: in front of the picture, turning as it crosses
    const x = ((s.seam / 100) - 0.5) * worldW;
    const y = (-s.rise / 100) * WORLD_H;
    const rotY = (s.rotY * Math.PI) / 180;
    const rotZ = (s.rotZ * Math.PI) / 180;
    const rotX = ((-3 + 5 * s.f) * Math.PI) / 180; // a body turning in space leans a little too
    // it comes a little toward the visitor mid-crossing and settles back as it leaves
    const z = STONE_Z + 0.35 * Math.sin(Math.PI * s.f);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    // its shadow on the portrait, thrown down and to the right of the key
    shadow.position.set(x + stoneW * 0.28, y - WORLD_H * 0.05, 0.06);
    shadow.rotation.set(0, 0, rotZ);
    shadow.scale.set(stoneW * 2.0, stoneH * 1.25, 1);

    // the field: where the stone's edges fall on the frame, in frame uv
    const u = (composite.material as ShaderMaterial).uniforms;
    u['uOut']!.value = texOut ?? null;
    u['uIn']!.value = texIn ?? null;
    (u['uOutRepeat']!.value as Vector2).copy(fOut.repeat);
    (u['uOutOffset']!.value as Vector2).copy(fOut.offset);
    (u['uInRepeat']!.value as Vector2).copy(fIn.repeat);
    (u['uInOffset']!.value as Vector2).copy(fIn.offset);
    // the stone is nearer the camera than the plane, so it projects larger by this
    const mag = CAM_Z / (CAM_Z - z);
    (u['uStone']!.value as Vector2).set(0.5 + (x * mag) / worldW, 0.5 + (y * mag) / WORLD_H);
    (u['uStoneSize']!.value as Vector2).set(((stoneW * mag) / worldW) * 0.5 * Math.abs(Math.cos(rotY)), ((stoneH * mag) / WORLD_H) * 0.5);
    u['uSkew']!.value = -Math.tan(rotZ) * (WORLD_H / worldW);
    u['uAspect']!.value = frameAspect;
    u['uWake']!.value = phone ? 0.2 : 0.16;
    u['uAmount']!.value = phone ? 0.06 : 0.05;
    // the field lets go as the stone leaves and the new state settles
    u['uSettle']!.value = Math.max(0, (s.f - 0.86) / 0.14);
    composite.scale.set(worldW, WORLD_H, 1);
    composite.position.set(0, 0, 0);

    if (!ready.current) { ready.current = true; onReady?.(); }
  });

  return (
    <>
      <group ref={stone} position={[0, 0, STONE_Z]}>
        {/* smoky quartz: the photograph on a body of smoky glass, clear where the stone is clear */}
        <mesh geometry={geometry} material={material} />
      </group>
      {/* one warm key from the upper left, a cool fill low right — the ERA studio */}
      <directionalLight position={[-6, 7, 6]} intensity={1.5} color="#ffe6b8" />
      <directionalLight position={[3, 9, 8]} intensity={0.9} color="#fff4de" />
      <directionalLight position={[5, -2, 4]} intensity={0.18} color="#7fb0a4" />
    </>
  );
}

export function ShardScene({ portraits, state, phone, onReady }: Props) {
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
      }}
    >
      <Quartz portraits={portraits} state={state} phone={phone} onReady={onReady} />
    </Canvas>
  );
}
