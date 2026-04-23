#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Aara Music — start everything with one command
#
#  What this does:
#    1. Pre-flight checks  (node, npm deps, proxy file, disk space)
#    2. Kill stale processes on ports 8081 / 8082
#    3. Start proxy  →  port 8081 (API + audio streaming + Expo forward)
#    4. Make port 8081 public  (Codespaces only)
#    5. Start Expo dev server  →  port 8082 (internal)
#    6. Self-test: verify songs API & audio proxy are responding
#    7. Print the URL and keep running; Ctrl+C stops everything cleanly
#
#  Usage:
#    bash start.sh     OR     npm run web
# ════════════════════════════════════════════════════════════════

set -euo pipefail

# Change to script directory to ensure relative paths work
cd "$(dirname "$0")"

APP_PORT=8082
EXPO_PORT=8083
LOG_DIR=".logs"
PROXY_LOG="$LOG_DIR/proxy.log"
EXPO_LOG="$LOG_DIR/expo.log"
PID_FILE="$LOG_DIR/app.pid"
MAX_LOG_SIZE=10485760  # 10MB

# ── Colours ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓${RESET} $*"; }
warn() { echo -e "${YELLOW}  ⚠${RESET} $*"; }
err()  { echo -e "${RED}  ✗${RESET} $*"; }
info() { echo -e "${CYAN}  →${RESET} $*"; }

# ── Cleanup on exit ───────────────────────────────────────────
PROXY_PID=""
EXPO_PID=""
CLEANUP_DONE=0

cleanup() {
  # Prevent double execution
  [[ $CLEANUP_DONE -eq 1 ]] && return
  CLEANUP_DONE=1
  
  echo ""
  info "Shutting down Aara Music..."
  
  # Graceful shutdown first (SIGTERM)
  [[ -n "$PROXY_PID" ]] && kill -TERM "$PROXY_PID" 2>/dev/null || true
  [[ -n "$EXPO_PID"  ]] && kill -TERM "$EXPO_PID"  2>/dev/null || true
  
  # Give processes time to exit gracefully
  sleep 1
  
  # Force kill if still running
  [[ -n "$PROXY_PID" ]] && kill -9 "$PROXY_PID" 2>/dev/null || true
  [[ -n "$EXPO_PID"  ]] && kill -9 "$EXPO_PID"  2>/dev/null || true
  
  # Hard-kill anything still on the ports
  lsof -ti :"$APP_PORT"  2>/dev/null | xargs -r kill -9 2>/dev/null || true
  lsof -ti :"$EXPO_PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  
  # Clean up PID file
  rm -f "$PID_FILE"
  
  ok "All services stopped."
}
trap cleanup SIGINT SIGTERM EXIT

# ════════════════════════════════════════════════════════════════
#  1. PRE-FLIGHT CHECKS
# ════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}Aara Music — Pre-flight checks${RESET}"
echo    "──────────────────────────────"

# Node.js
if ! command -v node &>/dev/null; then
  err "node not found. Install Node.js 18+ and try again."
  exit 1
fi
NODE_VER=$(node -v)
ok "Node.js $NODE_VER"

# npm dependencies
if [[ ! -d "node_modules" ]]; then
  warn "node_modules not found — running npm install..."
  npm install --silent || { err "npm install failed"; exit 1; }
  ok "Dependencies installed."
else
  ok "node_modules present"
fi

# Check for package.json updates (if package.json is newer than node_modules)
if [[ -f "package.json" && "package.json" -nt "node_modules" ]]; then
  warn "package.json updated — running npm install..."
  npm install --silent || { err "npm install failed"; exit 1; }
  ok "Dependencies updated."
fi

# Required server file
if [[ ! -f "server/proxy.js" ]]; then
  err "server/proxy.js not found. Are you in the project root?"
  exit 1
fi
ok "server/proxy.js found"

# Check disk space
DISK_AVAIL=$(df . | tail -1 | awk '{print $4}')
if [[ "$DISK_AVAIL" -lt 1000000 ]]; then  # Less than ~1GB
  warn "Low disk space: $(df -h . | tail -1 | awk '{print $4}') available"
fi

# Create log directory and rotate old logs
mkdir -p "$LOG_DIR"
if [[ -f "$PROXY_LOG" ]]; then
  LOG_SIZE=$(stat -c%s "$PROXY_LOG" 2>/dev/null || stat -f%z "$PROXY_LOG" 2>/dev/null || echo 0)
  [[ "$LOG_SIZE" -gt "$MAX_LOG_SIZE" ]] && mv "$PROXY_LOG" "$PROXY_LOG.old"
fi
if [[ -f "$EXPO_LOG" ]]; then
  LOG_SIZE=$(stat -c%s "$EXPO_LOG" 2>/dev/null || stat -f%z "$EXPO_LOG" 2>/dev/null || echo 0)
  [[ "$LOG_SIZE" -gt "$MAX_LOG_SIZE" ]] && mv "$EXPO_LOG" "$EXPO_LOG.old"
fi

