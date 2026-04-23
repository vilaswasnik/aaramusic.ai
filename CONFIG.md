# Aara Music - Configuration Guide

## Problem Solved

Previously, the app would show a **white page** on every codespace restart because production settings (like `baseUrl: "/aaramusic.ai"`) were breaking local development.

## Solution

The app now uses **environment-aware configuration** that automatically applies the right settings for each environment.

### 📁 Key Files

#### `app.config.js` (NEW)
Dynamic configuration that detects the environment and applies appropriate settings:
- **Development**: No `baseUrl`, clean URLs, works immediately
- **Production**: Adds `baseUrl` for GitHub Pages subfolder deployment

#### `app.json`
Contains the base configuration without environment-specific overrides.

#### `package.json`
Updated scripts:
- `build:web` - Production build with GitHub Pages settings
- `build:web:dev` - Development build without baseUrl

## 🔧 How It Works

### Development Mode (Default)
```bash
npm run web          # Starts dev server (no baseUrl)
bash start.sh        # Same as above
```
Configuration used: Clean Expo defaults, no baseUrl

### Production Build
```bash
npm run build:web    # Builds for GitHub Pages (with baseUrl)
```
Configuration used: Adds `experiments.baseUrl: "/aaramusic.ai"`

## 🚀 Deployment

### GitHub Pages
The `.github/workflows/deploy.yml` automatically:
1. Sets `NODE_ENV=production` and `GITHUB_PAGES=true`
2. Runs `npm run build:web`  
3. Exports to `dist/` with correct baseUrl
4. Deploys to GitHub Pages

### Render (Backend)
The `server.js` and `Procfile` handle the Express proxy server.
No changes needed - continues working as before.

## ✅ Why This Fixes The Daily Issue

**Before:**
- Production settings committed to `app.json`
- Every codespace restart pulled broken config
- Manual fix required daily

**After:**
- Development settings are default in `app.json`
- Production settings only applied during builds via `app.config.js`
- Codespace always starts with working config
- No more daily fixes needed!

## 🧪 Testing

Test dev config:
```bash
node -e "const config = require('./app.config.js'); console.log(config({}));"
```

Test production config:
```bash
GITHUB_PAGES=true NODE_ENV=production node -e "const config = require('./app.config.js'); console.log(config({}));"
```

## 📝 Maintenance

If you need to add more environment-specific settings:
1. Add them to `app.json` as dev defaults
2. Override them in `app.config.js` for production builds
3. Keep development experience smooth

## 🔗 Related Files
- [app.config.js](app.config.js) - Dynamic configuration
- [app.json](app.json) - Base configuration  
- [package.json](package.json) - Build scripts
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) - CI/CD pipeline
