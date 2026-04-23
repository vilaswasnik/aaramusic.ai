# Aara Music - Configuration Guide

## Problem Solved

Previously, the app would show a **white page** on every codespace restart because production settings (like `baseUrl: "/aaramusic.ai"`) were breaking local development.

## Solution

The app now uses **environment-aware configuration** that automatically applies the right settings for each environment.

### 📁 Key Files

#### `app.config.js` (Dynamic config)
Detects the environment and applies appropriate settings:
- **Development**: No `baseUrl`, clean URLs, works immediately
- **GitHub Pages**: Adds `baseUrl: "/aaramusic.ai"` for subfolder deployment
- **Render**: No `baseUrl` (hosted at root domain)

#### `app.json`
Contains the base configuration without environment-specific overrides.

#### `package.json`
Updated scripts:
- `build:web` - Production build **for GitHub Pages** (with baseUrl)
- `build:render` - Production build **for Render** (no baseUrl)
- `build:web:dev` - Development build without any production settings

## 🔧 How It Works

### Development Mode (Default)
```bash
npm run web          # Starts dev server (no baseUrl)
bash start.sh        # Same as above
```
Configuration used: Clean Expo defaults, no baseUrl

### Production Builds

#### For GitHub Pages
```bash
npm run build:web    # Sets GITHUB_PAGES=true
```
Configuration used: Adds `experiments.baseUrl: "/aaramusic.ai"`

#### For Render
```bash
npm run build:render # Sets NODE_ENV=production only
```
Configuration used: No baseUrl (Render hosts at root)

## 🚀 Deployment

### GitHub Pages
The `.github/workflows/deploy.yml` automatically:
1. Sets `NODE_ENV=production` and `GITHUB_PAGES=true`
2. Runs `npm run build:web`  
3. Exports to `dist/` with correct baseUrl
4. Deploys to GitHub Pages at `/aaramusic.ai` subfolder

### Render
The `render.yaml` configuration:
1. Runs `npm run build:render` (no baseUrl)
2. Builds to `dist/` for root domain hosting
3. Starts Express proxy server with `node server.js`
4. Serves the built app at the root URL

## ✅ Why This Fixes The Issues

**Before:**
- Production settings committed to `app.json`
- Every codespace restart pulled broken config
- Manual fix required daily
- Same config used for both GitHub Pages and Render (wrong!)

**After:**
- Development settings are default in `app.json`
- Production settings only applied during builds via `app.config.js`
- Separate build commands for GitHub Pages vs Render
- Codespace always starts with working config
- No more daily fixes needed!

## 🧪 Testing

Test dev config:
```bash
node -e "const config = require('./app.config.js'); console.log(config({}));"
```

Test Render production config (should have NO baseUrl):
```bash
NODE_ENV=production node -e "const config = require('./app.config.js'); console.log(config({}));"
```

Test GitHub Pages config (should have baseUrl):
```bash
GITHUB_PAGES=true NODE_ENV=production node -e "const config = require('./app.config.js'); console.log(config({}));"
```

## 📝 Maintenance

If you need to add more environment-specific settings:
1. Add them to `app.json` as dev defaults
2. Override them in `app.config.js` for specific environments
3. Keep development experience smooth

## 🔗 Related Files
- [app.config.js](app.config.js) - Dynamic configuration
- [app.json](app.json) - Base configuration  
- [package.json](package.json) - Build scripts
- [render.yaml](render.yaml) - Render deployment config
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) - GitHub Pages CI/CD
