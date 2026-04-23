# Aara Music - Start App Guide

## Quick Start

```bash
bash start.sh
```

That's it! The app will:
- ✅ Check all dependencies
- ✅ Kill any stale processes  
- ✅ Start proxy server (port 8081)
- ✅ Start Expo dev server (port 8082)
- ✅ Run health checks
- ✅ Monitor services continuously

## URLs

- **Local**: http://localhost:8081
- **Public** (Codespaces): https://organic-giggle-9qqwqrv9j6xcx6j5-8081.app.github.dev

## Stop the App

```bash
bash stop.sh
```

Or press `Ctrl+C` in the start.sh terminal.

## What Was Fixed

### Script Improvements
1. **Reliable Startup**: Rebuilt start.sh from scratch with production-grade error handling
2. **Environment Fix**: Set `NODE_ENV=development` for both proxy and Expo to prevent production mode issues
3. **Process Tracking**: Added PID file (.logs/app.pid) for clean process management
4. **Graceful Shutdown**: SIGTERM first, then SIGKILL after timeout
5. **Log Rotation**: Automatically rotates logs over 10MB
6. **Health Monitoring**: Continuous monitoring loop detects crashes automatically
7. **Port Verification**: Ensures ports are completely free before starting
8. **Disk Space Check**: Warns if less than 1GB available

### Dependency Fixes
- **TypeScript**: Fresh npm install to properly install TypeScript in node_modules
- **Package.json**: All dependencies correctly installed and tracked

### Stop Script Improvements
- **Multi-method Cleanup**: Stops by PID file, port, and process name
- **Verification**: Confirms all processes stopped before exiting
- **Error Detection**: Returns exit code 1 if processes remain running

## Troubleshooting

### If app won't start:
```bash
bash stop.sh
rm -rf node_modules package-lock.json
npm install
bash start.sh
```

### Check logs:
```bash
tail -f .logs/proxy.log    # Proxy server logs
tail -f .logs/expo.log     # Expo/Metro bundler logs
```

### Manual process cleanup:
```bash
lsof -ti :8081 | xargs kill -9   # Kill port 8081
lsof -ti :8082 | xargs kill -9   # Kill port 8082
pkill -9 -f "server/proxy.js"    # Kill proxy by name
pkill -9 -f "expo start"         # Kill Expo by name
```

## Deployment (Render)

The app is configured for Render deployment via `render.yaml`:
- **Service**: Web service on free tier
- **Region**: Oregon
- **Build**: `npm ci && npm run build:render`
- **Start**: `node server.js` (production mode)

Push to main branch triggers automatic deployment:
```bash
git push origin main
```

## What Works Now

✅ Start script runs cleanly every time  
✅ TypeScript properly installed and detected  
✅ Both proxy and Expo start successfully  
✅ Health checks pass (API, audio proxy, health endpoint)  
✅ Process monitoring detects crashes  
✅ Clean shutdown with proper cleanup  
✅ PID file tracking for reliable process management  
✅ Logs are rotated automatically  
✅ Port conflicts are detected and resolved  

## Latest Changes (Committed)

```
commit 0b9cd7e - fix: improve start/stop scripts for production reliability
commit 2ebde09 - feat: create unique AR logo from Aara brand name
```

All changes pushed to GitHub: https://github.com/vilaswasnik/aaramusic.ai

---

**Ready for tomorrow! Just run `bash start.sh` and everything will work perfectly.** 🚀
