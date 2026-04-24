const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#bgGrad)"/>
  <path d="M256 170C256 170 210 170 210 215V265C210 280 200 295 185 300L175 305C165 310 160 320 160 330C160 342 170 352 182 352H330C342 352 352 342 352 330C352 320 347 310 337 305L327 300C312 295 302 280 302 265V215C302 170 256 170 256 170Z" fill="white"/>
  <circle cx="256" cy="260" r="12" fill="#6366F1"/>
  <ellipse cx="256" cy="370" rx="28" ry="15" fill="white"/>
</svg>`;

const sizes = [72, 96, 144, 192, 512];
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
  
  // Splash screen
  const splashDir = path.join(resDir, 'drawable');
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(splashDir, 'splash.png'));
  
  console.log('Generated splash.png');
}

generateIcons().catch(console.error);