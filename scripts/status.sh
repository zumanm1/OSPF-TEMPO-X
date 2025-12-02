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
LOG_DIR=".logs"

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

FRONTEND_PORT="${VITE_PORT:-9100}"
API_PORT="${API_PORT:-9101}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ospf_tempo_x}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ${APP_NAME} Status                                  ║${NC}"
echo -e "${BLUE}║          NetViz OSPF Network Analyzer                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Frontend
echo -e "${BLUE}Frontend Server (Port $FRONTEND_PORT):${NC}"
FRONTEND_PID=$(lsof -t -i :$FRONTEND_PORT 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
  echo -e "  Status:  ${GREEN}● RUNNING${NC}"
  echo -e "  PID:     $FRONTEND_PID"
  echo -e "  URL:     http://localhost:$FRONTEND_PORT"
else
  echo -e "  Status:  ${RED}○ STOPPED${NC}"
fi

echo ""

# Check API
echo -e "${BLUE}API Server (Port $API_PORT):${NC}"
API_PID=$(lsof -t -i :$API_PORT 2>/dev/null)
if [ -n "$API_PID" ]; then
  echo -e "  Status:  ${GREEN}● RUNNING${NC}"
  echo -e "  PID:     $API_PID"
  echo -e "  URL:     http://localhost:$API_PORT"
  
  # Health check
  HEALTH=$(curl -s "http://localhost:$API_PORT/api/health" 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    DB_STATUS=$(echo $HEALTH | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    echo -e "  Health:  ${GREEN}✓ Healthy${NC}"
    echo -e "  DB:      ${DB_STATUS:-unknown}"
  else
    echo -e "  Health:  ${YELLOW}? Unable to check${NC}"
  fi
else
  echo -e "  Status:  ${RED}○ STOPPED${NC}"
fi

echo ""

# Check PostgreSQL
echo -e "${BLUE}PostgreSQL Database:${NC}"
echo -e "  Host:    $DB_HOST:$DB_PORT"
echo -e "  Name:    $DB_NAME"

if command -v pg_isready &> /dev/null; then
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
    echo -e "  Status:  ${GREEN}● CONNECTED${NC}"
    
    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
      # Count tables
      TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null)
      echo -e "  Tables:  ${TABLE_COUNT:-0}"
      
      # Count users
      USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users" 2>/dev/null)
      echo -e "  Users:   ${USER_COUNT:-0}"
    else
      echo -e "  Database: ${YELLOW}Not initialized${NC}"
    fi
  else
    echo -e "  Status:  ${RED}○ NOT RUNNING${NC}"
  fi
else
  echo -e "  Status:  ${YELLOW}? Cannot determine (pg_isready not found)${NC}"
fi

echo ""

# Log files
echo -e "${BLUE}Log Files:${NC}"
if [ -d "$LOG_DIR" ]; then
  if [ -f "$LOG_DIR/frontend.log" ]; then
    FRONTEND_SIZE=$(du -h "$LOG_DIR/frontend.log" 2>/dev/null | cut -f1)
    echo -e "  Frontend: $LOG_DIR/frontend.log ($FRONTEND_SIZE)"
  else
    echo -e "  Frontend: ${YELLOW}Not found${NC}"
  fi
  
  if [ -f "$LOG_DIR/api.log" ]; then
    API_SIZE=$(du -h "$LOG_DIR/api.log" 2>/dev/null | cut -f1)
    echo -e "  API:      $LOG_DIR/api.log ($API_SIZE)"
  else
    echo -e "  API:      ${YELLOW}Not found${NC}"
  fi
else
  echo -e "  ${YELLOW}Log directory not found${NC}"
fi

echo ""

# Quick actions
echo -e "${BLUE}Quick Actions:${NC}"
if [ -n "$FRONTEND_PID" ] && [ -n "$API_PID" ]; then
  echo -e "  Stop:     ./scripts/stop.sh"
  echo -e "  Restart:  ./scripts/restart.sh"
  echo -e "  Logs:     tail -f $LOG_DIR/*.log"
else
  echo -e "  Start:    ./scripts/start.sh"
  echo -e "  Install:  ./scripts/install.sh"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Status Check Complete                                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
