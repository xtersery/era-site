import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from 'three';

import { MINERAL } from '../../hero/scene/materials';

/** Approved mineral glass on a lightweight plane (path B). `clarity` 0 = refracting, 1 = clear. */
export function glassMaterial(veinNormal: Texture, clarity = 0.3, thickness = 0.22): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    transmission: 1,
    thickness: thickness * (1 - clarity * 0.8),
    ior: 1 + (MINERAL.ior - 1) * (1 - clarity),
    dispersion: 0.1 * (1 - clarity),
    roughness: MINERAL.roughness,
    attenuationColor: new Color(MINERAL.attenuationColor),
    attenuationDistance: 3.2 / Math.max(0.15, 1 - clarity),
    color: new Color('#f8f6f1'),
    normalMap: veinNormal,
    normalScale: new Vector2(0.04, 0.04),
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
  });
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ease used for every pseudo-motion: slow in, heavy settle. */
export const ease = (t: number) => smoothstep(0, 1, smoothstep(0, 1, t));

/** A second "state" image from the same portrait: a different crop, so imagery stays fair. */
export function cropOf(texture: Texture, ox: number, oy: number, rx: number, ry: number): Texture {
  const t = texture.clone();
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(rx, ry);
  t.offset.set(ox, oy);
  t.needsUpdate = true;
  return t;
}

/** Temporary instrument plate (graphite, brushed aperture, one gold glint). */
export function instrumentPlate(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 960;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(384, 480, 20, 384, 480, 520);
  g.addColorStop(0, '#4a524c');
  g.addColorStop(0.55, '#242d28');
  g.addColorStop(1, '#141c18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 768, 960);
  for (let r = 70; r < 420; r += 9) {
    ctx.beginPath();
    ctx.arc(384, 480, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(207,175,114,${0.05 + 0.05 * Math.abs(Math.sin(r * 0.37))})`;
    ctx.stroke();
  }
  ctx.fillStyle = '#05080a';
  ctx.beginPath();
  ctx.arc(384, 480, 100, 0, Math.PI * 2);
  ctx.fill();
  const k = ctx.createRadialGradient(300, 380, 0, 300, 380, 140);
  k.addColorStop(0, 'rgba(247,228,177,0.4)');
  k.addColorStop(1, 'rgba(247,228,177,0)');
  ctx.fillStyle = k;
  ctx.fillRect(0, 0, 768, 960);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
