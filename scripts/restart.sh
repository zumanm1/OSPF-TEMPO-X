#!/bin/bash

# Define colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

APP_NAME="OSPF-TEMPO-X"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ${APP_NAME} Restart Script                          ║${NC}"
echo -e "${BLUE}║          NetViz OSPF Network Analyzer                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}[STEP 1/2]${NC} Stopping ${APP_NAME}..."
"$SCRIPT_DIR/stop.sh"

echo ""
echo -e "${BLUE}[STEP 2/2]${NC} Starting ${APP_NAME}..."
"$SCRIPT_DIR/start.sh"
