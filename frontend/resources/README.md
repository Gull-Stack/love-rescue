# App Assets

Place the following files in this directory:

## Required
- **icon.png** — 1024×1024px, app icon (heart + "Love Rescue" branding, pink/red gradient)
- **splash.png** — 2732×2732px, splash screen (centered logo on gradient background)

## Generation
After placing the source images, generate all sizes:
```bash
# Install the asset generator
npm install -g @capacitor/assets

# Generate from source images
npx capacitor-assets generate --ios
```

This will create all required iOS icon sizes and splash screen variants.
