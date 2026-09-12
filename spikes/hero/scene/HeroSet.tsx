import { Environment, useFBO, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  NearestFilter,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type PerspectiveCamera,
  type Texture,
} from 'three';

import { stage } from '@/lib/stage';
import { damp, smoothstep } from '@/lib/utils';
import { anchorToWorld, measureAnchor, viewportAtDepth } from '@/three/utils/projection';

import { createEraEnvironment } from './eraEnvironment';
import { createLensGeometry } from './lensGeometry';
import {
  createScreenMaterial,
  HybridPath,
  PlainPath,
  TransmissionPath,
  type GlassPath,
} from './materials';
import { createWordmarkTexture } from './wordmarkTexture';

export type SpikeMode = 'hero' | 'compare' | 'diag';

export interface Placement {
  /** Fractions of the plate: where the plate centre sits relative to the lens (projected). */
  offsetX: number;
  offsetY: number;
  /** Plate size as a multiple of the viewport at the portrait depth. */
  scale: number;
}

interface HeroSetProps {
  path: GlassPath;
  mode: SpikeMode;
  tier: 'high' | 'mid';
  wordmarkEl: HTMLElement | null;
  onReady: () => void;
  /** Test portrait URL when present, else the procedural plate. */
  portraitUrl: string;
  /** Mutable placement (nudged from the HUD; read on the frame path). */
  placement: { current: Placement };
  /** Debug switches from the URL: veil on/off, attenuation distance override. */
  debug?: {
    veil: boolean;
    attenuation?: number;
    plain?: boolean;
    noNormal?: boolean;
    noClearcoat?: boolean;
    noDispersion?: boolean;
    noPatch?: boolean;
  };
}

const Z_GROUND = -3;
const Z_PORTRAIT = -2;
const Z_VEIL = -1;
const Z_WORD = 0;
const Z_LENS = 1.2;

/**
 * The veil: a near-opaque graphite plane between the lens and the portrait with
 * a soft hole that follows the lens footprint — she is a presence outside the
 * glass and seen only through it. A scene object, so all three paths agree.
 */
