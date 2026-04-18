# Quick Start Commands

## 🚀 Start Development

```bash
# Start the development server
npm start

# Start on iOS simulator (macOS only)
npm run ios

# Start on Android emulator
npm run android

# Start in web browser
npm run web

# Start with cache cleared
npx expo start -c
```

## 📱 Test on Device

```bash
# Start and automatically open on connected device
npm start -- --android  # For Android
npm start -- --ios      # For iOS

# Use tunnel for remote testing
npm start -- --tunnel
```

## 🔧 Development Tools

```bash
# Check for errors
npx tsc --noEmit

# Format code (if you install prettier)
npx prettier --write .

# Install additional dependencies
npm install <package-name>

# Update all dependencies
npm update
```

## 🏗️ Building

```bash
# Install EAS CLI (one time)
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android (APK)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production
```

## 📤 Submitting to Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
```

## 🐛 Troubleshooting

```bash
# Clear cache and restart
npx expo start -c

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Expo doctor for issues
npx expo-doctor

# View logs
npx expo start --android --dev-client
```

## 📊 Useful Commands

```bash
# Check installed Expo version
npx expo --version

# Upgrade Expo SDK
npx expo upgrade

# Install Expo dependencies
npx expo install

# Eject from Expo (advanced)
npx expo prebuild
```

## 🎨 Customization

```bash
# Change app icon/splash
# 1. Replace files in assets/ folder
# 2. Run: npx expo prebuild --clean

# Update app name
# Edit app.json -> expo.name
```

## 📝 Git Commands

```bash
# Initial commit
git add .
git commit -m "Initial commit - Aara Music app"
git push origin main

# Create development branch
git checkout -b develop

# Push changes
git add .
git commit -m "Your commit message"
git push
```

---

## 🎯 Most Common Workflows

### Starting Development
```bash
cd /path/to/aaramusic.ai
npm start
# Scan QR code with Expo Go app
```

### Making Changes
```bash
# 1. Edit files in src/
# 2. Save - hot reload will update app automatically
# 3. If it doesn't update, press 'r' in terminal to reload
```

### Building for Production
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Deploying Updates
```bash
# For already published apps, use OTA updates
eas update --branch production
```

---

**Pro Tips:**
- Keep terminal open while developing
- Use 'r' to reload, 'd' to open dev menu
- Test on real devices frequently
- Keep dependencies updated
- Commit changes regularly
