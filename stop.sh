#!/bin/bash
# ════════════════════════════════════════════════════════════
#  Aara Music — stop all services
#  Kills whatever is on port 8081 (proxy) and 8082 (Expo).
# ════════════════════════════════════════════════════════════

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'

stop_port() {
  local port=$1
  local label=$2
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}  ✓${RESET} Stopped $label (port $port)"
  else
    echo -e "${YELLOW}  –${RESET} $label (port $port) — not running"
  fi
}

echo ""
stop_port 8081 "Proxy / app server"
stop_port 8082 "Expo dev server"

# Also kill by process name in case ports have changed
pkill -f "server/proxy.js" 2>/dev/null && echo -e "${GREEN}  ✓${RESET} Killed proxy.js process" || true
pkill -f "expo start"       2>/dev/null && echo -e "${GREEN}  ✓${RESET} Killed expo start process" || true

echo ""
echo "  All Aara Music services stopped."
echo ""
