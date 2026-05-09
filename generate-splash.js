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
  const sourceImage = path.join(__dirname, 'public', 'Ortuma Official logo.png');
  
  for (const [folder, width] of splashSizes) {
    const folderPath = path.join(resDir, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    // The Ortuma logo has a dark background (#141122 approx). Let's use a similar dark hex or black, but sharp fit: contain with background will handle the aspect ratio padding.
    await sharp(sourceImage)
      .resize(width, Math.round(width * 720 / 1280), { fit: 'contain', background: { r: 20, g: 17, b: 34, alpha: 1 } })
      .png()
      .toFile(path.join(folderPath, 'splash.png'));
    
    console.log(`Generated splash for ${folder} (${width}x${Math.round(width * 720 / 1280)})`);
  }
}

generateSplash().catch(console.error);