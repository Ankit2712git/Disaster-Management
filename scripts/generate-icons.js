import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const svgPath = path.resolve('public', 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { name: 'pwa-192x192.png', size: 192, pad: 0 },
    { name: 'pwa-512x512.png', size: 512, pad: 0 },
    { name: 'apple-touch-icon.png', size: 180, pad: 0 },
    { name: 'pwa-maskable-512x512.png', size: 512, pad: 50 }, // 10-15% safe-zone margin for maskable icon
    { name: 'favicon-32x32.png', size: 32, pad: 0 },
  ];

  for (const target of targets) {
    const destPath = path.resolve('public', target.name);
    if (target.pad > 0) {
      const innerSize = target.size - target.pad * 2;
      const innerBuffer = await sharp(svgBuffer)
        .resize(innerSize, innerSize)
        .toBuffer();

      await sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: { r: 12, g: 10, b: 9, alpha: 1 }, // #0c0a09 background
        },
      })
        .composite([{ input: innerBuffer, gravity: 'center' }])
        .png()
        .toFile(destPath);
    } else {
      await sharp(svgBuffer)
        .resize(target.size, target.size)
        .png()
        .toFile(destPath);
    }
    console.log(`Generated: ${target.name}`);
  }
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
