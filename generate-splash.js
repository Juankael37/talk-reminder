const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

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
  const sourceImage = path.join(__dirname, 'public', 'mobile_logo.png');
  
  for (const [folder, width] of splashSizes) {
    const folderPath = path.join(resDir, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    await sharp(sourceImage)
      .resize(width, Math.round(width * 720 / 1280), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(folderPath, 'splash.png'));
    
    console.log(`Generated splash for ${folder} (${width}x${Math.round(width * 720 / 1280)})`);
  }
}

generateSplash().catch(console.error);