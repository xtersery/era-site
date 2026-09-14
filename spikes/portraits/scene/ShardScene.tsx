import { MeshTransmissionMaterial, useFBO } from '@react-three/drei';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PlaneGeometry,
  ClampToEdgeWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
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
 * a broken flank, smoke gathering in its thickness, cloud inside — refracting
 * the arriving portrait, which is rendered by the same camera into a buffer on
 * a layer the visible render never draws. The seam has the stone's silhouette;
 * without the stone there is no seam and no field. At rest the canvas is
 * clear and the DOM plates show. The canvas takes no pointer.
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
 * The stone's inside, from the photograph: its crop box drawn to three maps —
 * a lightened tint (the smoke as density inside the glass), a roughness map
 * (dark smoke is cloudier), and a bump map (the fractures and planes).
 */
function createQuartzMaps(photo: Texture, box: { x: number; y: number; w: number; h: number }) {
  const img = photo.image as HTMLImageElement;
  const W = 448, H = Math.round(448 / (box.w / box.h));
  const draw = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')!] as const; };
  // the tint: the photograph lifted toward the stone's pale body
  const [tc, tg] = draw();
  tg.fillStyle = '#efe9e0';
  tg.fillRect(0, 0, W, H);
  tg.globalAlpha = 0.36;
  tg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  tg.globalAlpha = 1;
  // the roughness and the bump, from the luminance
  const [lc, lg] = draw();
  lg.fillStyle = '#9a9a9a';
  lg.fillRect(0, 0, W, H);
  lg.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, W, H);
  const d = lg.getImageData(0, 0, W, H);
  const rough = new Uint8ClampedArray(d.data.length);
  const bump = new Uint8ClampedArray(d.data.length);
  for (let i = 0; i < d.data.length; i += 4) {
    const l = (0.2126 * d.data[i]! + 0.7152 * d.data[i + 1]! + 0.0722 * d.data[i + 2]!) / 255;
    const r = Math.round((0.3 + 0.6 * (1 - l)) * 255);
    rough[i] = rough[i + 1] = rough[i + 2] = r; rough[i + 3] = 255;
    const b = Math.round(l * 255);
    bump[i] = bump[i + 1] = bump[i + 2] = b; bump[i + 3] = 255;
  }
  const [rc, rg] = draw(); rg.putImageData(new ImageData(rough, W, H), 0, 0);
  const [bc, bg] = draw(); bg.putImageData(new ImageData(bump, W, H), 0, 0);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(c);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = ClampToEdgeWrapping;
    return t;
  };
  return { tint: tex(tc, true), rough: tex(rc, false), bump: tex(bc, false) };
}

/** cover-fit of a 4 : 5 portrait into the frame, anchored like its DOM plate */
function fit(frameAspect: number, anchorY: number) {
  const imgAspect = 4 / 5;
  const vx = Math.min(1, frameAspect / imgAspect);
  const vy = Math.min(1, imgAspect / frameAspect);
  return { repeat: new Vector2(vx, vy), offset: new Vector2((1 - vx) * 0.5, 1 - vy - anchorY * (1 - vy)) };
}