# ════════════════════════════════════════════════════════════════
#  2. KILL STALE PROCESSES
# ════════════════════════════════════════════════════════════════
echo ""
info "Clearing ports $APP_PORT and $EXPO_PORT..."

# Kill by PID file first (cleaner)
if [[ -f "$PID_FILE" ]]; then
  while IFS= read -r pid; do
    if [[ -n "$pid" ]]; then
      kill -9 "$pid" 2>/dev/null && warn "Killed stale process $pid from PID file" || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Kill by port
lsof -ti :"$APP_PORT"  2>/dev/null | xargs -r kill -9 2>/dev/null && warn "Killed stale process on $APP_PORT" || true
lsof -ti :"$EXPO_PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null && warn "Killed stale process on $EXPO_PORT" || true

# Kill by process name as backup
pkill -9 -f "server/proxy.js" 2>/dev/null && warn "Killed stale proxy.js processes" || true
pkill -9 -f "expo start" 2>/dev/null && warn "Killed stale expo processes" || true

# Wait for ports to be fully released
sleep 1

# Verify ports are free
if lsof -ti :"$APP_PORT" >/dev/null 2>&1; then
  err "Port $APP_PORT still in use after cleanup"
  lsof -i :"$APP_PORT"
  exit 1
fi
if lsof -ti :"$EXPO_PORT" >/dev/null 2>&1; then
  err "Port $EXPO_PORT still in use after cleanup"
  lsof -i :"$EXPO_PORT"
  exit 1
fi
ok "Ports cleared"

# ════════════════════════════════════════════════════════════════
#  3. START PROXY SERVER
# ════════════════════════════════════════════════════════════════
echo ""
info "Starting proxy server on port $APP_PORT..."
: > "$PROXY_LOG"  # Clear log file
NODE_ENV=development PORT=$APP_PORT node server/proxy.js >> "$PROXY_LOG" 2>&1 &
PROXY_PID=$!
echo "$PROXY_PID" > "$PID_FILE"
ok "Proxy started (PID: $PROXY_PID)"

# Wait up to 12 seconds for proxy to become ready
READY=0
for i in $(seq 1 24); do
  if curl -sf "http://localhost:$APP_PORT/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  # Check proxy didn't crash
  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    err "Proxy server crashed. Last log:"
    tail -20 "$PROXY_LOG"
    exit 1
  fi
  sleep 0.5
done

if [[ $READY -eq 0 ]]; then
  err "Proxy server did not become ready in time. Last log:"
  tail -20 "$PROXY_LOG"
  exit 1
fi
ok "Proxy server ready on port $APP_PORT"



# ════════════════════════════════════════════════════════════════
#  4. VERIFY PORT IS PUBLIC (Codespaces only)
# ════════════════════════════════════════════════════════════════
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  FORWARDING_DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  PUBLIC_URL="https://${CODESPACE_NAME}-${APP_PORT}.${FORWARDING_DOMAIN}"
  # devcontainer.json sets visibility:public automatically — just verify
  HTTP_CHECK=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "$PUBLIC_URL/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_CHECK" == "200" ]]; then
    ok "Port $APP_PORT is public and verified ✓"
  else
    warn "Port $APP_PORT may not be public (HTTP $HTTP_CHECK)."
    warn "Open VS Code Ports tab → right-click port $APP_PORT → Port Visibility → Public"
  fi
fi

# ════════════════════════════════════════════════════════════════
#  5. START EXPO DEV SERVER
# ════════════════════════════════════════════════════════════════
echo ""
info "Starting Expo dev server on internal port $EXPO_PORT..."
: > "$EXPO_LOG"  # Clear log file  
NODE_ENV=development npx expo start --web --port "$EXPO_PORT" >> "$EXPO_LOG" 2>&1 &
EXPO_PID=$!
echo "$EXPO_PID" >> "$PID_FILE"
ok "Expo started (PID: $EXPO_PID)"

# Wait up to 30 seconds for Expo to be ready (Metro bundler needs time)
EXPO_READY=0
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$EXPO_PORT" >/dev/null 2>&1; then
    EXPO_READY=1
    break
  fi
  # Check Expo didn't crash
  if ! kill -0 "$EXPO_PID" 2>/dev/null; then
    err "Expo dev server crashed. Last log:"
    tail -20 "$EXPO_LOG"
    exit 1
  fi
  sleep 0.5
done

if [[ $EXPO_READY -eq 0 ]]; then
  warn "Expo is taking longer than expected — it may still be bundling."
  warn "The app will load once Metro finishes compiling (check .logs/expo.log)."
else
  ok "Expo dev server ready on port $EXPO_PORT"
fi

# ════════════════════════════════════════════════════════════════
#  6. SELF-TEST: verify songs API + audio proxy
# ════════════════════════════════════════════════════════════════
echo ""
info "Running self-tests..."

