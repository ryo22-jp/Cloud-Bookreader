const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 単純なPNGバイナリを生成する関数（紫〜藍色のグラデーション背景）
function createSimplePng(width, height) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    // グラデーション色 (Indigo -> Purple)
    const r = Math.floor(99 + (168 - 99) * (y / height));
    const g = Math.floor(102 + (85 - 102) * (y / height));
    const b = Math.floor(241 + (247 - 241) * (y / height));

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;     // R
      rawData[pxOffset + 1] = g; // G
      rawData[pxOffset + 2] = b; // B
      rawData[pxOffset + 3] = 255; // A
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNGシグネチャ
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDRチャンク
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuf, data, crc]);
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createSimplePng(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createSimplePng(512, 512));
console.log('Icons generated successfully.');
