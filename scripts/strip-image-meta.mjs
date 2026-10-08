// Lossless private-metadata strip for real-person photographs (cases,
// specialists, founder). Rewrites the container only — the compressed image
// data is copied byte for byte, nothing is re-encoded.
//
//   JPEG  keeps APP0 (JFIF), APP2 ICC_PROFILE, APP14 (Adobe colour transform)
//         drops APP1 (EXIF: GPS, make/model, serials, dates, MakerNote · XMP),
//         APP13 (Photoshop/IPTC), COM and every other APPn
//   WebP  keeps VP8/VP8L/ALPH/ANIM/ANMF/ICCP; drops EXIF and XMP chunks
//         (VP8X flags are updated to match)
//
// Refuses a JPEG whose EXIF orientation is not 1: dropping it would turn the
// picture. Bake the rotation first (sips -r), then strip.
//
//   node scripts/strip-image-meta.mjs <file>...          strip in place
//   node scripts/strip-image-meta.mjs --check <file>...  exit 1 if any file carries private metadata
import { readFileSync, writeFileSync } from 'node:fs';

const KEEP_APP = (marker, seg) =>
  marker === 0xe0 ||
  marker === 0xee ||
  (marker === 0xe2 && seg.subarray(0, 12).toString('latin1') === 'ICC_PROFILE\0');

function exifOrientation(tiff) {
  const le = tiff[0] === 0x49;
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const ifd = le ? tiff.readUInt32LE(4) : tiff.readUInt32BE(4);
  const n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

function stripJpeg(buf, file) {
  const out = [buf.subarray(0, 2)];
  const dropped = [];
  let o = 2;
  while (o < buf.length) {
    if (buf[o] !== 0xff) throw new Error(`${file}: malformed JPEG at ${o}`);
    const m = buf[o + 1];
    if (m === 0xda) {
      out.push(buf.subarray(o)); // SOS → end: entropy-coded data, untouched
      break;
    }
    const len = buf.readUInt16BE(o + 2);
    const seg = buf.subarray(o + 4, o + 2 + len);
    const isApp = m >= 0xe0 && m <= 0xef;
    if ((isApp && !KEEP_APP(m, seg)) || m === 0xfe) {
      if (m === 0xe1 && seg.subarray(0, 6).toString('latin1') === 'Exif\0\0') {
        const orient = exifOrientation(seg.subarray(6));
        if (orient !== 1)
          throw new Error(
            `${file}: EXIF orientation ${orient} — bake the rotation before stripping`,
          );
      }
      dropped.push(m === 0xfe ? 'COM' : `APP${m - 0xe0}`);
    } else {
      out.push(buf.subarray(o, o + 2 + len));
    }
    o += 2 + len;
  }
  return { data: Buffer.concat(out), dropped };
}

function stripWebp(buf) {
  const chunks = [];
  const dropped = [];
  let o = 12;
  while (o + 8 <= buf.length) {
    const type = buf.subarray(o, o + 4).toString('latin1');
    const len = buf.readUInt32LE(o + 4);
    const end = o + 8 + len + (len & 1);
    if (type === 'EXIF' || type === 'XMP ') dropped.push(type.trim());
    else chunks.push(Buffer.from(buf.subarray(o, end)));
    o = end;
  }
  const vp8x = chunks.find((c) => c.subarray(0, 4).toString() === 'VP8X');
  if (vp8x) vp8x[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0);
  head.writeUInt32LE(body.length + 4, 4);
  head.write('WEBP', 8);
  return { data: Buffer.concat([head, body]), dropped };
}

export function strip(buf, file = '') {
  if (buf[0] === 0xff && buf[1] === 0xd8) return stripJpeg(buf, file);
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP')
    return stripWebp(buf);
  throw new Error(`${file}: unsupported format (JPEG and WebP only)`);
}

const args = process.argv.slice(2);
const check = args[0] === '--check';
let dirty = 0;
for (const file of check ? args.slice(1) : args) {
  const buf = readFileSync(file);
  const { data, dropped } = strip(buf, file);
  if (!dropped.length) continue;
  if (check) {
    dirty++;
    console.error(`private metadata: ${file} (${dropped.join(', ')})`);
  } else {
    writeFileSync(file, data);
    console.log(`stripped ${file}: ${dropped.join(', ')}  ${buf.length} → ${data.length} B`);
  }
}
if (check && dirty) process.exit(1);
