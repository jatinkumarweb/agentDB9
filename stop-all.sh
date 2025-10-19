#!/bin/bash

echo "🛑 Stopping All Services"
echo "======================="
echo ""

if [ -f ".service-pids" ]; then
  echo "Reading PIDs from .service-pids..."
  while read pid; do
    if ps -p $pid > /dev/null 2>&1; then
      echo "Stopping process $pid..."
      kill $pid 2>/dev/null
    else
      echo "Process $pid not running"
    fi
  done < .service-pids
  rm .service-pids
  echo ""
  echo "✅ Services stopped"
else
  echo "No .service-pids file found"
  echo "Searching for processes..."
  
  # Kill backend
  pkill -f "npm run start:dev" 2>/dev/null && echo "Stopped backend"
  pkill -f "nest start" 2>/dev/null && echo "Stopped nest"
  
  # Kill test server
  pkill -f "test-server.py" 2>/dev/null && echo "Stopped test server"
  
  echo ""
  echo "✅ Cleanup complete"
fi

# Clean up log files
if [ -f "backend.log" ]; then
  rm backend.log
  echo "Removed backend.log"
fi

if [ -f "devserver.log" ]; then
  rm devserver.log
  echo "Removed devserver.log"
fi

echo ""
echo "All services stopped and cleaned up"
