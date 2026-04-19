#!/bin/bash
# Stop the proxy server and Expo dev server

echo "Stopping Expo dev server (port 8081)..."
lsof -ti :8081 | xargs kill -9 2>/dev/null && echo "Stopped." || echo "Not running."

echo "Stopping proxy server (port 3001)..."
lsof -ti :3001 | xargs kill -9 2>/dev/null && echo "Stopped." || echo "Not running."

echo "All services stopped."