const VEIL_VERT = `varying vec2 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;
const VEIL_FRAG = `uniform vec3 uHole; uniform vec3 uColor; uniform float uOpacity; varying vec2 vWorld;
void main(){
  // A beam, not a hole: an elongated pool of light at the marble's ~35°, centred on the lens,
  // so the darkness never traces the lens silhouette (no orb).
  vec2 p = vWorld - uHole.xy;
  float c = cos(-0.61), s = sin(-0.61);
  vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float d = length(vec2(q.x / (uHole.z * 1.7), q.y / (uHole.z * 0.95)));
  float beam = smoothstep(0.55, 1.15, d);
  // and a wide, soft falloff around the lens so the pool never reaches far — still no circle at the rim
  float wide = smoothstep(uHole.z * 1.05, uHole.z * 1.9, length(p));
  float a = max(beam, wide * 0.85);
  gl_FragColor = linearToOutputTexel(vec4(uColor, a * uOpacity)); }`;

/** Radial deep-green ground: green is depth, the edges fall to graphite. */
function createGroundTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(256 * 0.7, 256 * 1.05, 10, 256 * 0.7, 256 * 1.05, 420);
  g.addColorStop(0, '#0b2219');
  g.addColorStop(0.45, '#08140f');
  g.addColorStop(1, '#050b09');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Calibration bands for the diag mode — the six skin tones as full-width rows. */
function createBandsTexture(tones: string[]): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 6 * 64;
  const ctx = c.getContext('2d')!;
  tones.forEach((t, i) => {
    ctx.fillStyle = t;
    ctx.fillRect(0, i * 64, 64, 64);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  return t;
}

const TONES = ['#f3d9c6', '#e6bfa2', '#cfa07f', '#b07b5d', '#8a5a40', '#5e3a2a'];

export function HeroSet({
  path,
  mode,
  tier,
  wordmarkEl,
  onReady,
  debug,
  portraitUrl,
  placement,
}: HeroSetProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);

  const [skin, veinNormal] = useTexture([portraitUrl, '/spikes/hero/assets/vein-normal.png']);
  useMemo(() => {
    skin.colorSpace = SRGBColorSpace;
    veinNormal.wrapS = veinNormal.wrapT = RepeatWrapping;
  }, [skin, veinNormal]);

  const env = useMemo(() => createEraEnvironment(), []);
  const ground = useMemo(() => createGroundTexture(), []);
  const bands = useMemo(() => createBandsTexture(TONES), []);
  const geometry = useMemo(() => createLensGeometry(1, 0.42, 128), []);

  const [wordmark, setWordmark] = useState<{ texture: Texture; aspect: number } | null>(null);
  useEffect(() => {
    if (!wordmarkEl) return;
    let cancelled = false;
    void createWordmarkTexture(wordmarkEl).then(({ texture, width, height }) => {
      if (cancelled) return;
      setWordmark({ texture, aspect: width / height });
      onReady();
    });
    return () => {
      cancelled = true;
    };
  }, [wordmarkEl, onReady]);

  // ---- layout from DOM anchors (re-measured on resize)
  const layout = useRef({
    word: { x: 0, y: 0, w: 1, h: 1 },
    lens: { x: 0.6, y: -0.2, r: 1 },
  });
  useEffect(() => {
    const measure = () => {
      const w = measureAnchor('hero-wordmark');
      const l = measureAnchor('hero-lens');
      if (w) {
        const ww = anchorToWorld(w, camera, Z_WORD);
        layout.current.word = { x: ww.x, y: ww.y, w: ww.width, h: ww.height };
      }
      if (l) {
        const lw = anchorToWorld(l, camera, Z_LENS);
        layout.current.lens = { x: lw.x, y: lw.y, r: Math.min(lw.width, lw.height) / 2 };
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [camera, size.width, size.height]);

  // ---- refs mutated on the frame path
  const lensRef = useRef<Group>(null);
  const veilRef = useRef<Mesh>(null);
  const veilMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VEIL_VERT,
        fragmentShader: VEIL_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uHole: { value: new Vector3(0, 0, 1) },
          uColor: { value: new Color('#07110d') },
          uOpacity: { value: 0.955 },
        },
      }),
    [],
  );
  const lensMeshRef = useRef<Mesh>(null);
  const portraitRef = useRef<Mesh>(null);
  const wordRef = useRef<Mesh>(null);
  const compareRefs = useRef<Mesh[]>([]);
  const state = useRef({ px: 0, py: 0, tiltX: 0, tiltY: 0, breathe: 0, clarity: 0 });

  // ---- path C pipeline: backdrop → FBO → lens shader
  const fbo = useFBO(size.width * viewport.dpr, size.height * viewport.dpr, { depth: true });
  const screenMaterial = useMemo(
    () => createScreenMaterial(veinNormal, fbo.texture),
    [veinNormal, fbo.texture],
  );
  useEffect(() => {
    screenMaterial.uniforms.uResolution!.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
  }, [screenMaterial, size.width, size.height, viewport.dpr]);

  const usesScreen = path === 'C' || mode === 'compare';

  useFrame(
    (root, delta) => {
      const s = state.current;
      const dt = Math.min(delta, 0.05);
      const p = stage.pointer;
      // Pointer: the lens drifts ≤ 4 % of the view and tilts ≤ 6°; the portrait shifts opposite.
      const view = viewportAtDepth(camera, Z_LENS);
      const targetX = p.active ? p.nx * view.width * 0.02 : 0;
      const targetY = p.active ? p.ny * view.height * 0.02 : 0;
      s.px = damp(s.px, targetX, 0.001, dt);
      s.py = damp(s.py, targetY, 0.001, dt);
      s.tiltY = damp(s.tiltY, (p.active ? p.nx : 0) * 0.105, 0.001, dt);
      s.tiltX = damp(s.tiltX, (p.active ? -p.ny : 0) * 0.105, 0.001, dt);
      s.breathe += dt / 20;

      // Scroll: the dolly into the lens over the hero's second half.
      const t = smoothstep(0.5, 0.85, stage.chapterProgress);
      const z = 5 - 3.4 * t;
      if (Math.abs(camera.position.z - z) > 1e-4) {
        camera.position.z = z;
        stage.camera.z = z;
        camera.updateProjectionMatrix();
      }
      s.clarity = 0;

      const L = layout.current;
      if (lensRef.current && mode !== 'compare') {
        lensRef.current.position.set(L.lens.x + s.px, L.lens.y + s.py, Z_LENS);
        lensRef.current.rotation.set(s.tiltX, s.tiltY + Math.sin(s.breathe) * 0.06, 0);
        lensRef.current.scale.setScalar(L.lens.r);
      }
      if (veilRef.current) {
        const vv = viewportAtDepth(camera, Z_VEIL);
        veilRef.current.scale.set(vv.width * 1.6, vv.height * 1.6, 1);
        // Project the lens footprint onto the veil plane (perspective scale from the camera).
        const k = (camera.position.z - Z_VEIL) / (camera.position.z - Z_LENS);
        const hx = mode === 'compare' ? 0 : (L.lens.x + s.px) * k;
        const hy = mode === 'compare' ? 0 : (L.lens.y + s.py) * k;
        const hr = mode === 'compare' ? vv.width : L.lens.r * k;
        veilMaterial.uniforms.uHole!.value.set(hx, hy, hr);
      }
      if (portraitRef.current) {
        const pv = viewportAtDepth(camera, Z_PORTRAIT);
        // Placement: the contour must cross the lens — depth on one side, the lit cheek on the other.
        // She shifts opposite the pointer (depth).
        const kp = (camera.position.z - Z_PORTRAIT) / (camera.position.z - Z_LENS);
        const P = placement.current;
        const img = skin.image as { width?: number; height?: number } | undefined;
        const aspect = img?.width && img?.height ? img.width / img.height : 1.5;
        const plateH = pv.height * P.scale;
        const plateW = plateH * aspect;
        const lx = mode === 'compare' ? 0 : L.lens.x * kp;
        const ly = mode === 'compare' ? 0 : L.lens.y * kp;
        portraitRef.current.position.set(
          lx + P.offsetX * plateW - s.px * 0.8,
          ly + P.offsetY * plateH - s.py * 0.8,
          Z_PORTRAIT,
        );
        portraitRef.current.scale.set(plateW, plateH, 1);
      }
      if (wordRef.current && wordmark) {
        wordRef.current.position.set(L.word.x, L.word.y, Z_WORD);
        wordRef.current.scale.set(L.word.w, L.word.h, 1);
      }

      if (usesScreen) {
        screenMaterial.uniforms.uVeinPhase!.value = s.breathe * 0.15;
        screenMaterial.uniforms.uClarity!.value = s.clarity;
        // Backdrop → FBO with every lens hidden, then the real frame.
        const lenses = [lensMeshRef.current, ...compareRefs.current].filter(Boolean) as Mesh[];
        for (const m of lenses) m.visible = false;
        root.gl.setRenderTarget(fbo);
        root.gl.render(scene, camera);
        root.gl.setRenderTarget(null);
        for (const m of lenses) m.visible = true;
        root.gl.render(scene, camera);
      }
    },
    usesScreen ? 1 : 0,
  );

  // ---- QA API: renderer info (always) and diag sampling (diag mode)
  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = w.__spike ?? {};
    w.__spike.info = () => ({
      memory: { ...gl.info.memory },
      render: { calls: gl.info.render.calls, triangles: gl.info.render.triangles },
      programs: gl.info.programs?.length ?? 0,
      dpr: viewport.dpr,
      drawingBuffer: { w: gl.domElement.width, h: gl.domElement.height },
    });
  }, [gl, viewport.dpr]);

  useEffect(() => {
    if (mode !== 'diag') return;
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = w.__spike ?? {};
    w.__spike.sample = () => {
      const ctx = gl.getContext();
      const dpr = viewport.dpr;
      const L = layout.current;
      const centre = new Vector3(L.lens.x, L.lens.y, Z_LENS).project(camera);
      const cx = ((centre.x + 1) / 2) * size.width;
      const cy = ((1 - centre.y) / 2) * size.height;
      const rPx = (L.lens.r / viewportAtDepth(camera, Z_LENS).height) * size.height;
      const read = (x: number, y: number) => {
        const px = new Uint8Array(4);
        ctx.readPixels(
          Math.round(x * dpr),
          Math.round((size.height - y) * dpr),
          1,
          1,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          px,
        );
        return [px[0], px[1], px[2]] as [number, number, number];
      };
      const rows = [-0.55, -0.3, 0, 0.3, 0.55].map((k) => {
        const y = cy + k * rPx;
        return { y, inside: read(cx, y), outside: read(size.width * 0.06, y) };
      });
      return rows;
    };
  }, [mode, gl, camera, size.width, size.height, viewport.dpr]);

  const lensMaterial = (which: GlassPath) =>
    debug?.plain ? (
      <PlainPath />
    ) : which === 'A' ? (
      <TransmissionPath
        veinNormal={veinNormal}
        clarity={0}
        tier={tier}
        attenuation={debug?.attenuation}
      />
    ) : which === 'B' ? (
      <HybridPath
        veinNormal={veinNormal}
        clarity={0}
        tier={tier}
        attenuation={debug?.attenuation}
        noNormal={debug?.noNormal}
        noClearcoat={debug?.noClearcoat}
        noDispersion={debug?.noDispersion}
        noPatch={debug?.noPatch}
      />
    ) : (
      <primitive object={screenMaterial} attach="material" />
    );

  return (
    <>
      <Environment map={env} background={false} />
      {/* PBR lights for paths A/B: gold key upper-left, teal fill right-low, low ambient. */}
      <directionalLight position={[-3, 3.2, 2.6]} intensity={3.2} color="#f7e4b1" />
      <directionalLight position={[3.5, -1.2, 1.5]} intensity={0.55} color="#7fb0a4" />
      <ambientLight intensity={0.12} color="#8a948c" />

      {/* Ground — deep green centre falling to graphite. */}
      <mesh
        position={[0, 0, Z_GROUND]}
        scale={[
          viewportAtDepth(camera, Z_GROUND).width * 1.6,
          viewportAtDepth(camera, Z_GROUND).height * 1.6,
          1,
        ]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={ground} />
      </mesh>

      {/* Portrait plane (test skin plate) or the calibration bands in diag mode. */}
      <mesh ref={portraitRef} position={[0, 0, Z_PORTRAIT]}>
        <planeGeometry args={[1, 1]} />
        {mode === 'diag' ? (
          <meshBasicMaterial map={bands} />
        ) : (
          <meshBasicMaterial map={skin} color={new Color('#e2d9cc')} />
        )}
      </mesh>

      {/* The veil — graphite with a soft hole that follows the lens. */}
      <mesh
        ref={veilRef}
        position={[0, 0, Z_VEIL]}
        material={veilMaterial}
        visible={debug?.veil !== false}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Editorial word motif — the only text in the scene. */}
      {wordmark && (
        <mesh ref={wordRef} position={[0, 0, Z_WORD]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={wordmark.texture} transparent depthWrite={false} />
        </mesh>
      )}

      {mode === 'compare' ? (
        (['A', 'B', 'C'] as GlassPath[]).map((which, i) => {
          const v = viewportAtDepth(camera, Z_LENS);
          const r = Math.min(v.width / 7.2, v.height / 3.4);
          return (
            <mesh
              key={which}
              ref={(m) => {
                if (m) compareRefs.current[i] = m;
              }}
              geometry={geometry}
              position={[(i - 1) * v.width * 0.3, -v.height * 0.02, Z_LENS]}
              scale={r}
              rotation={[0.02, (i - 1) * 0.08, 0]}
            >
              {lensMaterial(which)}
            </mesh>
          );
        })
      ) : (
        <group ref={lensRef} position={[0, 0, Z_LENS]}>
          <mesh ref={lensMeshRef} geometry={geometry}>
            {lensMaterial(path)}
          </mesh>
        </group>
      )}
    </>
  );
}
