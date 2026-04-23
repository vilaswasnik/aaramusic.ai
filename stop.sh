#!/bin/bash
# ════════════════════════════════════════════════════════════
#  Aara Music — stop all services
#  Kills whatever is on port 8082 (proxy) and 8083 (Expo).
#  Now with PID file support and better cleanup.
# ════════════════════════════════════════════════════════════

# Change to script directory
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
PID_FILE=".logs/app.pid"

stop_port() {
  local port=$1
  local label=$2
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # Try graceful shutdown first
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 0.5
    # Force kill any remaining
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
    echo -e "${GREEN}  ✓${RESET} Stopped $label (port $port)"
  else
    echo -e "${YELLOW}  –${RESET} $label (port $port) — not running"
  fi
}

echo ""

# Stop by PID file first (most reliable)
if [[ -f "$PID_FILE" ]]; then
  echo -e "${GREEN}  →${RESET} Stopping services from PID file..."
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      # Graceful first
      kill -TERM "$pid" 2>/dev/null || true
      sleep 0.3
      # Force if still running
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
      echo -e "${GREEN}  ✓${RESET} Stopped process $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo -e "${YELLOW}  –${RESET} No PID file found, stopping by port..."
fi

# Stop by port (backup method)
stop_port 8082 "Proxy / app server"
stop_port 8083 "Expo dev server"

# Also kill by process name in case ports have changed or PID file is stale
KILLED_PROXY=0
KILLED_EXPO=0

if pkill -TERM -f "server/proxy.js" 2>/dev/null; then
  sleep 0.3
  pkill -9 -f "server/proxy.js" 2>/dev/null || true
  KILLED_PROXY=1
fi

if pkill -TERM -f "expo start" 2>/dev/null; then
  sleep 0.3
  pkill -9 -f "expo start" 2>/dev/null || true
  KILLED_EXPO=1
fi

[[ $KILLED_PROXY -eq 1 ]] && echo -e "${GREEN}  ✓${RESET} Killed proxy.js processes"
[[ $KILLED_EXPO -eq 1 ]] && echo -e "${GREEN}  ✓${RESET} Killed expo start processes"

# Final verification
sleep 0.5
REMAINING_8082=$(lsof -ti :8082 2>/dev/null | wc -l | xargs)
REMAINING_8083=$(lsof -ti :8083 2>/dev/null | wc -l | xargs)
REMAINING_8082=${REMAINING_8082:-0}
REMAINING_8083=${REMAINING_8083:-0}

if [[ $REMAINING_8082 -gt 0 || $REMAINING_8083 -gt 0 ]]; then
  echo -e "${RED}  ✗${RESET} Warning: Some processes may still be running"
  [[ $REMAINING_8082 -gt 0 ]] && echo -e "  Port 8082: $REMAINING_8082 process(es)"
  [[ $REMAINING_8083 -gt 0 ]] && echo -e "  Port 8083: $REMAINING_8083 process(es)"
  exit 1
fi

echo ""
echo -e "${GREEN}  All Aara Music services stopped successfully.${RESET}"
echo ""

exit 0
