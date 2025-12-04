#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X Dependencies Installer                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Parse arguments
FORCE=false
for arg in "$@"; do
    case $arg in
        -f|--force) FORCE=true ;;
    esac
done

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X Dependencies Installer                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
echo -e "${BLUE}[CHECK]${NC} Verifying Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed. Run './ospf-tempo-x.sh install' first."
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}[OK]${NC} Node.js ${NODE_VERSION}"

# Check npm
echo -e "${BLUE}[CHECK]${NC} Verifying npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not installed. Run './ospf-tempo-x.sh install' first."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}[OK]${NC} npm v${NPM_VERSION}"
echo ""

# Install frontend dependencies
echo -e "${BLUE}[STEP 1/2]${NC} Installing frontend dependencies..."

if [ -d "node_modules" ] && [ "$FORCE" != true ]; then
    echo -e "${YELLOW}[INFO]${NC} node_modules exists. Use --force to reinstall."
    echo -e "${BLUE}[INFO]${NC} Checking for updates..."
    npm update --silent 2>/dev/null || npm install --silent
else
    if [ "$FORCE" = true ] && [ -d "node_modules" ]; then
        echo -e "${YELLOW}[INFO]${NC} Force flag set. Removing node_modules..."
        rm -rf node_modules
    fi
    npm install --silent
fi
echo -e "${GREEN}[SUCCESS]${NC} Frontend dependencies installed"

# Check if there's a separate server directory with its own package.json
echo -e ""
echo -e "${BLUE}[STEP 2/2]${NC} Checking backend dependencies..."

if [ -f "server/package.json" ]; then
    echo -e "${BLUE}[INFO]${NC} Found separate server package.json"
    cd server
    if [ -d "node_modules" ] && [ "$FORCE" != true ]; then
        echo -e "${YELLOW}[INFO]${NC} server/node_modules exists. Use --force to reinstall."
        npm update --silent 2>/dev/null || npm install --silent
    else
        if [ "$FORCE" = true ] && [ -d "node_modules" ]; then
            rm -rf node_modules
        fi
        npm install --silent
    fi
    cd ..
    echo -e "${GREEN}[SUCCESS]${NC} Backend dependencies installed"
else
    echo -e "${GREEN}[OK]${NC} Backend uses root package.json (monorepo setup)"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Dependencies Installation Complete!                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Setup database:  ./ospf-tempo-x.sh db-setup"
echo "  2. Start servers:   ./ospf-tempo-x.sh start"
echo ""

