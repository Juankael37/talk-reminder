const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const mipmaps = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
  const sourceImage = path.join(__dirname, 'public', 'Official_logo.png');
  
  for (const [folder, size] of Object.entries(mipmaps)) {
    const folderPath = path.join(resDir, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    // Resize image maintaining aspect ratio and fitting inside the bounds
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_foreground.png'));
    
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher.png'));
    
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_round.png'));
    
    console.log(`Generated ${size}x${size} icons for ${folder}`);
  }
  
  const splashDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });
  await sharp(sourceImage)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(splashDir, 'splash.png'));
  
  console.log('Generated splash.png');
}

generateIcons().catch(console.error);