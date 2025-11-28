# PWA Icon Generation Instructions

Since we cannot generate PNG files directly in this environment, please follow these steps:

## Quick Steps:

1. **Go to https://favicon.io/favicon-converter/**
2. **Upload** the `public/icon.svg` file (or create your own icon/logo)
3. **Download** the generated icons
4. **Extract and copy** these two files to the `public/` folder:
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)

## Alternative: Manual Creation

If you have an image editor (Photoshop, GIMP, Figma, etc.):
1. Create a 512x512 pixel image with your app logo/icon
2. Use a rounded square background (128px radius) with color `#6366f1` (indigo)
3. Add a white lightning/zap icon in the center
4. Export as:
   - `icon-512.png` (512x512)
   - `icon-192.png` (192x192 - resized version)
5. Place both files in the `public/` folder

## Temporary Solution:

For testing, you can use any 192x192 and 512x512 PNG images temporarily.
Just rename them to `icon-192.png` and `icon-512.png` and place in `public/`.

After adding the icons, restart your dev server or rebuild the app.