function Quartz({ portraits, state, phone, onReady }: Props) {
  const { scene, gl, camera, size } = useThree();
  const textures = usePortraitTextures(portraits);
  const env = useMemo(() => createEraEnvironment(1024, 512), []);
  const photo = useLoader(TextureLoader, quartzUrl);
  const maps = useMemo(() => createQuartzMaps(photo, trace.box), [photo]);
  const profile = useMemo(() => createEdgeProfile(), []);
  const worldW = (WORLD_H * size.width) / size.height;
  const frameAspect = size.width / size.height;

  // the buffer's plane: the arriving portrait alone, on the hidden layer
  const backdrop = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ toneMapped: false }));
    m.layers.set(1);
    return m;
  }, []);
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

  // the stone: the photograph's proportion, a little over the frame's height, thick
  const stoneH = WORLD_H * 1.06;
  const narrow = phone ? 0.8 : 0.92;
  const stoneW = stoneH * QUARTZ_ASPECT * narrow;
  const geometry = useMemo(
    () => createQuartzGeometry({ height: stoneH, depth: phone ? 1.1 : 1.4, narrow, seed: 5 }),
    [stoneH, narrow, phone],
  );
  const fbo = useFBO(phone ? 768 : 1024, phone ? 768 : 1024, { depthBuffer: false });
  const stone = useRef<Group>(null);
  const ready = useRef(false);

  useEffect(() => {
    scene.environment = env;
    scene.add(backdrop);
    scene.add(composite);
    return () => {
      scene.environment = null;
      scene.remove(backdrop);
      scene.remove(composite);
      env.dispose();
      maps.tint.dispose(); maps.rough.dispose(); maps.bump.dispose();
      profile.dispose();
      geometry.dispose();
      (composite.material as ShaderMaterial).dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, env, backdrop, composite, maps, profile, geometry, textures]);

  useFrame(() => {
    const s = state.current;
    const mesh = stone.current;
    if (!mesh) return;
    mesh.visible = s.on;
    composite.visible = s.on;
    if (!s.on) {
      if (!ready.current) { ready.current = true; onReady?.(); }
      return;
    }
    const texIn = textures[s.next];
    const texOut = textures[s.from];
    const fIn = fit(frameAspect, s.anchorNext);
    const fOut = fit(frameAspect, s.anchorFrom);

    // the buffer: the arriving portrait, fitted as its plate is
    const bmat = backdrop.material as MeshBasicMaterial;
    if (texIn && bmat.map !== texIn) { bmat.map = texIn; bmat.needsUpdate = true; }
    if (texIn) { texIn.repeat.copy(fIn.repeat); texIn.offset.copy(fIn.offset); }
    backdrop.scale.set(worldW, WORLD_H, 1);
    const mask = camera.layers.mask;
    camera.layers.set(1);
    gl.setRenderTarget(fbo);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    camera.layers.mask = mask;
    // the composite samples the same textures with its own repeat/offset
    if (texIn) { texIn.repeat.set(1, 1); texIn.offset.set(0, 0); }

    // the stone's pose: in front of the picture, turning as it crosses
    const x = ((s.seam / 100) - 0.5) * worldW;
    const y = (-s.rise / 100) * WORLD_H;
    const rotY = (s.rotY * Math.PI) / 180;
    const rotZ = (s.rotZ * Math.PI) / 180;
    const rotX = ((-3 + 5 * s.f) * Math.PI) / 180; // a body turning in space leans a little too
    mesh.position.set(x, y, STONE_Z);
    mesh.rotation.set(rotX, rotY, rotZ);

    // the field: where the stone's edges fall on the frame, in frame uv
    const u = (composite.material as ShaderMaterial).uniforms;
    u['uOut']!.value = texOut ?? null;
    u['uIn']!.value = texIn ?? null;
    (u['uOutRepeat']!.value as Vector2).copy(fOut.repeat);
    (u['uOutOffset']!.value as Vector2).copy(fOut.offset);
    (u['uInRepeat']!.value as Vector2).copy(fIn.repeat);
    (u['uInOffset']!.value as Vector2).copy(fIn.offset);
    // the stone is nearer the camera than the plane, so it projects larger by this
    const mag = CAM_Z / (CAM_Z - STONE_Z);
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
        {/* smoky quartz: brown-grey smoke in the thickness, cloud inside, polished facets, no dispersion */}
        <mesh geometry={geometry}>
          <MeshTransmissionMaterial
            buffer={fbo.texture}
            transmission={0.9}
            thickness={phone ? 1.1 : 1.45}
            ior={1.54}
            chromaticAberration={0.006}
            anisotropicBlur={phone ? 0.26 : 0.34}
            roughness={0.56}
            roughnessMap={maps.rough}
            map={maps.tint}
            bumpMap={maps.bump}
            bumpScale={0.035}
            attenuationColor="#9d9189"
            attenuationDistance={4.8}
            color="#ebe4da"
            clearcoat={0.5}
            clearcoatRoughness={0.28}
            envMapIntensity={1.35}
            samples={phone ? 4 : 6}
            resolution={phone ? 512 : 1024}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* one warm key from the upper left, a cool fill low right — the ERA studio */}
      <directionalLight position={[-6, 7, 6]} intensity={1.5} color="#ffe6b8" />
      <directionalLight position={[5, -2, 4]} intensity={0.4} color="#7fb0a4" />
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
