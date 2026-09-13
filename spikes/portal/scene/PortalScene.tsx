import { MeshTransmissionMaterial } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  FogExp2,
  type MeshPhysicalMaterial,
  LinearFilter,
  NoToneMapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Mesh,
  type ShaderMaterial,
  type Texture,
} from 'three';

import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { createHazeMaterial, createPlateMaterial } from './plateMaterial';
import { createGlintGeometry, createPortalGeometry, PORTAL } from './portalGeometry';

/**
 * The Cases passage — a sequence of monumental mineral-glass thresholds standing
 * on one axis. The camera walks that axis: approach, cross, release, arrive.
 *
 * Cost discipline: every threshold is ONE merged geometry. Only the threshold
 * the visitor is standing at gets true transmission (one extra pass); the ones
 * further in are the same glass without the backbuffer, taken by haze anyway.
 */

/**
 * Where the visitor stands, and how far apart the thresholds are. The phone is a
 * different room, not a squeezed one: the camera stands further back so the
 * threshold still reads as an object in a portrait frame, and the thresholds sit
 * further apart so the crossing still happens inside one case's scroll.
 */
export const WALK = {
  desktop: { dock: 5.4, spacing: 7.4 },
  phone: { dock: 8.6, spacing: 11.2 },
} as const;
const PLATE_H = 4.6; // the case is a world beyond the threshold, not a plate inside it
const PLATE_SET_BACK = 1.6; // the case hangs this far behind the threshold plane
const PLATE_W = PLATE_H * 0.8; // the plates are 4:5

export interface CasePlate {
  after: string;
  before: string;
}

interface SceneState {
  /** position along the passage, in cases (fractional) */
  pos: number;
  /** 0 «после» … 1 «до» for the docked case */
  reveal: number;
  /** pointer in plate space, and how much of the reveal it owns */
  field: { x: number; y: number; amount: number };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };

function useCaseTextures(plates: readonly CasePlate[]): Texture[][] {
  return useMemo(() => {
    const loader = new TextureLoader();
    return plates.map((p) =>
      [p.after, p.before].map((url) => {
        const t = loader.load(url);
        t.colorSpace = SRGBColorSpace;
        t.minFilter = LinearFilter;
        t.magFilter = LinearFilter;
        t.generateMipmaps = false;
        return t;
      }),
    );
  }, [plates]);
}

