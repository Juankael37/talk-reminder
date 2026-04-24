const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svg = `<svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1280" y2="720" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bgGrad)"/>
  <text x="640" y="420" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="320" font-weight="bold">M</text>
  <text x="640" y="540" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="64" font-weight="500">Mate Reminder</text>
</svg>`;

const splashSizes = [
  ['drawable-land-hdpi', 800],
  ['drawable-land-mdpi', 480],
  ['drawable-land-xhdpi', 1280],
  ['drawable-land-xxhdpi', 1600],
  ['drawable-land-xxxhdpi', 1920],
  ['drawable-port-hdpi', 480],
  ['drawable-port-mdpi', 320],
  ['drawable-port-xhdpi', 720],
  ['drawable-port-xxhdpi', 960],
  ['drawable-port-xxxhdpi', 1280]
];

async function generateSplash() {
  const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
  
  for (const [folder, width] of splashSizes) {
    const folderPath = path.join(resDir, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    await sharp(Buffer.from(svg))
      .resize(width, Math.round(width * 720 / 1280))
      .png()
      .toFile(path.join(folderPath, 'splash.png'));
    
    console.log(`Generated splash for ${folder} (${width}x${Math.round(width * 720 / 1280)})`);
  }
}

generateSplash().catch(console.error);