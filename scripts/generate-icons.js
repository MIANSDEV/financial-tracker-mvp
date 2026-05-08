/**
 * Generates placeholder PWA icons as colored SVGs converted to PNG-like files.
 * For production, replace with actual icon files or use a service like https://realfavicongenerator.net
 *
 * Usage: node scripts/generate-icons.js
 * Requires: npm install canvas (optional - this script creates SVG placeholders)
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0ea5e9"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, sans-serif" font-weight="bold"
        font-size="${size * 0.35}" fill="white">FT</text>
</svg>`;

sizes.forEach((size) => {
  const svgContent = svgTemplate(size);
  const filename = `icon-${size}x${size}.png`;
  // Write SVG as placeholder (rename to .png for basic compatibility)
  fs.writeFileSync(path.join(iconsDir, filename), svgContent);
  console.log(`✓ Created ${filename}`);
});

// Badge icon
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <rect width="72" height="72" rx="14" fill="#0ea5e9"/>
  <circle cx="36" cy="36" r="20" fill="white"/>
  <circle cx="36" cy="36" r="8" fill="#0ea5e9"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'badge-72x72.png'), badgeSvg);
console.log('✓ Created badge-72x72.png');

// Apple touch icon
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), svgTemplate(180));
console.log('✓ Created apple-touch-icon.png');

console.log('\n✅ Icons generated in public/icons/');
console.log('   For production: replace with proper PNG icons');