function Passage({ plates, state, tier, only, walk }: { plates: readonly CasePlate[]; state: React.MutableRefObject<SceneState>; tier: 'high' | 'mid'; only?: string | undefined; walk: { dock: number; spacing: number } }) {
  const { dock: DOCK, spacing: SPACING } = walk;
  const { scene } = useThree();
  const textures = useCaseTextures(plates);
  const n = plates.length;

  const geoms = useMemo(() => plates.map((_, k) => createPortalGeometry(k + 1)), [plates]);
  const glints = useMemo(() => plates.map((_, k) => createGlintGeometry(k + 1)), [plates]);
  const plateMats = useMemo(
    () => textures.map(([a, b]) => createPlateMaterial(a!, b!)),
    [textures],
  );
  const hazeMat = useMemo(() => createHazeMaterial('#2c4a3d', 0.5), []);
  const env = useMemo(() => createEraEnvironment(1024, 512), []);

  useEffect(() => {
    scene.environment = env;
    scene.background = null;
    scene.fog = new FogExp2('#060f0c', 0.115 * (7.4 / SPACING));
    return () => {
      scene.environment = null;
      scene.fog = null;
      env.dispose();
      geoms.forEach((g) => g.dispose());
      glints.forEach((g) => g.dispose());
      plateMats.forEach((m) => m.dispose());
      hazeMat.dispose();
    };
  }, [scene, env, geoms, glints, plateMats, hazeMat, SPACING]);

  /** each threshold stands a little off the axis — the passage bends, it is not a tunnel of rings */
  const offsets = useMemo(
    () =>
      plates.map((_, k) => {
        const h = (n: number) => { const x = Math.sin((k + 1) * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };
        return [(h(1) - 0.5) * 2.1, (h(2) - 0.5) * 1.15] as const;
      }),
    [plates],
  );

  const [heroIndex, setHeroIndex] = useState(0);
  const plateRefs = useRef<(Mesh | null)[]>([]);
  const heroRef = useRef<Mesh>(null);
  const glassRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ camera, gl }) => {
    const { pos, reveal, field } = state.current;
    camera.position.z = DOCK - pos * SPACING;
    // the camera is guided, never thrown: a hand's width of drift, re-centring at each dock
    const drift = Math.sin(pos * Math.PI) * 0.16;
    // a constant step to the left keeps the object right of centre, so the museum
    // label has its own air; the view stays parallel to the axis (no swing)
    camera.position.x = drift - 0.72;
    camera.position.y = 0.1 + Math.cos(pos * Math.PI * 0.5) * 0.06;
    camera.lookAt(camera.position.x, 0.02, camera.position.z - 6);

    (window as unknown as Record<string, unknown>)['__scene'] = { pos, camZ: camera.position.z };
    // dev readout for the technical report
    (window as unknown as Record<string, unknown>)['__gl'] = {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    };
    const active = Math.round(pos);
    for (let k = 0; k < n; k++) {
      // how far in front of the camera this threshold stands, in world units:
      // DOCK when the visitor is standing at it, 0 at the moment of crossing,
      // negative once it is behind her.
      const ahead = DOCK - (pos - k) * SPACING;
      const plateAhead = ahead + PLATE_SET_BACK;
      const far = clamp((ahead - DOCK) / SPACING, 0, 3); // 0 at the dock, 1 per threshold deeper
      const isActive = Math.abs(pos - k) < 0.5;
      const mat = plateMats[k]!;
      const plate = plateRefs.current[k];
      const glass = glassRefs.current[k];

      if (glass) {
        glass.visible = only !== 'plate' && only !== 'none' && only !== 'hero' && !isActive && ahead > -2.4 && ahead < 34;
        // the thresholds further in give up their light: the mineral dark takes them
        const gm = glass.material as MeshPhysicalMaterial;
        gm.envMapIntensity = 1.6 * clamp(1 - far * 0.72, 0.04, 1);
        gm.opacity = clamp(0.88 - far * 0.42, 0.06, 0.88);
      }
      if (plate) {
        plate.visible = only !== 'glass' && only !== 'none' && only !== 'hero' && plateAhead > 0.35 && far < 2.6;
        // the result is released as its threshold is crossed
        // the result is let go while the threshold is still ahead — the visitor crosses
        // an opening, she does not fly into a photograph
        const release = clamp((plateAhead - 2.1) / 2.6, 0, 1);
        mat.uniforms['uOpacity']!.value = release * clamp(1 - far * 0.46, 0, 1);
        mat.uniforms['uHaze']!.value = clamp(far * 0.66, 0, 0.92);
        mat.uniforms['uReveal']!.value = isActive ? reveal : 0;
        mat.uniforms['uFieldAmount']!.value = isActive ? field.amount : 0;
        (mat.uniforms['uField']!.value as Vector2).set(field.x, field.y);
      }
    }
    const hero = heroRef.current;
    if (hero) {
      const o = offsets[clamp(active, 0, n - 1)]!;
      hero.position.set(o[0], o[1], -active * SPACING);
      hero.visible = only !== 'plate' && only !== 'none' && Math.abs(active - pos) < 0.5;
    }
    setHeroIndex((prev) => (prev === active ? prev : active)); // one re-render per case
  });

  return (
    <>
      {plates.map((_, k) => (
        <group key={k} position={[offsets[k]![0], offsets[k]![1], -k * SPACING]}>
          {/* the glass, one merged body per threshold */}
          <mesh ref={(el) => { glassRefs.current[k] = el; }} geometry={geoms[k]!}>
            <meshPhysicalMaterial
              color="#dfe6e0"
              metalness={0}
              roughness={0.14}
              transmission={0.5}
              thickness={0.5}
              ior={1.45}
              attenuationColor={new Color('#3d6b58')}
              attenuationDistance={7}
              clearcoat={1}
              clearcoatRoughness={0.08}
              envMapIntensity={1.35}
              transparent
              opacity={0.88}
            />
          </mesh>
          {/* gold only where a key would catch the edge */}
          <mesh geometry={glints[k]!}>
            <meshStandardMaterial color="#cfaf72" metalness={1} roughness={0.22} envMapIntensity={2.2} />
          </mesh>
          {/* the case, seen through the opening */}
          <mesh ref={(el) => { plateRefs.current[k] = el; }} position={[0, 0, -PLATE_SET_BACK]} material={plateMats[k]!}>
            <planeGeometry args={[PLATE_W, PLATE_H, 1, 1]} />
          </mesh>
          {/* air in the gap behind the threshold */}
          <mesh visible={only !== 'none' && only !== 'hero'} position={[0, -0.2, -SPACING * 0.45]} material={hazeMat}>
            <planeGeometry args={[16, 11, 1, 1]} />
          </mesh>
        </group>
      ))}

      {/* the docked threshold: the only true transmission in the scene */}
      <mesh ref={heroRef} geometry={geoms[clamp(heroIndex, 0, n - 1)]!}>
        <MeshTransmissionMaterial
          transmission={1}
          thickness={0.85}
          ior={1.45}
          chromaticAberration={0.028}
          anisotropicBlur={0.1}
          roughness={0.12}
          attenuationColor="#3d6b58"
          attenuationDistance={4.5}
          color="#f4f6f2"
          clearcoat={1}
          clearcoatRoughness={0.07}
          envMapIntensity={1.95}
          samples={tier === 'high' ? 6 : 3}
          resolution={tier === 'high' ? 768 : 384}
          backside={false}
        />
      </mesh>

      {/* one controlled warm key, a cool fill, and the green-black ambient */}
      <directionalLight position={[-5, 4.5, 4]} intensity={2.1} color="#ffe6b8" />
      {/* a second, dimmer warm source behind the visitor's shoulder, so the inner bevels read */}
      <directionalLight position={[-2.2, 1.4, -3]} intensity={0.8} color="#f7e4b1" />
      <directionalLight position={[6, -2, 2]} intensity={0.4} color="#7fb0a4" />
      <ambientLight intensity={0.2} color="#16382c" />
    </>
  );
}

export function PortalScene({
  plates,
  state,
  tier = 'high',
  dpr = [1, 1.6] as [number, number],
  only,
  walk = WALK.desktop,
}: {
  plates: readonly CasePlate[];
  state: React.MutableRefObject<SceneState>;
  tier?: 'high' | 'mid';
  dpr?: [number, number];
  /** debug isolation: 'glass' | 'plate' | 'hero' | 'none' */
  only?: string | undefined;
  walk?: { dock: number; spacing: number };
}) {
  return (
    <Canvas
      className="passage__canvas"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 80, position: [0, 0.1, walk.dock] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping;
        gl.setClearColor('#060f0c', 0);
      }}
    >
      <Passage plates={plates} state={state} tier={tier} only={only} walk={walk} />
    </Canvas>
  );
}

export type { SceneState };
export { clamp, smooth };
