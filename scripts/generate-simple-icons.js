#!/usr/bin/env node

/**
 * Simple Icon Generator
 * Generates basic PWA icons without external dependencies
 * Run: node scripts/generate-simple-icons.js
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a simple PNG with a solid color
// This is a minimal PNG file structure
function createMinimalPNG(size, r, g, b) {
  const width = size;
  const height = size;

  // PNG file signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (image header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (2 = RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data) - solid color
  const pixelsPerRow = width * 3 + 1; // RGB + filter byte
  const imageData = Buffer.alloc(height * pixelsPerRow);

  for (let y = 0; y < height; y++) {
    const rowStart = y * pixelsPerRow;
    imageData[rowStart] = 0; // filter type: None

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      imageData[pixelStart] = r;
      imageData[pixelStart + 1] = g;
      imageData[pixelStart + 2] = b;
    }
  }

  // Compress the image data
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(imageData, { level: 9 });
  const idat = createChunk('IDAT', compressed);

  // IEND chunk (end of file)
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = require('zlib').crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function generateAllIcons() {
  console.log('🎨 Generating simple PWA icons...\n');

  // Indigo color: #4f46e5
  const r = 79;
  const g = 70;
  const b = 229;

  for (const size of sizes) {
    try {
      const png = createMinimalPNG(size, r, g, b);
      const filename = `icon-${size}x${size}.png`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, png);
      console.log(`✅ Generated: ${filename} (${(png.length / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  // Generate apple-touch-icon
  try {
    const png = createMinimalPNG(180, r, g, b);
    const filepath = path.join(__dirname, '../public/apple-touch-icon.png');
    fs.writeFileSync(filepath, png);
    console.log(`✅ Generated: apple-touch-icon.png (${(png.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Failed to generate apple-touch-icon:', error.message);
  }

  console.log('\n✨ All placeholder icons generated successfully!');
  console.log(`📁 Icons saved to: ${outputDir}`);
  console.log('\n⚠️  Note: These are solid color placeholders.');
  console.log('   For production, use proper icons with your logo.');
  console.log('\n📝 Next steps:');
  console.log('   1. Refresh your app: http://localhost:3000');
  console.log('   2. Check manifest: http://localhost:3000/manifest.json');
  console.log('   3. Test installation (look for install icon in address bar)');
}

generateAllIcons();
