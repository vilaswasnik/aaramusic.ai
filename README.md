# Aara Music

A full-featured music streaming web app built with **React Native (Expo)** and powered by the **Deezer API**. Stream real songs, browse curated playlists across Bollywood, Hollywood, and South Indian genres, mix tracks, sing karaoke, and get AI-powered song recommendations — all in one app.

Live at: [GitHub Pages](https://vilaswasnik.github.io/aaramusic.ai) &nbsp;|&nbsp; Production: [Render](https://aaramusic.onrender.com)

---

## Features

| Screen | Description |
|---|---|
| **Home** | Trending chart tracks with real 30-second previews |
| **Bollywood** | Curated Hindi music playlists from Deezer |
| **Hollywood** | Top English pop, rock, and charts |
| **South Indian** | Tamil, Telugu, Kannada, and Malayalam playlists |
| **Search** | Live search across all artists, albums, and tracks |
| **DJ Mixer** | Load two decks and crossfade between tracks |
| **Karaoke** | Lyrics synced to playback via lyrics.ovh |
| **AI** | AI-powered song recommendations |
| **Library** | Favourites, recently played, and custom queues |
| **Player** | Full-screen player with queue, shuffle, repeat |

**Audio**: 30-second Deezer preview streams piped through a local proxy — no CORS issues, works in browser.  
**Fallback**: If the Deezer API is unreachable, the app falls back to built-in mock songs automatically with a retry banner.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Run locally

```bash
git clone https://github.com/vilaswasnik/aaramusic.ai.git
cd aaramusic.ai
npm install
npm run web
```

Open **http://localhost:8081** in your browser.  
The `npm run web` command runs `start.sh` which handles everything automatically:

1. Pre-flight checks (Node, deps, server file)
2. Cleans up stale processes on ports 8081 / 8082
3. Starts the proxy server on **port 8081** (API + audio + Expo forwarding)
4. Makes port 8081 public (GitHub Codespaces only)
5. Starts the Expo Metro dev server on **port 8082** (internal)
6. Self-tests the songs API and audio proxy
7. Prints the URL and keeps running

**Ctrl+C** stops all services cleanly. Logs are written to `.logs/proxy.log` and `.logs/expo.log`.

### Stop

```bash
bash stop.sh
```

---

## Test on Mobile (no App Store needed)

You can test the app on any phone or tablet right now using your browser — no install required.

### Step 1 — Get the public URL

If running in **GitHub Codespaces**, the app is already publicly accessible:

```
https://<your-codespace-name>-8081.app.github.dev
```

Find your URL by running:
```bash
echo "https://${CODESPACE_NAME}-8081.app.github.dev"
```

Or generate a QR code to scan with your phone:
```bash
npx qrcode-terminal "https://${CODESPACE_NAME}-8081.app.github.dev"
```

### Step 2 — Open in mobile browser

Open the URL in **Safari** (iPhone) or **Chrome** (Android). The app is fully responsive and touch-friendly.

### Step 3 — Add to Home Screen (optional, feels native)

**iPhone (Safari):**
1. Tap the **Share** button (box with arrow at the bottom)
2. Tap **Add to Home Screen**
3. Tap **Add**

**Android (Chrome):**
1. Tap the **⋮ menu** (top right)
2. Tap **Add to Home screen**
3. Tap **Add**

The app opens full-screen with no browser chrome — identical to a native app install, no App Store required.

> The Codespaces URL stays live as long as your Codespace is running. After a restart, run `npm run web` again — the URL remains the same.

---

## Architecture

```
Browser
  └─► http://localhost:8081
        │
        ├── /health          →  Proxy status
        ├── /api/*           →  Deezer REST API  (api.deezer.com)
        ├── /audio?url=...   →  Deezer CDN mp3 stream (piped, supports Range)
        ├── /lyrics/:a/:t    →  lyrics.ovh
        └── /*               →  Expo Metro dev server (localhost:8082)
```

All traffic goes through **one port (8081)** — no cross-origin issues in browsers or Codespaces.

### Production (Render)

```
Browser → Render (PORT env) → Express
  ├── /api/*      →  Deezer API
  ├── /audio      →  Deezer CDN stream
  ├── /lyrics     →  lyrics.ovh
  └── /*          →  Expo static web export (dist/)
```

---

## Project Structure

```
aaramusic.ai/
├── App.tsx                         # Root — loads fonts, renders AppNavigator
├── app.json                        # Expo config
├── start.sh                        # Dev start script (all-in-one)
├── stop.sh                         # Stop all services
├── render.yaml                     # Render deployment config
│
├── server/
│   └── proxy.js                    # Express server: API proxy + audio stream + Expo forward
│
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── BollywoodScreen.tsx
│   │   ├── HollywoodScreen.tsx
│   │   ├── SouthIndianScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── DJMixerScreen.tsx
│   │   ├── KaraokeScreen.tsx
│   │   ├── KaraokePlayerScreen.tsx
│   │   └── AIScreen.tsx
│   │
│   ├── context/
│   │   └── MusicPlayerContext.tsx  # Audio engine (HTML5 on web, expo-av on native)
│   │
│   ├── services/
│   │   ├── musicService.ts         # Deezer API calls + proxyAudioUrl()
│   │   ├── lyricsService.ts        # lyrics.ovh integration
│   │   ├── aiService.ts            # AI recommendation logic
│   │   └── voiceService.ts         # Voice search
│   │
│   ├── components/
│   │   ├── MiniPlayer.tsx          # Persistent bottom mini-player
│   │   ├── SongCard.tsx
│   │   ├── SongListItem.tsx
│   │   ├── ApiFallbackBanner.tsx   # Warning when fallback data is used
│   │   ├── EqualizerBars.tsx
│   │   ├── AnimatedPressable.tsx
│   │   ├── FadeInView.tsx
│   │   └── SkeletonLoader.tsx
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Bottom tab + stack navigation
│   │
│   ├── config/
│   │   └── firebase.ts
│   ├── constants/
│   │   └── theme.ts                # Colours, spacing, typography
│   ├── data/
│   │   └── mockData.ts             # Fallback songs
│   └── types/
│       └── index.ts
│
├── worker/                         # Cloudflare Worker (experimental)
│   ├── index.js
│   └── wrangler.toml
│
└── .github/
    └── workflows/
        └── deploy.yml              # CI: build → GitHub Pages + Cloudflare Worker
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run web` | Start everything for development (proxy + Expo) |
| `npm run web:expo` | Start Expo only (no proxy) |
| `npm run build:web` | Export static Expo web build to `dist/` |
| `npm run serve` | Start production server (serves `dist/` + proxy) |
| `npm start` | Expo start (mobile) |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator (macOS only) |
| `bash stop.sh` | Stop all dev services |

---

## Deployment

### Render (recommended — full proxy support)

1. Connect the GitHub repo to [Render](https://render.com)
2. Render uses `render.yaml`:
   - **Build**: `npm ci && npx expo export --platform web`
   - **Start**: `npm run serve` (production proxy + static files)
3. Set `NODE_ENV=production` (already in `render.yaml`)

### GitHub Actions (automatic on push to `main`)

The workflow in `.github/workflows/deploy.yml`:
- Builds the Expo web export
- Deploys the static build to **GitHub Pages**
- Deploys the Cloudflare Worker (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets)

> Note: GitHub Pages hosts the static build only. The audio proxy and Deezer API require the Node.js server — use Render for full functionality.

---

## Environment & Secrets

| Secret | Where | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub repo secrets | Cloudflare Worker deployment |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub repo secrets | Cloudflare Worker deployment |

No API keys are needed for Deezer — the public API is used directly via the proxy.

---

## License

App URL: https://organic-giggle-9qqwqrv9j6xcx6j5-8082.app.github.dev

Start: bash start.sh
Stop: bash stop.sh