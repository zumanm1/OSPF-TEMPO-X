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
LOG_DIR=".logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
API_LOG="$LOG_DIR/api.log"

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

FRONTEND_PORT="${VITE_PORT:-9100}"
API_PORT="${API_PORT:-9101}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ospf_tempo_x}"

USERNAME="netviz_admin"
PASSWORD="V3ry\$trongAdm1n!2025"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ${APP_NAME} Start Script                            ║${NC}"
echo -e "${BLUE}║          NetViz OSPF Network Analyzer                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create log directory
mkdir -p "$LOG_DIR"

# Check if dependencies are installed
echo -e "${BLUE}[STEP 1/5]${NC} Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[WARNING]${NC} node_modules not found. Running npm install..."
  npm install --silent
fi
echo -e "${GREEN}[SUCCESS]${NC} Dependencies verified"

# Check PostgreSQL connection
echo -e ""
echo -e "${BLUE}[STEP 2/5]${NC} Checking PostgreSQL connection..."
if command -v pg_isready &> /dev/null; then
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
    echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL is running"
  else
    echo -e "${RED}[ERROR]${NC} PostgreSQL is not running on ${DB_HOST}:${DB_PORT}"
    echo -e "${YELLOW}Please start PostgreSQL first:${NC}"
    echo -e "  macOS:  brew services start postgresql@15"
    echo -e "  Linux:  sudo systemctl start postgresql"
    exit 1
  fi
else
  echo -e "${YELLOW}[WARNING]${NC} pg_isready not found, skipping PostgreSQL check"
fi

# Check for existing processes
echo -e ""
echo -e "${BLUE}[STEP 3/5]${NC} Checking for existing processes..."

# Check frontend port
if lsof -i :$FRONTEND_PORT -sTCP:LISTEN > /dev/null 2>&1; then
  EXISTING_PID=$(lsof -t -i :$FRONTEND_PORT)
  echo -e "${RED}[ERROR]${NC} Port $FRONTEND_PORT is already in use (PID: $EXISTING_PID)"
  echo -e "${YELLOW}Run './scripts/stop.sh' first or kill the process manually${NC}"
  exit 1
fi

# Check API port
if lsof -i :$API_PORT -sTCP:LISTEN > /dev/null 2>&1; then
  EXISTING_PID=$(lsof -t -i :$API_PORT)
  echo -e "${RED}[ERROR]${NC} Port $API_PORT is already in use (PID: $EXISTING_PID)"
  echo -e "${YELLOW}Run './scripts/stop.sh' first or kill the process manually${NC}"
  exit 1
fi
echo -e "${GREEN}[SUCCESS]${NC} Ports $FRONTEND_PORT and $API_PORT are available"

# Start API server
echo -e ""
echo -e "${BLUE}[STEP 4/5]${NC} Starting API server..."
npm run server > "$API_LOG" 2>&1 &
API_PID=$!
echo "$API_PID" > "$PID_FILE.api"

# Wait for API to be ready
echo -n "         Waiting for API server"
timeout=30
count=0
while ! curl -s "http://localhost:$API_PORT/api/health" > /dev/null 2>&1; do
  sleep 1
  count=$((count + 1))
  echo -n "."
  if [ $count -ge $timeout ]; then
    echo -e "\n${RED}[ERROR]${NC} API server failed to start within $timeout seconds"
    echo -e "${YELLOW}Check logs: tail -f $API_LOG${NC}"
    kill $API_PID 2>/dev/null
    exit 1
  fi
done
echo -e "\n${GREEN}[SUCCESS]${NC} API server running (PID: $API_PID)"

# Start Frontend
echo -e ""
echo -e "${BLUE}[STEP 5/5]${NC} Starting frontend server..."
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_FILE.frontend"

# Wait for frontend to be ready
echo -n "         Waiting for frontend"
timeout=60
count=0
while ! lsof -i :$FRONTEND_PORT -sTCP:LISTEN > /dev/null 2>&1; do
  sleep 1
  count=$((count + 1))
  echo -n "."
  if [ $count -ge $timeout ]; then
    echo -e "\n${RED}[ERROR]${NC} Frontend failed to start within $timeout seconds"
    echo -e "${YELLOW}Check logs: tail -f $FRONTEND_LOG${NC}"
    kill $FRONTEND_PID $API_PID 2>/dev/null
    exit 1
  fi
done
echo -e "\n${GREEN}[SUCCESS]${NC} Frontend running (PID: $FRONTEND_PID)"

# Save combined PID file
echo "$FRONTEND_PID,$API_PID" > "$PID_FILE"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ${APP_NAME} Server Running!                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}   Frontend:${NC}        http://localhost:${FRONTEND_PORT}"
echo -e "${BLUE}   API Server:${NC}      http://localhost:${API_PORT}"
echo -e "${BLUE}   API Health:${NC}      http://localhost:${API_PORT}/api/health"
echo ""
echo -e "${BLUE}   Database:${NC}        ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
echo ""
echo -e "${BLUE}   Default Login:${NC}"
echo -e "     Username: ${GREEN}${USERNAME}${NC}"
echo -e "     Password: ${GREEN}${PASSWORD}${NC}"
echo ""
echo -e "${BLUE}   Process IDs:${NC}"
echo -e "     Frontend: ${FRONTEND_PID}"
echo -e "     API:      ${API_PID}"
echo ""
echo -e "${BLUE}   Log Files:${NC}"
echo -e "     Frontend: ${FRONTEND_LOG}"
echo -e "     API:      ${API_LOG}"
echo ""
echo -e "${YELLOW}   To stop:${NC}         ./scripts/stop.sh"
echo -e "${YELLOW}   To view logs:${NC}    tail -f ${LOG_DIR}/*.log"
echo ""
