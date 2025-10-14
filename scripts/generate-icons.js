#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates PWA icons using Canvas
 * Run: node scripts/generate-icons.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4f46e5');  // Indigo
  gradient.addColorStop(1, '#7c3aed');  // Purple
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw icon - Wedding rings
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = size * 0.04;

  const centerX = size / 2;
  const centerY = size / 2;
  const ringRadius = size * 0.15;
  const offset = size * 0.1;

  // Left ring
  ctx.beginPath();
  ctx.arc(centerX - offset, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Right ring
  ctx.beginPath();
  ctx.arc(centerX + offset, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Intersection highlight
  ctx.beginPath();
  ctx.arc(centerX, centerY - ringRadius * 0.6, size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Add "W" letter
  ctx.font = `bold ${size * 0.35}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', centerX, centerY + ringRadius * 1.8);

  return canvas;
}

async function generateAllIcons() {
  console.log('🎨 Generating PWA icons...\n');

  for (const size of sizes) {
    try {
      const canvas = generateIcon(size);
      const buffer = canvas.toBuffer('image/png');
      const filename = `icon-${size}x${size}.png`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, buffer);
      console.log(`✅ Generated: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  // Generate favicon
  try {
    const canvas = generateIcon(32);
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(__dirname, '../public/favicon.ico');
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Generated: favicon.ico (${(buffer.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error.message);
  }

  // Generate apple-touch-icon
  try {
    const canvas = generateIcon(180);
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(__dirname, '../public/apple-touch-icon.png');
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Generated: apple-touch-icon.png (${(buffer.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Failed to generate apple-touch-icon:', error.message);
  }

  console.log('\n✨ All icons generated successfully!');
  console.log(`📁 Icons saved to: ${outputDir}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Refresh your app');
  console.log('   2. Check DevTools → Application → Manifest');
  console.log('   3. Test PWA installation');
}

// Check if canvas is available
try {
  require('canvas');
  generateAllIcons().catch(console.error);
} catch (error) {
  console.error('❌ Canvas module not found. Installing...\n');
  console.log('Please run: npm install canvas --save-dev');
  console.log('\nOr use the simpler image-based approach instead.');
  process.exit(1);
}
