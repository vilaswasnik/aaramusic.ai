#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Aara Music — start everything with one command
#
#  What this does:
#    1. Pre-flight checks  (node, npm deps, proxy file)
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

APP_PORT=8081
EXPO_PORT=8082
LOG_DIR="$(dirname "$0")/.logs"
PROXY_LOG="$LOG_DIR/proxy.log"
EXPO_LOG="$LOG_DIR/expo.log"

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

cleanup() {
  echo ""
  info "Shutting down Aara Music..."
  [[ -n "$PROXY_PID" ]] && kill "$PROXY_PID" 2>/dev/null || true
  [[ -n "$EXPO_PID"  ]] && kill "$EXPO_PID"  2>/dev/null || true
  # Hard-kill anything still on the ports
  lsof -ti :"$APP_PORT"  | xargs kill -9 2>/dev/null || true
  lsof -ti :"$EXPO_PORT" | xargs kill -9 2>/dev/null || true
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
if [[ ! -d "$(dirname "$0")/node_modules" ]]; then
  warn "node_modules not found — running npm install..."
  npm install --silent
  ok "Dependencies installed."
else
  ok "node_modules present"
fi

# Required server file
if [[ ! -f "$(dirname "$0")/server/proxy.js" ]]; then
  err "server/proxy.js not found. Are you in the project root?"
  exit 1
fi
ok "server/proxy.js found"

# Create log directory
mkdir -p "$LOG_DIR"

# ════════════════════════════════════════════════════════════════
#  2. KILL STALE PROCESSES
# ════════════════════════════════════════════════════════════════
echo ""
info "Clearing ports $APP_PORT and $EXPO_PORT..."
lsof -ti :"$APP_PORT"  | xargs kill -9 2>/dev/null && warn "Killed stale process on $APP_PORT" || true
lsof -ti :"$EXPO_PORT" | xargs kill -9 2>/dev/null && warn "Killed stale process on $EXPO_PORT" || true
sleep 0.5

# ════════════════════════════════════════════════════════════════
#  3. START PROXY SERVER
# ════════════════════════════════════════════════════════════════
echo ""
info "Starting proxy server on port $APP_PORT..."
node server/proxy.js > "$PROXY_LOG" 2>&1 &
PROXY_PID=$!

# Wait up to 12 seconds for proxy to become ready
READY=0
for i in $(seq 1 24); do
  if curl -sf "http://localhost:$APP_PORT/health" >/dev/null 2>&1; then
    READY=1; break
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
#  4. MAKE PORT PUBLIC (Codespaces only)
# ════════════════════════════════════════════════════════════════
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  info "Making port $APP_PORT public in Codespaces..."
  gh codespace ports visibility "$APP_PORT:public" -c "$CODESPACE_NAME" 2>/dev/null && ok "Port $APP_PORT is public" || warn "Could not set port visibility (non-fatal)"
fi

# ════════════════════════════════════════════════════════════════
#  5. START EXPO DEV SERVER
# ════════════════════════════════════════════════════════════════
echo ""
info "Starting Expo dev server on internal port $EXPO_PORT..."
npx expo start --web --port "$EXPO_PORT" > "$EXPO_LOG" 2>&1 &
EXPO_PID=$!

# Wait up to 30 seconds for Expo to be ready (Metro bundler needs time)
EXPO_READY=0
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$EXPO_PORT" >/dev/null 2>&1; then
    EXPO_READY=1; break
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

# Test Deezer API route
API_RESP=$(curl -sf "http://localhost:$APP_PORT/api/chart/0/tracks?limit=1" 2>/dev/null || echo "")
if echo "$API_RESP" | grep -q '"preview"'; then
  TRACK_TITLE=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.data[0]?.title||'?')}catch{process.stdout.write('?')}" 2>/dev/null || echo "?")
  ok "Songs API working  (sample: \"$TRACK_TITLE\")"
else
  warn "Songs API did not return expected data — the app will use fallback songs."
fi

# Test audio proxy
PREVIEW_URL=$(echo "$API_RESP" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d.data[0]?.preview||'')}catch{process.stdout.write('')}" 2>/dev/null || echo "")
if [[ -n "$PREVIEW_URL" ]]; then
  AUDIO_STATUS=$(curl -so /dev/null -w "%{http_code}" "http://localhost:$APP_PORT/audio?url=$(node -e "process.stdout.write(encodeURIComponent('$PREVIEW_URL'))" 2>/dev/null)" 2>/dev/null || echo "000")
  if [[ "$AUDIO_STATUS" == "200" || "$AUDIO_STATUS" == "206" ]]; then
    ok "Audio proxy working  (HTTP $AUDIO_STATUS)"
  else
    warn "Audio proxy returned HTTP $AUDIO_STATUS — audio may not play correctly."
  fi
fi

# Test health endpoint
HEALTH=$(curl -sf "http://localhost:$APP_PORT/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok"'; then
  ok "Health endpoint OK"
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
  echo -e "  ${BOLD}Public:${RESET} https://${CODESPACE_NAME}-${APP_PORT}.app.github.dev"
fi
echo ""
echo -e "  Logs:   .logs/proxy.log  |  .logs/expo.log"
echo -e "  Stop:   ${BOLD}Ctrl+C${RESET}  or  ${BOLD}bash stop.sh${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo ""

# Keep the script alive — it will exit when either child dies or user hits Ctrl+C
# Disable EXIT trap so cleanup doesn't double-fire after manual SIGINT
trap - EXIT
wait "$PROXY_PID" "$EXPO_PID"

