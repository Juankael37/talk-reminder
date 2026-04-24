const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  <text x="256" y="360" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="280" font-weight="bold">M</text>
</svg>`;

const mipmaps = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
  
  for (const [folder, size] of Object.entries(mipmaps)) {
    const folderPath = path.join(resDir, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_foreground.png'));
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(folderPath, 'ic_launcher.png'));
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_round.png'));
    
    console.log(`Generated ${size}x${size} icons for ${folder}`);
  }
  
  const splashDir = path.join(resDir, 'drawable');
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(splashDir, 'splash.png'));
  
  console.log('Generated splash.png');
}

generateIcons().catch(console.error);