const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svg = `<svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1280" y2="720" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bgGrad)"/>
  <path d="M640 270C640 270 530 270 530 345V435C530 470 500 505 455 520L425 535C395 550 380 580 380 610C380 650 420 680 470 680H810C860 680 900 650 900 610C900 580 885 550 855 535L825 520C780 505 750 470 750 435V345C750 270 640 270 640 270Z" fill="white"/>
  <circle cx="640" cy="430" r="30" fill="#6366F1"/>
  <ellipse cx="640" cy="580" rx="70" ry="38" fill="white"/>
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