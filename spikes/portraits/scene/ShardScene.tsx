import { MeshTransmissionMaterial, useFBO } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type BufferGeometry,
  type Texture,
} from 'three';

import veinNormalUrl from '../../hero/assets/vein-normal.png';
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { MINERAL } from '../../hero/scene/materials';
import { createShardGeometry } from './shardGeometry';

/**
 * The shard, as a body: ERA Mineral Glass (Spike A, path A — drei transmission
 * with the approved attenuation, vein normal map and environment) on a real
 * extruded, roughened slab. Two surfaces: the FACES are the glass, a little
 * cloudy and green in the volume; the WALLS — where the stone was broken —
 * are frosted and milky, so the thickness reads at any angle. It casts a soft
 * shadow onto the portrait behind it, so it stands in front of the picture.
 *
 * What it refracts is the INCOMING portrait: that portrait is rendered by the
 * same camera into a buffer the glass samples through its volume, so the next
 * specialist is seen bent through the stone — and nowhere else, because the
 * buffer's plane sits on a layer the visible render does not draw. Outside the
 * stone the canvas is clear; the DOM portraits show through; where the stone
 * has passed the DOM reveals the incoming plate. The canvas takes no pointer.
 */
export interface ShardState {
  on: boolean;
  /** the stone's centre, in % of the frame width */
  seam: number;
  /** its turn about the vertical, degrees */
  rotY: number;
  rotZ: number;
  /** its drift down, in % of the frame height */
  rise: number;
  /** index of the incoming portrait, and its crop anchor (object-position y, 0…1) */
  next: number;
  anchorY: number;
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

function Shard({ portraits, state, phone, onReady }: Props) {
  const { scene, gl, camera, size } = useThree();
  const textures = usePortraitTextures(portraits);
  const env = useMemo(() => createEraEnvironment(1024, 512), []);
  const vein = useMemo(() => {
    const t = new TextureLoader().load(veinNormalUrl);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(0.3, 0.3);
    return t;
  }, []);
  const worldW = (WORLD_H * size.width) / size.height;
  // the backdrop: the incoming portrait, cover-fitted to the frame like the DOM plate
  const backdrop = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ toneMapped: false }));
    m.layers.set(1);
    return m;
  }, []);
  // the stone
  const { faces, walls, shardW, shardH } = useMemo(() => {
    const shardW = worldW * (phone ? 0.34 : 0.27);
    const shardH = WORLD_H * 1.12;
    const geo = createShardGeometry({ width: shardW, height: shardH, depth: phone ? 0.75 : 1.0, seed: 2 });
    // the extrude's groups: 0 = the two faces, 1 = the walls; one geometry, two surfaces
    const g0 = geo.groups[0]!, g1 = geo.groups[1]!;
    const faces: BufferGeometry = geo.clone();
    faces.setDrawRange(g0.start, g0.count);
    const walls: BufferGeometry = geo.clone();
    walls.setDrawRange(g1.start, g1.count);
    geo.dispose();
    return { faces, walls, shardW, shardH };
  }, [worldW, phone]);
  // the broken walls: frosted stone, not glass
  const wallMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: '#b9c5bc',
        roughness: 0.7,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 0.94,
        toneMapped: false,
      }),
    [],
  );
  // the shadow it casts on the portrait: a soft dark pool, drawn once
  const shadow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 256, 20, 128, 256, 250);
    g.addColorStop(0, 'rgba(6, 14, 10, 0.46)');
    g.addColorStop(0.55, 'rgba(6, 14, 10, 0.22)');
    g.addColorStop(1, 'rgba(6, 14, 10, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    const t = new CanvasTexture(c);
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    return m;
  }, []);
  const fbo = useFBO(phone ? 768 : 1024, phone ? 768 : 1024, { depthBuffer: false });
  const shard = useRef<Group>(null);
  const ready = useRef(false);

  useEffect(() => {
    scene.environment = env;
    scene.add(backdrop);
    scene.add(shadow);
    return () => {
      scene.environment = null;
      scene.remove(backdrop);
      scene.remove(shadow);
      env.dispose();
      faces.dispose();
      walls.dispose();
      wallMaterial.dispose();
      vein.dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, env, backdrop, shadow, faces, walls, wallMaterial, vein, textures]);

  useFrame(() => {
    const s = state.current;
    const mesh = shard.current;
    if (!mesh) return;
    mesh.visible = s.on;
    shadow.visible = s.on;
    if (!s.on) {
      if (!ready.current) { ready.current = true; onReady?.(); }
      return;
    }
    // the backdrop shows the incoming portrait, cover-fitted and anchored as its plate is
    const tex = textures[s.next];
    const mat = backdrop.material as MeshBasicMaterial;
    if (tex && mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
    if (tex) {
      const frameAspect = size.width / size.height;
      const imgAspect = 4 / 5;
      const vx = Math.min(1, frameAspect / imgAspect);
      const vy = Math.min(1, imgAspect / frameAspect);
      tex.repeat.set(vx, vy);
      tex.offset.set((1 - vx) * 0.5, 1 - vy - s.anchorY * (1 - vy));
    }
    backdrop.scale.set(worldW, WORLD_H, 1);
    backdrop.position.set(0, 0, 0);
    // render the backdrop alone into the buffer the glass will refract
    const mask = camera.layers.mask;
    camera.layers.set(1);
    gl.setRenderTarget(fbo);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    camera.layers.mask = mask;

    // the stone's pose — it stands well in front of the picture
    const x = ((s.seam / 100) - 0.5) * worldW;
    const y = (-s.rise / 100) * WORLD_H;
    mesh.position.set(x, y, 1.6);
    mesh.rotation.set(0, (s.rotY * Math.PI) / 180, (s.rotZ * Math.PI) / 180);
    // its shadow on the portrait, thrown down and to the right of the key
    shadow.position.set(x + shardW * 0.32, y - WORLD_H * 0.05, 0.06);
    shadow.rotation.set(0, 0, (s.rotZ * Math.PI) / 180);
    shadow.scale.set(shardW * 2.1, shardH * 1.15, 1);
    if (!ready.current) { ready.current = true; onReady?.(); }
  });

  return (
    <>
      <group ref={shard} position={[0, 0, 1.6]}>
        {/* the faces: the glass — a body, not a filter: a little cloudy, green in the volume */}
        <mesh geometry={faces}>
          <MeshTransmissionMaterial
            buffer={fbo.texture}
            transmission={0.9}
            thickness={phone ? 0.8 : 1.1}
            ior={MINERAL.ior}
            chromaticAberration={0.045}
            anisotropicBlur={0.22}
            roughness={0.2}
            attenuationColor={MINERAL.attenuationColor}
            attenuationDistance={3.6}
            color="#e6ebe3"
            normalMap={vein}
            normalScale={new Vector2(0.09, 0.09)}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={2}
            samples={phone ? 2 : 6}
            resolution={phone ? 512 : 1024}
            toneMapped={false}
          />
        </mesh>
        {/* the walls: the break — frosted, milky, lit by the key */}
        <mesh geometry={walls} material={wallMaterial} />
      </group>
      {/* one warm key from the upper left, the ERA environment's own direction */}
      <directionalLight position={[-6, 7, 6]} intensity={1.6} color="#ffe6b8" />
      <directionalLight position={[5, -2, 4]} intensity={0.35} color="#7fb0a4" />
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
      <Shard portraits={portraits} state={state} phone={phone} onReady={onReady} />
    </Canvas>
  );
}
