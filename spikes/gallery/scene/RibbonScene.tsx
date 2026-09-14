import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  FogExp2,
  LinearFilter,
  NoToneMapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Line,
  type Mesh,
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
 * forward and **unrolls flat** in front of the visitor while the archive
 * recedes behind it; the sheet then carries the two states of the case; the
 * ground is ERA's mineral dark instead of a paper grid; and the rail is a real
 * hairline the sheets hang from, with a glint where the visitor is standing.
 */

/**
 * The staging (pass 7b). A tight helix the visitor stands just outside of.
 *
 * Eight cases make one full turn: 45° apart on a radius of 4, each hanging
 * 0.8 below the last. The visitor stands 4.8 outside the ring, a little above
 * the case she has arrived at, and looks slightly down — so the ring is in the
 * frame as a ring: the docked case frontal and lit, the next and the previous
 * turned away on either side, the ones after them edge-on at the sides, and
 * the far side of the turn showing through the gaps, lower and cooler. The
 * hierarchy is distance and angle; nothing is scaled to make it.
 */
export interface Staging {
  /** radius of the helix the sheets are wrapped to */
  radius: number;
  /** angle between two cases around the helix */
  step: number;
  /** how far one case hangs below the previous one */
  drop: number;
  /** how far the visitor stands from the case she has arrived at */
  dock: number;
  /** how far the docked case rides above the view axis */
  lift: number;
  /** how far above the docked case the visitor's eye is — she looks slightly down the turn */
  elev: number;
  /** how far a sheet may recede: the fog's reach in units beyond the dock, and how much of it */
  fog: { reach: number; amount: number };
  /** how far a case can be from the dock before it is not drawn */
  visible: number;
  /** the whole view slid sideways so the docked case hangs right of centre */
  side: number;
  /** how much the camera steps in while a case is open */
  stepIn: number;
  fov: number;
  /** scale of a case one step away from the dock */
  neighbour: number;
  /** where the open sheet stands, in camera space, and its scale */
  open: { x: number; y: number; z: number; scale: number };
}

export const PANEL = { w: 2.4, h: 3.0 } as const;

export const STAGING: { readonly desktop: Staging; readonly phone: Staging } = {
  desktop: {
    radius: 3.6,
    step: (44 * Math.PI) / 180,
    drop: 0.8,
    dock: 8.6,
    lift: -0.5,
    elev: 1.6,
    side: 0.45,
    stepIn: 1.4,
    fov: 30,
    neighbour: 0.94,
    fog: { reach: 9, amount: 0.6 },
    visible: 4.5,
    open: { x: 1.0, y: 0.1, z: -9.2, scale: 1.25 },
  },
  // the phone frame is too narrow to hold the ring, so it holds a column of it:
  // a steeper, tighter turn seen from further back
  phone: {
    radius: 3.2,
    step: (45 * Math.PI) / 180,
    drop: 1.6,
    dock: 8.4,
    lift: 1.3,
    elev: 0.8,
    side: 0.15,
    stepIn: 1.2,
    fov: 50,
    neighbour: 0.92,
    fog: { reach: 9, amount: 0.62 },
    visible: 4.5,
    open: { x: 0, y: 1.22, z: -7.8, scale: 1.05 },
  },
};

export interface CasePlate {
  after: string;
  before: string;
}

