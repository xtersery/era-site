import { Environment, PerspectiveCamera, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Color,
  Group,
  MeshBasicMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type PerspectiveCamera as PCam,
} from 'three';

import { stage } from '@/lib/stage';
void SEGMENTS;
import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { createBackingGeometry, createGlassGeometry, facet, RING, SEGMENTS, segmentAngle } from './ringGeometry';
import { createRingMaterial } from './ringMaterial';

export type CameraPreset = 'top' | 'eye' | 'arc' | 'stack';

interface WheelSetProps {
  cam: CameraPreset;
  vein: boolean;
  bookMatch: boolean;
  /** Ring centre in world units (desktop: projected from the DOM anchor). */
  ringX: number;
  ringY: number;
  /** Ring scale so the object fits its column (geometry params stay canonical). */
  ringScale: number;
  onReady: () => void;
}

/** The arc's front face sits at z ≈ 0; the camera looks at it from ~6 units. */
const CAMERAS: Record<CameraPreset, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  top: { pos: [0, 1.9, 5.9], look: [0, -0.05, 0], fov: 34 },
  eye: { pos: [0, 0.35, 6.0], look: [0, 0.05, 0], fov: 34 },
  arc: { pos: [0, 1.3, 3.6], look: [0, -0.05, 0], fov: 46 },
  stack: { pos: [2.6, 0.5, 4.2], look: [0.6, 0.1, 0], fov: 42 },
};

/** Temporary instrument plates: graphite with a brushed aperture — no imagery needed to judge the object. */
function createInstrumentPlate(seed: number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 768;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1a2320';
  ctx.fillRect(0, 0, 768, 768);
  const g = ctx.createRadialGradient(384, 384, 20, 384, 384, 380);
  g.addColorStop(0, '#4a524c');
  g.addColorStop(0.55, '#242d28');
  g.addColorStop(1, '#141c18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 768, 768);
  // brushed rings
  for (let r = 60 + seed * 13; r < 360; r += 9) {
    ctx.beginPath();
    ctx.arc(384, 384, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(207,175,114,${0.05 + 0.05 * Math.abs(Math.sin(r * 0.37 + seed))})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // aperture blades
  ctx.fillStyle = '#05080a';
  ctx.beginPath();
  ctx.arc(384, 384, 90 + seed * 10, 0, Math.PI * 2);
  ctx.fill();
  // one warm glint
  const k = ctx.createRadialGradient(300, 300, 0, 300, 300, 120);
  k.addColorStop(0, 'rgba(247,228,177,0.35)');
  k.addColorStop(1, 'rgba(247,228,177,0)');
  ctx.fillStyle = k;
  ctx.fillRect(0, 0, 768, 768);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function WheelSet({ cam, vein, bookMatch, ringX, ringY, ringScale, onReady }: WheelSetProps) {
  const gl = useThree((s) => s.gl);
  const [portrait, skin, veinNormal] = useTexture([
    '/spikes/hero/assets/portrait-test.png',
    '/spikes/hero/assets/skin-plate.jpg',
    '/spikes/hero/assets/vein-normal.png',
  ]);
  useMemo(() => {
    portrait.colorSpace = SRGBColorSpace;
    skin.colorSpace = SRGBColorSpace;
    veinNormal.wrapS = veinNormal.wrapT = RepeatWrapping;
  }, [portrait, skin, veinNormal]);

  const env = useMemo(() => createEraEnvironment(), []);
  const geometry = useMemo(() => createGlassGeometry({ ...RING, bookMatch }), [bookMatch]);
  const backing = useMemo(() => createBackingGeometry(RING), []);
  const { material, uniforms } = useMemo(() => createRingMaterial(veinNormal, { vein }), [veinNormal, vein]);
  const plates = useMemo(() => [createInstrumentPlate(1), createInstrumentPlate(2), createInstrumentPlate(3)], []);

  // Facet textures: temporary content only — the object is what is judged.
  const facetMaps = useMemo(
    () => [portrait, plates[0]!, skin, plates[1]!, portrait, plates[2]!, skin],
    [portrait, skin, plates],
  );
  const facetMaterials = useMemo(
    () => facetMaps.map((map) => new MeshBasicMaterial({ map, color: new Color('#ffffff') })),
    [facetMaps],
  );

  useEffect(() => {
    onReady();
  }, [onReady]);

  const groupRef = useRef<Group>(null);
  const cameraRef = useRef<PCam>(null);
  const preset = CAMERAS[cam];

  useEffect(() => {
    const c = cameraRef.current;
    if (!c) return;
    // The camera stays on the room axis; the ring sits at the DOM anchor's x (off-axis perspective is intended).
    c.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    c.lookAt(new Vector3(preset.look[0], preset.look[1], preset.look[2]));
    c.fov = preset.fov;
    c.updateProjectionMatrix();
  }, [preset]);

  // QA API
  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = w.__spike ?? {};
    w.__spike.info = () => ({
      memory: { ...gl.info.memory },
      render: { calls: gl.info.render.calls, triangles: gl.info.render.triangles },
      programs: gl.info.programs?.length ?? 0,
      drawingBuffer: { w: gl.domElement.width, h: gl.domElement.height },
    });
  }, [gl]);

  useFrame(() => {
    const deg = stage.services.wheelAngle;
    const rad = (deg * Math.PI) / 180;
    if (groupRef.current) groupRef.current.rotation.y = rad;
    uniforms.uWheelAngle.value = rad;
    // Facet hierarchy: the facing facet is full; neighbours fall into depth quickly
    // (the arc is shallow, so the falloff is sharpened to the segment step).
    for (let k = 0; k < SEGMENTS; k++) {
      const off = Math.atan2(Math.sin(segmentAngle(k) + rad), Math.cos(segmentAngle(k) + rad));
      const t = Math.max(0, 1 - Math.abs(off) / ((RING.stepDeg * Math.PI) / 180) / 1.6);
      const b = 0.2 + 0.8 * Math.pow(t, 1.6);
      facetMaterials[k]!.color.setScalar(b);
    }
  });

  const F = facet();

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault near={0.1} far={40} />
      <Environment map={env} background={false} />
      {/* Услуги is a light room: the canvas paints bone; only the object is lit. */}
      <color attach="background" args={['#ece8df']} />
      <fog attach="fog" args={['#ece8df', 7, 13]} />
      <directionalLight position={[-3, 3.4, 3]} intensity={3} color="#f7e4b1" />
      <directionalLight position={[3.5, -1, 1.5]} intensity={0.5} color="#7fb0a4" />
      <ambientLight intensity={0.14} color="#8a948c" />


      {/* The arc's axis is far behind the front face (z = −R), so turning slides the wall. */}
      <group position={[ringX, ringY, -RING.radius * ringScale]} scale={ringScale}>
        <group ref={groupRef}>
          {/* Image facets — embedded between the glass face and the graphite backing. */}
          {facetMaterials.map((mat, k) => (
            <mesh
              key={k}
              material={mat}
              position={[Math.sin(segmentAngle(k)) * F.distance, 0, Math.cos(segmentAngle(k)) * F.distance]}
              rotation={[0, segmentAngle(k), 0]}
            >
              <planeGeometry args={[F.width, F.height]} />
            </mesh>
          ))}
          {/* Graphite backing — every segment is a solid block. */}
          <mesh geometry={backing}>
            <meshStandardMaterial color="#16241e" roughness={0.6} metalness={0.05} envMapIntensity={0.5} />
          </mesh>
          {/* The glass — one mesh, seven states. */}
          <mesh geometry={geometry} material={material} />
        </group>
      </group>
    </>
  );
}