# Test health endpoint
HEALTH=$(curl -sf "http://localhost:$APP_PORT/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok"'; then
  ok "Health endpoint OK"
else
  warn "Health endpoint not responding"
fi

# Test top songs (main chart — same endpoint the app uses)
API_RESP=$(curl -sf "http://localhost:$APP_PORT/api/chart/0/tracks?limit=3" 2>/dev/null || echo "")
if echo "$API_RESP" | grep -q '"preview"'; then
  TRACK_COUNT=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(String(d.data?.length||0))}catch{process.stdout.write('0')}" 2>/dev/null || echo "0")
  TRACK_TITLE=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.data[0]?.title||'?')}catch{process.stdout.write('?')}" 2>/dev/null || echo "?")
  ARTIST_NAME=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.data[0]?.artist?.name||'?')}catch{process.stdout.write('?')}" 2>/dev/null || echo "?")
  ok "Top songs API working  ($TRACK_COUNT tracks - \"$TRACK_TITLE\" by $ARTIST_NAME)"
else
  warn "Top songs API did not return data — app will show fallback songs."
fi

# Test the actual playlist IDs used by the app for each genre
BOLLYWOOD_RESP=$(curl -sf "http://localhost:$APP_PORT/api/playlist/5714603022/tracks?limit=1" 2>/dev/null || echo "")
HOLLYWOOD_RESP=$(curl -sf "http://localhost:$APP_PORT/api/playlist/6707920184/tracks?limit=1" 2>/dev/null || echo "")
SOUTHINDIAN_RESP=$(curl -sf "http://localhost:$APP_PORT/api/playlist/13523718423/tracks?limit=1" 2>/dev/null || echo "")

GENRE_OK=0
echo "$BOLLYWOOD_RESP" | grep -q '"preview"' && GENRE_OK=$((GENRE_OK+1)) || true
echo "$HOLLYWOOD_RESP" | grep -q '"preview"' && GENRE_OK=$((GENRE_OK+1)) || true
echo "$SOUTHINDIAN_RESP" | grep -q '"preview"' && GENRE_OK=$((GENRE_OK+1)) || true

if [[ $GENRE_OK -eq 3 ]]; then
  ok "Genre playlists working  (Bollywood, Hollywood, South Indian)"
elif [[ $GENRE_OK -gt 0 ]]; then
  warn "Genre playlists partial ($GENRE_OK/3 responding) — some genre songs may not load"
else
  warn "Genre playlists not responding — genre screens will use fallback songs"
fi

# Test audio proxy using a real preview URL from the top songs response
PREVIEW_URL=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.data[0]?.preview||'')}catch{process.stdout.write('')}" 2>/dev/null || echo "")
if [[ -n "$PREVIEW_URL" ]]; then
  ENCODED_URL=$(node -e "process.stdout.write(encodeURIComponent('$PREVIEW_URL'))" 2>/dev/null || echo "")
  if [[ -n "$ENCODED_URL" ]]; then
    AUDIO_STATUS=$(curl -so /dev/null -w "%{http_code}" --max-time 8 "http://localhost:$APP_PORT/audio?url=$ENCODED_URL" 2>/dev/null || echo "000")
    if [[ "$AUDIO_STATUS" == "200" || "$AUDIO_STATUS" == "206" ]]; then
      ok "Audio proxy working  (HTTP $AUDIO_STATUS)"
    else
      warn "Audio proxy returned HTTP $AUDIO_STATUS — songs may not play."
    fi
  fi
fi

# ════════════════════════════════════════════════════════════════
#  7. READY — print URL and wait
# ════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Aara Music is running!${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo -e "  ${BOLD}Local:${RESET}  http://localhost:$APP_PORT"
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  PUBLIC_URL="https://${CODESPACE_NAME}-${APP_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  FINAL_CHECK=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "$PUBLIC_URL/health" 2>/dev/null || echo "000")
  if [[ "$FINAL_CHECK" == "200" ]]; then
    echo -e "  ${BOLD}Public:${RESET} $PUBLIC_URL"
  else
    echo -e "  ${BOLD}Public:${RESET} $PUBLIC_URL"
    warn "Port $APP_PORT is not public — open VS Code Ports tab, right-click port $APP_PORT → Public."
  fi
fi
echo ""
echo -e "  Logs:   .logs/proxy.log  |  .logs/expo.log"
echo -e "  Stop:   ${BOLD}Ctrl+C${RESET}  or  ${BOLD}bash stop.sh${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo ""
info "Monitoring services... (Press Ctrl+C to stop)"

# Keep the script alive and monitor child processes
while true; do
  # Check if proxy is still running
  if [[ -n "$PROXY_PID" ]] && ! kill -0 "$PROXY_PID" 2>/dev/null; then
    err "Proxy server died unexpectedly! Check $PROXY_LOG"
    tail -20 "$PROXY_LOG"
    cleanup
    exit 1
  fi
  
  # Check if Expo is still running
  if [[ -n "$EXPO_PID" ]] && ! kill -0 "$EXPO_PID" 2>/dev/null; then
    err "Expo server died unexpectedly! Check $EXPO_LOG"
    tail -20 "$EXPO_LOG"
    cleanup
    exit 1
  fi
  
  # Sleep and continue monitoring
  sleep 2
done