export interface SheetBox {
  x: number;
  y: number;
  w: number;
  h: number;
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
  /** index the pointer (or keyboard focus) is on, or null */
  hover: number | null;
  /** written by the scene: the screen box of the focused sheet, for the DOM to sit beside */
  focusBox: SheetBox | null;
  /** written by the scene: the screen box of every visible sheet, for the DOM grips */
  boxes: (SheetBox | null)[];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** where case k hangs on the rail: the top edge is on the rail, the sheet hangs below it */
export function slot(k: number, st: Staging): { x: number; top: number; z: number; yaw: number } {
  const a = k * st.step;
  // the helix winds so that the NEXT case comes round on the visitor's left
  return { x: -Math.sin(a) * st.radius, top: -k * st.drop + PANEL.h / 2, z: Math.cos(a) * st.radius, yaw: -a };
}

/** the rail's height at a fractional position: level across each sheet, descending between them */
function railTop(t: number, st: Staging): number {
  const k = Math.floor(t);
  const f = t - k;
  const s = clamp((f - 0.24) / 0.52, 0, 1);
  return -(k + s * s * (3 - 2 * s)) * st.drop + PANEL.h / 2;
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

/** the rail: one hairline helix running through the top edge of every sheet */
function useRailGeometry(n: number, st: Staging): BufferGeometry {
  return useMemo(() => {
    const per = 24;
    const from = -1.2;
    const to = n + 0.2;
    const count = Math.ceil((to - from) * per);
    const pos: number[] = [];
    const uv: number[] = [];
    for (let i = 0; i <= count; i++) {
      const t = from + (i / count) * (to - from);
      const s = slot(t, st);
      pos.push(s.x, railTop(t, st) + 0.05, s.z);
      uv.push(t / Math.max(1, n - 1), 0);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    return g;
  }, [n, st]);
}

function Ribbon({
  plates,
  state,
  staging: st,
  hoverLift,
  still,
}: {
  plates: readonly CasePlate[];
  state: React.MutableRefObject<RibbonState>;
  staging: Staging;
  hoverLift: boolean;
  /** reduced motion: the ribbon does not drift and nothing lifts */
  still: boolean;
}) {
  const { scene, size, camera } = useThree();
  const textures = useCaseTextures(plates);
  const n = plates.length;
  const mats = useMemo(() => textures.map(([a, b]) => createPanelMaterial(a!, b!, st.radius, st.dock, st.fog)), [textures, st]);
  const railMat = useMemo(() => createRailMaterial(), []);
  const railGeo = useRailGeometry(n, st);
  const env = useMemo(() => createEraEnvironment(512, 256), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const rail = useRef<Line | null>(null);
  const hoverAmt = useMemo(() => new Float32Array(plates.length), [plates.length]);
  const tmp = useMemo(() => ({ v: new Vector3(), a: new Vector3(), b: new Vector3(), c: new Vector3(), d: new Vector3() }), []);
  const last = useRef(0);

  useEffect(() => {
    scene.environment = env;
    scene.fog = new FogExp2('#060f0c', 0.05);
    return () => {
      scene.environment = null;
      scene.fog = null;
      env.dispose();
      mats.forEach((m) => m.dispose());
      railMat.dispose();
      railGeo.dispose();
    };
  }, [scene, env, mats, railMat, railGeo]);

  /** projects a sheet's corners and returns its screen box */
  const boxOf = (mesh: Mesh, out: SheetBox): SheetBox => {
    const w = PANEL.w * mesh.scale.x * 0.5;
    const h = PANEL.h * mesh.scale.y * 0.5;
    tmp.a.set(-w, h, 0).applyQuaternion(mesh.quaternion).add(mesh.position).project(camera);
    tmp.b.set(w, -h, 0).applyQuaternion(mesh.quaternion).add(mesh.position).project(camera);
    out.x = ((tmp.a.x + 1) / 2) * size.width;
    out.y = ((1 - tmp.a.y) / 2) * size.height;
    out.w = ((tmp.b.x - tmp.a.x) / 2) * size.width;
    out.h = ((tmp.a.y - tmp.b.y) / 2) * size.height;
    return out;
  };

  useFrame(({ clock, gl }) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const dt = Math.min(0.05, t - last.current);
    last.current = t;
    const drift = still ? 0 : t * 0.035; // the ribbon is never quite still — unless motion is reduced
    const u = smooth(s.unfold);

    // --- the camera rides just outside the helix and looks at the docked case ---
    const camA = s.pos * st.step + drift * 0.25;
    const camR = st.radius + st.dock;
    const dockY = -s.pos * st.drop; // centre height of the docked case at scale 1
    const browseX = -Math.sin(camA) * camR;
    const browseZ = Math.cos(camA) * camR;
    // stepping in a little as a case opens, never enough to lose the archive
    camera.position.set(
      lerp(browseX, -Math.sin(camA) * (camR - st.stepIn), u),
      lerp(dockY + st.elev, dockY + st.elev * 0.5 + 0.15, u),
      lerp(browseZ, Math.cos(camA) * (camR - st.stepIn), u),
    );
    // the view axis passes below the docked case, so it rides above centre and
    // the case coming next has room to rise into the frame
    tmp.v.set(-Math.sin(camA) * st.radius, dockY - st.lift, Math.cos(camA) * st.radius);
    // slide the whole view sideways so the docked case hangs right of centre —
    // a translation, not a swing
    tmp.a.set(camera.position.x - tmp.v.x, 0, camera.position.z - tmp.v.z).normalize();
    tmp.b.set(-tmp.a.z, 0, tmp.a.x).multiplyScalar(st.side);
    camera.position.add(tmp.b);
    tmp.v.add(tmp.b);
    camera.lookAt(tmp.v);

    railMat.uniforms['uHere']!.value = clamp(s.pos / Math.max(1, n - 1), 0, 1);
    railMat.uniforms['uDim']!.value = smooth(clamp((u - 0.25) / 0.55, 0, 1));
    // dev readout for the technical report
    (window as unknown as Record<string, unknown>)['__gl'] = {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length ?? 0,
      textures: gl.info.memory.textures,
    };

    // --- the sheets ---
    const probe: ({ k: number; dist: number } & SheetBox)[] = [];
    for (let k = 0; k < n; k++) {
      const mesh = meshes.current[k];
      const mat = mats[k]!;
      if (!mesh) continue;
      const sl = slot(k, st);
      const focused = s.focus === k;
      const d = k - s.pos;
      const ad = Math.abs(d);
      // the hover response is eased so the sheet rises and settles, never snaps
      const hv = hoverLift && s.hover === k && !focused ? 1 : 0;
      hoverAmt[k] = lerp(hoverAmt[k]!, hv, 1 - Math.exp(-dt * 9));
      const hover = hoverAmt[k]!;

      if (focused && u > 0.0001) {
        // The chosen case leaves the rail, comes forward and unrolls flat.
        // The travel is interpolated in CAMERA space, so the sheet approaches the
        // viewer monotonically instead of swinging past her and coming back.
        const scaleOnRail = lerp(st.neighbour, 1, clamp(1 - ad, 0, 1));
        tmp.c.set(sl.x, sl.top - (PANEL.h / 2) * scaleOnRail, sl.z);
        camera.worldToLocal(tmp.c); // where it hangs now, seen from the visitor
        tmp.a.set(st.open.x, st.open.y, st.open.z); // where it will stand
        tmp.b.lerpVectors(tmp.c, tmp.a, u);
        camera.localToWorld(tmp.b);
        mesh.position.copy(tmp.b);
        // one clean rotation from its place on the rail to facing the visitor
        mesh.rotation.set(0, sl.yaw, 0);
        mesh.quaternion.slerp(camera.quaternion, u);
        mesh.scale.setScalar(lerp(scaleOnRail, st.open.scale, u));
        mat.uniforms['uBend']!.value = 1 - u; // the unfold
        mat.uniforms['uDim']!.value = 0;
        mat.uniforms['uOpacity']!.value = 1;
        mat.uniforms['uReveal']!.value = s.reveal;
        mat.uniforms['uFieldAmount']!.value = s.field.amount;
        (mat.uniforms['uField']!.value as Vector2).set(s.field.x, s.field.y);
        mat.uniforms['uEdge']!.value = 1 - u * 0.7; // the glint settles as the sheet lies flat
        mat.uniforms['uFlat']!.value = 0;
        mat.uniforms['uFog']!.value = 0;
        // hand the DOM the sheet's screen box so the editorial block can sit beside it
        s.focusBox = boxOf(mesh, s.focusBox ?? { x: 0, y: 0, w: 0, h: 0 });
      } else {
        const nearFocus = clamp(1 - ad, 0, 1); // 1 at the dock, 0 one case away
        const scale = lerp(st.neighbour, 1, nearFocus);
        mesh.position.set(sl.x, sl.top - (PANEL.h / 2) * scale, sl.z);
        // on hover the sheet lifts a little off the rail toward the visitor
        if (hover > 0.001) {
          tmp.d.subVectors(camera.position, mesh.position).normalize().multiplyScalar(0.22 * hover);
          mesh.position.add(tmp.d);
        }
        mesh.rotation.set(0, sl.yaw, 0);
        mesh.scale.setScalar(scale * (1 + 0.012 * hover));
        mat.uniforms['uBend']!.value = 1;
        // the archive recedes while a case is read, but stays an archive
        // the recession is clamped: a case three steps away is still a case
        mat.uniforms['uDim']!.value = clamp((1 - nearFocus) * 0.22 + Math.max(0, ad - 1.5) * 0.1, 0, 0.62);
        // while a case is read the archive leaves the composition: the open case
        // is its own scene, not a card over the turn. It goes as the sheet arrives
        // and is back before the sheet has re-wrapped.
        const gone = smooth(clamp((u - 0.25) / 0.55, 0, 1));
        mat.uniforms['uOpacity']!.value = clamp(1 - Math.max(0, ad - st.visible + 1) * 0.9, 0, 1) * (1 - gone * 0.97);
        // away from the dock a case loses contrast and colour into the mineral dark
        mat.uniforms['uFlat']!.value = clamp((1 - nearFocus) * 0.55 + Math.max(0, ad - 1) * 0.12, 0, 0.8);
        mat.uniforms['uFog']!.value = 1;
        mat.uniforms['uReveal']!.value = 0;
        mat.uniforms['uFieldAmount']!.value = 0;
        // the docked case carries a fine gold edge — the one taken out of the archive
        mat.uniforms['uEdge']!.value = clamp(nearFocus * nearFocus * 0.85 + hover * 0.6, 0, 1) * (1 - u);
      }
      mesh.visible = ad < st.visible || focused;

      // the screen box of every visible sheet, for the DOM grips and the dev probe
      if (mesh.visible && !(focused && u > 0.0001)) {
        const b = boxOf(mesh, s.boxes[k] ?? { x: 0, y: 0, w: 0, h: 0 });
        s.boxes[k] = b;
        tmp.a.set(0, 0, 0).applyQuaternion(mesh.quaternion).add(mesh.position);
        probe.push({ k, ...b, dist: Math.round(tmp.a.distanceTo(camera.position) * 100) / 100 });
      } else {
        s.boxes[k] = null;
      }
    }
    if (s.unfold < 0.05) s.focusBox = null;
    (window as unknown as Record<string, unknown>)['__sheets'] = probe.map((p) => ({
      k: p.k, x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h), dist: p.dist,
    }));
  });

  return (
    <>
      {/* the rail: a hairline helix through the top edge of every sheet, with a glint where the visitor stands */}
      {/* @ts-expect-error — r3f's <line> is three.Line, not the SVG element */}
      <line ref={rail} geometry={railGeo} material={railMat} frustumCulled={false} renderOrder={-1} />

      {plates.map((_, k) => (
        <mesh key={k} ref={(el) => { meshes.current[k] = el; }} material={mats[k]!} frustumCulled={false}>
          <planeGeometry args={[PANEL.w, PANEL.h, 48, 2]} />
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
  reduced = false,
  dpr = [1, 1.6] as [number, number],
}: {
  plates: readonly CasePlate[];
  state: React.MutableRefObject<RibbonState>;
  phone: boolean;
  reduced?: boolean;
  dpr?: [number, number];
}) {
  const st = phone ? STAGING.phone : STAGING.desktop;
  return (
    <Canvas
      className="ribbon__canvas"
      dpr={dpr}
      // the canvas never takes the pointer: the sheets are picked through DOM grips
      style={{ pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: st.fov, near: 0.1, far: 80, position: [0, 0.25, st.radius + st.dock] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping;
        gl.setClearColor('#060f0c', 0);
      }}
    >
      <Ribbon plates={plates} state={state} staging={st} hoverLift={!reduced} still={reduced} />
    </Canvas>
  );
}

export { clamp, smooth };
