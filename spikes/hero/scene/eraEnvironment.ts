import { CanvasTexture, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';

/**
 * The ERA environment — a dark studio with one warm gold key (upper-left, the
 * logo's highlight ramp) and a cool teal fill band (right, low) — so every glass
 * body reflects and refracts green-gold naturally. Procedural equirect; the
 * production HDRI will be authored to the same description.
 */
export function createEraEnvironment(width = 1024, height = 512): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  // Ground: graphite-green studio, slightly lighter toward the horizon.
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#07110d');
  base.addColorStop(0.5, '#0f1c17');
  base.addColorStop(1, '#050a08');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const blob = (cx: number, cy: number, rx: number, ry: number, inner: string, outer: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ctx.globalCompositeOperation = 'lighter';
  // Gold key — upper left, compact and hot (the logo highlight → mid).
  blob(
    width * 0.32,
    height * 0.26,
    width * 0.07,
    height * 0.11,
    'rgba(247,228,177,1)',
    'rgba(207,175,114,0)',
  );
  blob(
    width * 0.32,
    height * 0.26,
    width * 0.16,
    height * 0.24,
    'rgba(207,175,114,0.55)',
    'rgba(175,139,79,0)',
  );
  // Teal fill — right, low and wide (the mineral vein).
  blob(
    width * 0.78,
    height * 0.62,
    width * 0.22,
    height * 0.2,
    'rgba(127,176,164,0.55)',
    'rgba(127,176,164,0)',
  );
  // A faint bone bounce from below (the interior's walls).
  blob(
    width * 0.5,
    height * 0.98,
    width * 0.5,
    height * 0.12,
    'rgba(236,232,223,0.18)',
    'rgba(236,232,223,0)',
  );
  ctx.globalCompositeOperation = 'source-over';

  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
