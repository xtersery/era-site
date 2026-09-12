import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * The editorial word motif «эра» as a canvas texture, drawn with the same
 * webfont and aligned to the DOM element's line box so the scene can take over
 * from the DOM wordmark without a visible jump. Returns the texture and the
 * baseline placement used (for QA).
 */
export async function createWordmarkTexture(
  el: HTMLElement,
  text = 'эра',
  scale = 2,
): Promise<{ texture: CanvasTexture; width: number; height: number }> {
  await document.fonts.ready;
  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  const family = cs.fontFamily;
  const letterSpacing = cs.letterSpacing;
  const rect = el.getBoundingClientRect();
  const width = Math.ceil(rect.width * scale);
  const height = Math.ceil(rect.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${cs.fontWeight} ${fontSize * scale}px ${family}`;
  if (letterSpacing !== 'normal') {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${parseFloat(letterSpacing) * scale}px`;
  }
  ctx.fillStyle = cs.color;
  ctx.textBaseline = 'alphabetic';
  // Baseline inside a CSS line box: (lineHeight − (ascent + descent)) / 2 + ascent.
  const m = ctx.measureText(text);
  const ascent = m.fontBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent;
  const baseline = (height - (ascent + descent)) / 2 + ascent;
  // The DOM crops the «э» past the gutter; the element's left edge is the text start.
  ctx.fillText(text, 0, baseline);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, width, height };
}
