#!/bin/bash
# Start the proxy server and Expo dev server

echo "Starting proxy server on port 3001..."
node server/proxy.js &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Make port 3001 public in Codespaces
if [ -n "$CODESPACE_NAME" ]; then
  echo "Making port 3001 public..."
  gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null
fi

echo "Starting Expo dev server..."
npx expo start --web
