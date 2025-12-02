#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

APP_NAME="OSPF-TEMPO-X"
PID_FILE=".ospf-tempo-x.pid"

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

FRONTEND_PORT="${VITE_PORT:-9100}"
API_PORT="${API_PORT:-9101}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ${APP_NAME} Stop Script                             ║${NC}"
echo -e "${BLUE}║          NetViz OSPF Network Analyzer                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

STOPPED_SOMETHING=false

# Stop using PID files
echo -e "${BLUE}[STEP 1/3]${NC} Checking PID files..."

if [ -f "$PID_FILE" ]; then
  PIDS=$(cat "$PID_FILE")
  IFS=',' read -ra PID_ARRAY <<< "$PIDS"
  
  for pid in "${PID_ARRAY[@]}"; do
    if ps -p $pid > /dev/null 2>&1; then
      echo -e "${YELLOW}[INFO]${NC} Stopping process $pid..."
      kill $pid 2>/dev/null
      sleep 1
      if ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}[INFO]${NC} Force killing process $pid..."
        kill -9 $pid 2>/dev/null
      fi
      echo -e "${GREEN}[SUCCESS]${NC} Process $pid stopped"
      STOPPED_SOMETHING=true
    fi
  done
  rm -f "$PID_FILE" "$PID_FILE.api" "$PID_FILE.frontend"
else
  echo -e "${YELLOW}[INFO]${NC} No PID file found"
fi

# Check and kill processes on frontend port
echo -e ""
echo -e "${BLUE}[STEP 2/3]${NC} Checking port $FRONTEND_PORT (Frontend)..."
FRONTEND_PID=$(lsof -t -i :$FRONTEND_PORT 2>/dev/null)

if [ -n "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}[INFO]${NC} Found process $FRONTEND_PID on port $FRONTEND_PORT"
  kill $FRONTEND_PID 2>/dev/null
  sleep 1
  if lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
    kill -9 $FRONTEND_PID 2>/dev/null
  fi
  echo -e "${GREEN}[SUCCESS]${NC} Stopped frontend on port $FRONTEND_PORT"
  STOPPED_SOMETHING=true
else
  echo -e "${YELLOW}[INFO]${NC} No process running on port $FRONTEND_PORT"
fi

# Check and kill processes on API port
echo -e ""
echo -e "${BLUE}[STEP 3/3]${NC} Checking port $API_PORT (API)..."
API_PID=$(lsof -t -i :$API_PORT 2>/dev/null)

if [ -n "$API_PID" ]; then
  echo -e "${YELLOW}[INFO]${NC} Found process $API_PID on port $API_PORT"
  kill $API_PID 2>/dev/null
  sleep 1
  if lsof -i :$API_PORT > /dev/null 2>&1; then
    kill -9 $API_PID 2>/dev/null
  fi
  echo -e "${GREEN}[SUCCESS]${NC} Stopped API on port $API_PORT"
  STOPPED_SOMETHING=true
else
  echo -e "${YELLOW}[INFO]${NC} No process running on port $API_PORT"
fi

# Also kill any related node processes for this project
pkill -f "tsx.*server/index.ts" 2>/dev/null
pkill -f "vite.*OSPF-TEMPO-X" 2>/dev/null

echo ""
if [ "$STOPPED_SOMETHING" = true ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          ${APP_NAME} Stopped Successfully!                   ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║          No running ${APP_NAME} processes found              ║${NC}"
  echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
fi
echo ""
echo -e "${BLUE}To start the server again:${NC} ./scripts/start.sh"
echo ""
