import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  FogExp2,
  LinearFilter,
  NoToneMapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Mesh,
  type ShaderMaterial,
  type Texture,
} from 'three';

import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { createPanelMaterial, createRailMaterial } from './panelMaterial';

/**
 * The case ribbon — an archive of results orbiting a vertical rail.
 *
 * FROM THE THREEUI GALLERY ELEMENT: curved editorial panels orbiting a vertical
 * cylindrical rail, each at its own angle and height, drifting slowly.
 *
 * WHAT IS OURS: the rail is travelled by the page's own scroll instead of
 * autoplay; a panel can be chosen, at which point it leaves the rail, comes
 * forward and **unrolls flat** in front of the visitor while the archive dims
 * behind it; the sheet then carries the two states of the case; the ground is
 * ERA's mineral dark instead of a paper grid; and one gold hairline marks the
 * rail with a glint where the visitor is standing.
 */

export const RAIL = {
  /** radius of the rail the sheets are wrapped to */
  radius: 3.2,
  /** angle between two cases around the rail */
  step: (38 * Math.PI) / 180,
  /** how far one case sits below the previous one */
  drop: 1.85,
  panel: { w: 2.4, h: 3.0 },
} as const;

export interface CasePlate {
  after: string;
  before: string;
}

export interface RibbonState {
  /** position along the rail, in cases (fractional) */
  pos: number;
  /** index of the focused case, or null while browsing */
  focus: number | null;
  /** 0 browsing … 1 fully unfolded */
  unfold: number;
  /** 0 «после» … 1 «до» for the focused case */
  reveal: number;
  field: { x: number; y: number; amount: number };
  /** index the pointer is over, or null */
  hover: number | null;
  /** written by the scene: the screen box of the focused sheet, for the DOM to sit beside */
  focusBox: { x: number; y: number; w: number; h: number } | null;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** where case k sits on the rail */
export function slot(k: number, phone: boolean): { x: number; y: number; z: number; yaw: number } {
  const a = k * RAIL.step;
  const r = phone ? RAIL.radius * 0.92 : RAIL.radius;
  return { x: Math.sin(a) * r, y: -k * RAIL.drop, z: Math.cos(a) * r, yaw: a };
}

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

function Ribbon({
  plates,
  state,
  phone,
  onPick,
}: {
  plates: readonly CasePlate[];
  state: React.MutableRefObject<RibbonState>;
  phone: boolean;
  onPick: (k: number) => void;
}) {
  const { scene, size, camera } = useThree();
  const textures = useCaseTextures(plates);
  const n = plates.length;
  const mats = useMemo(() => textures.map(([a, b]) => createPanelMaterial(a!, b!)), [textures]);
  const railMat = useMemo(() => createRailMaterial(), []);
  const env = useMemo(() => createEraEnvironment(512, 256), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const tmp = useMemo(() => ({ v: new Vector3(), a: new Vector3(), b: new Vector3(), c: new Vector3() }), []);

  useEffect(() => {
    scene.environment = env;
    scene.fog = new FogExp2('#060f0c', 0.055);
    return () => {
      scene.environment = null;
      scene.fog = null;
      env.dispose();
      mats.forEach((m) => m.dispose());
      railMat.dispose();
    };
  }, [scene, env, mats, railMat]);

  useFrame(({ clock, gl }) => {
    const s = state.current;
    const drift = clock.elapsedTime * 0.035; // the ribbon is never quite still
    const u = smooth(s.unfold);

    // --- the camera walks the rail, and steps closer when a case is chosen ---
    const camA = s.pos * RAIL.step + drift * 0.4;
    const camR = phone ? 10.6 : 11.5; // far enough out that several sheets are in the air at once
    const camY = -s.pos * RAIL.drop + (phone ? 0.15 : 0.35);
    const browseX = Math.sin(camA) * camR;
    const browseZ = Math.cos(camA) * camR;
    // stepping in a little as a case opens, never enough to lose the archive
    camera.position.set(
      lerp(browseX, Math.sin(camA) * (camR - 2.2), u),
      lerp(camY, camY + 0.15, u),
      lerp(browseZ, Math.cos(camA) * (camR - 2.2), u),
    );
    tmp.v.set(Math.sin(camA) * 0.4, camY - (phone ? 0.3 : 0.45) * (1 - u), Math.cos(camA) * 0.4);
    // slide the whole view to the left so the ribbon hangs right of centre and the
    // words keep their own air — a translation, not a swing
    const side = phone ? 0 : 1.85;
    tmp.a.set(camera.position.x - tmp.v.x, 0, camera.position.z - tmp.v.z).normalize();
    tmp.b.set(-tmp.a.z, 0, tmp.a.x).multiplyScalar(side); // the camera's right vector, flattened
    camera.position.add(tmp.b);
    tmp.v.add(tmp.b);
    camera.lookAt(tmp.v);

    railMat.uniforms['uHere']!.value = clamp(s.pos / Math.max(1, n - 1), 0, 1);
    // dev readout for the technical report
    (window as unknown as Record<string, unknown>)['__gl'] = {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      textures: gl.info.memory.textures,
    };

    // --- the sheets ---
    for (let k = 0; k < n; k++) {
      const mesh = meshes.current[k];
      const mat = mats[k]!;
      if (!mesh) continue;
      const sl = slot(k, phone);
      const focused = s.focus === k;
      const d = k - s.pos;

      if (focused && u > 0.0001) {
        // The chosen case leaves the rail, comes forward and unrolls flat.
        // The travel is interpolated in CAMERA space, so the sheet approaches the
        // viewer monotonically instead of swinging past her and coming back.
        const dist = phone ? 8.4 : 7.4; // the sheet stands about 70 % of the frame tall
        tmp.c.set(sl.x, sl.y, sl.z);
        camera.worldToLocal(tmp.c); // where it hangs now, seen from the visitor
        tmp.a.set(phone ? 0 : 1.25, phone ? 0.62 : 0.12, -dist); // where it will stand
        tmp.b.lerpVectors(tmp.c, tmp.a, u);
        camera.localToWorld(tmp.b);
        mesh.position.copy(tmp.b);
        mesh.quaternion.slerp(camera.quaternion, u);
        mesh.rotation.y = lerp(sl.yaw, mesh.rotation.y, u);
        mesh.scale.setScalar(lerp(1, phone ? 1.3 : 1.25, u));
        mat.uniforms['uBend']!.value = 1 - u; // the unfold
        mat.uniforms['uDim']!.value = 0;
        mat.uniforms['uOpacity']!.value = 1;
        mat.uniforms['uReveal']!.value = s.reveal;
        mat.uniforms['uFieldAmount']!.value = s.field.amount;
        (mat.uniforms['uField']!.value as Vector2).set(s.field.x, s.field.y);
        mat.uniforms['uHover']!.value = 0;
        // hand the DOM the sheet's screen box so the editorial block can sit beside it
        if (u > 0.9) {
          const w = RAIL.panel.w * mesh.scale.x * 0.5;
          const h = RAIL.panel.h * mesh.scale.y * 0.5;
          tmp.a.set(-w, h, 0).applyQuaternion(mesh.quaternion).add(mesh.position).project(camera);
          tmp.b.set(w, -h, 0).applyQuaternion(mesh.quaternion).add(mesh.position).project(camera);
          s.focusBox = {
            x: ((tmp.a.x + 1) / 2) * size.width,
            y: ((1 - tmp.a.y) / 2) * size.height,
            w: ((tmp.b.x - tmp.a.x) / 2) * size.width,
            h: ((tmp.a.y - tmp.b.y) / 2) * size.height,
          };
        }
      } else {
        mesh.position.set(sl.x, sl.y, sl.z);
        mesh.rotation.set(0, sl.yaw, 0);
        // the case the visitor has arrived at stands a little proud of the rest
        mesh.scale.setScalar(1 + 0.09 * clamp(1 - Math.abs(d), 0, 1));
        mat.uniforms['uBend']!.value = 1;
        mat.uniforms['uDim']!.value = clamp(u * 0.95 + Math.max(0, Math.abs(d) - 0.8) * 0.26, 0, 0.95);
        mat.uniforms['uOpacity']!.value = clamp(1 - Math.max(0, Math.abs(d) - 2.2) * 0.7, 0, 1) * (1 - u * 0.78);
        mat.uniforms['uReveal']!.value = 0;
        mat.uniforms['uFieldAmount']!.value = 0;
        mat.uniforms['uHover']!.value = s.hover === k ? 1 : 0;
      }
      mesh.visible = Math.abs(d) < 3.4 || focused;
    }
    if (s.unfold < 0.05) s.focusBox = null;
  });

  return (
    <>
      {/* the rail: one hairline with a glint where the visitor stands */}
      <mesh position={[0, -((n - 1) * RAIL.drop) / 2, 0]} material={railMat}>
        <planeGeometry args={[0.05, (n - 1) * RAIL.drop + 9, 1, 1]} />
      </mesh>

      {plates.map((_, k) => (
        <mesh
          key={k}
          ref={(el) => { meshes.current[k] = el; }}
          material={mats[k]!}
          onPointerOver={(e) => { e.stopPropagation(); state.current.hover = k; document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { if (state.current.hover === k) state.current.hover = null; document.body.style.cursor = ''; }}
          onClick={(e) => { e.stopPropagation(); onPick(k); }}
        >
          <planeGeometry args={[RAIL.panel.w, RAIL.panel.h, 48, 2]} />
        </mesh>
      ))}

      <directionalLight position={[-5, 4, 5]} intensity={1.1} color="#ffe6b8" />
      <ambientLight intensity={0.25} color="#1a3a2e" />
    </>
  );
}

export function RibbonScene({
  plates,
  state,
  phone,
  onPick,
  dpr = [1, 1.6] as [number, number],
}: {
  plates: readonly CasePlate[];
  state: React.MutableRefObject<RibbonState>;
  phone: boolean;
  onPick: (k: number) => void;
  dpr?: [number, number];
}) {
  return (
    <Canvas
      className="ribbon__canvas"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: phone ? 46 : 40, near: 0.1, far: 70, position: [0, 0.35, 13.5] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping;
        gl.setClearColor('#060f0c', 0);
      }}
    >
      <Ribbon plates={plates} state={state} phone={phone} onPick={onPick} />
    </Canvas>
  );
}

export { clamp, smooth };
