import { MeshTransmissionMaterial, useFBO } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Texture,
} from 'three';

import veinNormalUrl from '../../hero/assets/vein-normal.png';
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { MINERAL } from '../../hero/scene/materials';
import { createShardGeometry } from './shardGeometry';

/**
 * The shard, as a body: ERA Mineral Glass (Spike A, path A — drei transmission
 * with the approved attenuation, vein normal map and environment) on a real
 * extruded, roughened slab.
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
  const geometry = useMemo(
    () => createShardGeometry({ width: worldW * (phone ? 0.34 : 0.26), height: WORLD_H * 1.12, depth: phone ? 0.38 : 0.5, seed: 2 }),
    [worldW, phone],
  );
  const fbo = useFBO(phone ? 768 : 1024, phone ? 768 : 1024, { depthBuffer: false });
  const shard = useRef<Mesh>(null);
  const ready = useRef(false);

  useEffect(() => {
    scene.environment = env;
    scene.add(backdrop);
    return () => {
      scene.environment = null;
      scene.remove(backdrop);
      env.dispose();
      geometry.dispose();
      vein.dispose();
      textures.forEach((t) => t.dispose());
    };
  }, [scene, env, backdrop, geometry, vein, textures]);

  useFrame(() => {
    const s = state.current;
    const mesh = shard.current;
    if (!mesh) return;
    mesh.visible = s.on;
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

    // the stone's pose
    mesh.position.set(((s.seam / 100) - 0.5) * worldW, (-s.rise / 100) * WORLD_H, 1.1);
    mesh.rotation.set(0, (s.rotY * Math.PI) / 180, (s.rotZ * Math.PI) / 180);
    if (!ready.current) { ready.current = true; onReady?.(); }
  });

  return (
    <>
      <mesh ref={shard} geometry={geometry} position={[0, 0, 1.1]}>
        <MeshTransmissionMaterial
          buffer={fbo.texture}
          transmission={1}
          thickness={phone ? 0.45 : 0.6}
          ior={MINERAL.ior}
          chromaticAberration={0.035}
          anisotropicBlur={0.05}
          roughness={MINERAL.roughness}
          attenuationColor={MINERAL.attenuationColor}
          attenuationDistance={6}
          color="#f8f6f1"
          normalMap={vein}
          normalScale={new Vector2(0.05, 0.05)}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.7}
          samples={phone ? 2 : 6}
          resolution={phone ? 512 : 1024}
          toneMapped={false}
        />
      </mesh>
      {/* one warm key from the upper left, the ERA environment's own direction */}
      <directionalLight position={[-6, 7, 6]} intensity={1.2} color="#ffe6b8" />
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
