import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer: width * height * 4
  // PNG sub filter format: each scanline has 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.45);
  const cornerRadius = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Check if inside rounded rectangle or full bleed for maskable
      let inside = true;
      if (!isMaskable) {
        // Rounded square
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const half = width * 0.46;
        if (dx > half || dy > half) {
          inside = false;
        } else if (dx > half - cornerRadius && dy > half - cornerRadius) {
          const cdx = dx - (half - cornerRadius);
          const cdy = dy - (half - cornerRadius);
          if (cdx * cdx + cdy * cdy > cornerRadius * cornerRadius) {
            inside = false;
          }
        }
      }

      if (!inside) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Sky blue to emerald gradient: #0284c7 to #059669
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(2 * (1 - gradRatio) + 5 * gradRatio);
      let g = Math.round(132 * (1 - gradRatio) + 150 * gradRatio);
      let b = Math.round(199 * (1 - gradRatio) + 105 * gradRatio);

      // Draw phone & lock symbol in center
      const nx = (x - cx) / (width * 0.35);
      const ny = (y - cy) / (height * 0.35);
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Phone handle curve: approx circle arc
      const inPhone = (nx > -0.6 && nx < 0.6 && ny > -0.7 && ny < 0.7 && Math.abs(nx * 0.8 + ny * 0.5) < 0.35) ||
                      (Math.sqrt((nx + 0.35) * (nx + 0.35) + (ny + 0.45) * (ny + 0.45)) < 0.28) ||
                      (Math.sqrt((nx - 0.35) * (nx - 0.35) + (ny - 0.45) * (ny - 0.45)) < 0.28);

      // Lock shackle and body
      const inLock = (Math.abs(nx) < 0.25 && ny > -0.1 && ny < 0.4) ||
                     (Math.abs(nx) < 0.18 && ny > -0.35 && ny <= -0.1 && Math.abs(Math.sqrt(nx * nx + (ny + 0.1) * (ny + 0.1)) - 0.18) < 0.07);

      if (inPhone || inLock) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = 255;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    // CRC32 table
    let crc = 0 ^ (-1);
    const combined = Buffer.concat([typeBuf, data]);
    for (let i = 0; i < combined.length; i++) {
      let c = (crc ^ combined[i]) & 0xff;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc = (crc >>> 8) ^ c;
    }
    crc = crc ^ (-1);
    crcBuf.writeInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, false));
console.log('PNG icons created successfully');
