#!/bin/bash

PORT="${1:-5173}"

echo "Starting simple HTTP server on port $PORT..."
echo "Press Ctrl+C to stop"
echo ""

# Use netcat if available
if command -v nc > /dev/null 2>&1; then
  while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nAccess-Control-Allow-Origin: *\r\n\r\n<html><body><h1>Test Server Running on Port $PORT</h1><p>Proxy is working!</p></body></html>" | nc -l -p $PORT -q 1
  done
else
  echo "Error: nc (netcat) not available"
  echo "Cannot start server without Python, Node, or netcat"
  exit 1
fi
