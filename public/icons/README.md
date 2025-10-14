# PWA Icons

Generate PWA icons for WeddingFlow Pro app.

## Required Sizes

- 72x72 (icon-72x72.png)
- 96x96 (icon-96x96.png)
- 128x128 (icon-128x128.png)
- 144x144 (icon-144x144.png)
- 152x152 (icon-152x152.png)
- 192x192 (icon-192x192.png)
- 384x384 (icon-384x384.png)
- 512x512 (icon-512x512.png)

## Generation Methods

### Option 1: RealFaviconGenerator (Recommended)
1. Visit https://realfavicongenerator.net/
2. Upload your logo/icon (minimum 512x512 PNG)
3. Configure PWA settings:
   - Background color: #ffffff
   - Theme color: #4f46e5
4. Generate and download
5. Extract to this folder

### Option 2: Using ImageMagick (CLI)
```bash
# Install ImageMagick first
brew install imagemagick  # macOS
# or
apt-get install imagemagick  # Ubuntu

# Generate all sizes from a source 512x512 icon
convert source-icon.png -resize 72x72 icon-72x72.png
convert source-icon.png -resize 96x96 icon-96x96.png
convert source-icon.png -resize 128x128 icon-128x128.png
convert source-icon.png -resize 144x144 icon-144x144.png
convert source-icon.png -resize 152x152 icon-152x152.png
convert source-icon.png -resize 192x192 icon-192x192.png
convert source-icon.png -resize 384x384 icon-384x384.png
convert source-icon.png -resize 512x512 icon-512x512.png
```

### Option 3: PWA Asset Generator
```bash
npm install -g pwa-asset-generator
pwa-asset-generator source-icon.png ./public/icons
```

## Design Guidelines

- Use a simple, recognizable icon
- Ensure it works on both light and dark backgrounds
- Test on various device sizes
- Consider using maskable icons for better Android support
- Recommended: Use a square icon with padding (safe zone: 80% of icon size)

## Current Status

⚠️ **Icons not yet generated** - Please generate icons using one of the methods above.

Temporary placeholders can be created by copying the Next.js default icon or creating simple colored squares for testing.
