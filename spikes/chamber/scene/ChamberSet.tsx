import { Environment, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Color, RepeatWrapping, SRGBColorSpace, Vector3, type PerspectiveCamera as PCam, type Texture } from 'three';

import { createEraEnvironment } from '../../hero/scene/eraEnvironment';
import { cropOf, ease, glassMaterial, instrumentPlate, lerp } from '../../services/scene/shared';

/**
 * Services 360 chamber — visual proof.
 *
 * A seven-sided rotunda seen from INSIDE, slightly off its axis. Each wall is one
 * editorial face (bone wall, a dark mineral recess, one dominant image, one macro,
 * one continuous glass surface, one gold hairline at the wall's 35°). The chamber
 * turns about its invisible vertical axis; the camera stays put. Only the wall she
 * faces is frontal; the adjacent walls are oblique slivers at the frame edges.
 */
export const FACES = 7;
export const STEP = (Math.PI * 2) / FACES;
const R = 3.0; // apothem — distance from the axis to a wall
const W = 2 * R * Math.tan(STEP / 2); // wall width
const H = 3.4;

interface Props {
  t: number;
  from: number;
  to: number;
  axisX: number;
  axisY: number;
  scale: number;
  fov: number;
  mobile: boolean;
}

function Face({ k, textures, veinNormal }: { k: number; textures: Texture[]; veinNormal: Texture }) {
  const mirror = k % 2 === 1 ? -1 : 1;
  // Optically calm glass: faces behind it shift, never warp (vein almost off, thin).
  const glass = useMemo(() => {
    const m = glassMaterial(veinNormal, 0.5, 0.12);
    m.normalScale.set(0.012, 0.012);
    return m;
  }, [veinNormal]);
  const image = textures[k % textures.length]!;
  const macro = textures[(k + 2) % textures.length]!;
  const angle = k * STEP;
  return (
    // Face k sits at angle k·STEP around the axis (0 = straight ahead, at −z) and faces inward.
    <group position={[Math.sin(angle) * R, 0, -Math.cos(angle) * R]} rotation={[0, -angle, 0]}>
      {/* the wall — a shade below the room's bone so depth reads */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[W + 0.02, H]} />
        <meshBasicMaterial color="#e2ddd2" />
      </mesh>
      {/* the mineral recess — cut into the wall */}
      <mesh position={[-0.3 * mirror, -0.08, 0.012]} name={`face-${k}-recess`}>
        <planeGeometry args={[2.05, 2.6]} />
        <meshBasicMaterial color="#0f1d17" />
      </mesh>
      {/* dominant image, inside the recess */}
      <mesh position={[-0.42 * mirror, -0.12, 0.03]} name={`face-${k}-image`}>
        <planeGeometry args={[1.3, 1.62]} />
        <meshBasicMaterial map={image} />
      </mesh>
      {/* macro, forward and low on the other side */}
      <mesh position={[0.82 * mirror, -0.86, 0.14]}>
        <planeGeometry args={[0.58, 0.72]} />
        <meshBasicMaterial map={macro} color={new Color().setScalar(0.9)} />
      </mesh>
      {/* the continuous optical surface — one slab crossing the recess edge */}
      <mesh position={[0.34 * mirror, 0.05, 0.46]} rotation={[0, 0.18 * mirror, -0.04 * mirror]} material={glass}>
        <boxGeometry args={[1.25, 1.5, 0.1]} />
      </mesh>
      {/* one gold hairline on the wall at the marble's diagonal */}
      <mesh position={[0.35 * mirror, 0.72, 0.02]} rotation={[0, 0, -0.61 * mirror]}>
        <boxGeometry args={[1.4, 0.004, 0.004]} />
        <meshBasicMaterial color="#cfaf72" />
      </mesh>
    </group>
  );
}

export function ChamberSet({ t, from, to, axisX, axisY, scale, fov, mobile }: Props) {
  const camera = useThree((s) => s.camera) as PCam;
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const w = window as Window & { __spike?: Record<string, unknown> };
    w.__spike = w.__spike ?? {};
    w.__spike.probe = () => {
      const out: Record<string, unknown> = {};
      for (const n of ['face-0-image', 'face-0-recess', 'face-1-image', 'face-6-image']) {
        const o = scene.getObjectByName(n);
        if (!o) continue;
        const v = new Vector3();
        o.getWorldPosition(v);
        const p = v.clone().project(camera);
        out[n] = { world: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)], ndc: [+p.x.toFixed(2), +p.y.toFixed(2)] };
      }
      out.camera = [+camera.position.x.toFixed(2), +camera.position.y.toFixed(2), +camera.position.z.toFixed(2)];
      return out;
    };
  }, [scene, camera]);
  const [portrait, skin, veinNormal] = useTexture([
    '/spikes/hero/assets/portrait-test.png',
    '/spikes/hero/assets/skin-plate.jpg',
    '/spikes/hero/assets/vein-normal.png',
  ]);
  const env = useMemo(() => createEraEnvironment(), []);
  const textures = useMemo(() => {
    portrait.colorSpace = SRGBColorSpace;
    skin.colorSpace = SRGBColorSpace;
    veinNormal.wrapS = veinNormal.wrapT = RepeatWrapping;
    return [cropOf(portrait, 0.22, 0, 0.5, 1), instrumentPlate(), cropOf(portrait, 0, 0, 0.5, 1), skin];
  }, [portrait, skin, veinNormal]);

  const e = ease(t);
  const turn = from * STEP + (to - from) * STEP * e;
  const mid = Math.sin(Math.PI * e);

  useEffect(() => {
    // The viewer stands inside, behind the axis, slightly left of it: the axis lands
    // right of the field's centre and the facing wall fills the field.
    // The camera stays on the screen axis (x = 0) looking straight ahead; the chamber is
    // placed at the field's world position, its axis a little right of the field centre.
    // A very subtle dolly during the turn (≤ 0.08) — the viewer stays grounded.
    // Viewer 2.0 inside the axis (rotunda radius 3): the facing wall is 5 away and
    // ~1.4× the window wide; the adjacent walls are oblique at the window's edges.
    const cz = 2.0 * scale - 0.08 * mid * scale;
    camera.position.set(0, 0, cz);
    camera.lookAt(new Vector3(0, 0, -R * scale));
    void mobile;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, axisX, axisY, scale, fov, mobile, mid]);

  return (
    <>
      <Environment map={env} background={false} />
      <color attach="background" args={['#ece8df']} />
      <fog attach="fog" args={['#ece8df', 5.5, 11]} />
      {/* one fixed gold key on the viewer's side; the chamber turns under it */}
      <directionalLight position={[axisX - 2.6, axisY + 3.2, 1.2]} intensity={lerp(2.8, 2.2, mid)} color="#f7e4b1" />
      <directionalLight position={[axisX + 3, axisY - 1, -0.5]} intensity={0.45} color="#7fb0a4" />
      <ambientLight intensity={0.3} color="#e6e2d8" />
      <group position={[axisX, axisY, 0]} scale={scale} rotation={[0, turn, 0]}>
        {Array.from({ length: FACES }, (_, k) => (
          <Face key={k} k={k} textures={textures} veinNormal={veinNormal} />
        ))}
      </group>
    </>
  );
}
