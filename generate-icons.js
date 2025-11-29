// Generate PNG icons from SVG using sharp
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, 'public', 'icon.svg');
const sizes = [192, 512];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'public', `icon-${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated: ${outputPath}`);
    } catch (error) {
      console.error(`✗ Error generating ${size}x${size}:`, error.message);
    }
  }
  
  console.log('\nDone! PNG icons created.');
}

generateIcons();
