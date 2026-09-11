// Node.js zero-dependency PNG generator for Color Match ⭐ icon
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per scanline
  const scanlineLength = width * 4 + 1;
  const buffer = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    buffer[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      buffer[pixelOffset] = r;
      buffer[pixelOffset + 1] = g;
      buffer[pixelOffset + 2] = b;
      buffer[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(buffer);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Generate 512x512 App Icon
const iconPng = createPng(512, 512, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle background
  const cornerRadius = 110;
  const inBoxX = Math.abs(dx) <= (cx - cornerRadius);
  const inBoxY = Math.abs(dy) <= (cy - cornerRadius);
  let inSquircle = false;

  if (inBoxX && Math.abs(dy) <= cy - 10) inSquircle = true;
  else if (inBoxY && Math.abs(dx) <= cx - 10) inSquircle = true;
  else {
    const cxCorner = Math.sign(dx) * (cx - cornerRadius);
    const cyCorner = Math.sign(dy) * (cy - cornerRadius);
    const dCorner = Math.hypot(dx - (cxCorner), dy - (cyCorner));
    if (dCorner <= cornerRadius - 10) inSquircle = true;
  }

  if (!inSquircle) return [0, 0, 0, 0]; // Transparent outside

  // Gradient dark background
  const grad = y / h;
  let bgR = Math.floor(18 + 12 * grad);
  let bgG = Math.floor(20 + 16 * grad);
  let bgB = Math.floor(38 + 25 * grad);

  // 4 quadrant colorful ring segments
  const ringInner = 140;
  const ringOuter = 210;
  if (dist >= ringInner && dist <= ringOuter) {
    const angle = Math.atan2(dy, dx); // -PI to PI
    if (angle >= -Math.PI && angle < -Math.PI / 2) {
      return [255, 68, 68, 255]; // Red
    } else if (angle >= -Math.PI / 2 && angle < 0) {
      return [68, 136, 255, 255]; // Blue
    } else if (angle >= 0 && angle < Math.PI / 2) {
      return [255, 221, 68, 255]; // Yellow
    } else {
      return [68, 204, 68, 255]; // Green
    }
  }

  // Inner Star/Circle core
  if (dist < 90) {
    // Glowing central star/orb
    const intensity = 1 - dist / 90;
    return [
      Math.min(255, Math.floor(255 * intensity + 240 * (1 - intensity))),
      Math.min(255, Math.floor(215 * intensity + 180 * (1 - intensity))),
      Math.min(255, Math.floor(0 + 40 * (1 - intensity))),
      255
    ];
  }

  return [bgR, bgG, bgB, 255];
});

const outDir = path.join(__dirname, 'src', 'assets');
fs.writeFileSync(path.join(outDir, 'icon.png'), iconPng);
console.log('Icon generated at src/assets/icon.png (512x512)');
