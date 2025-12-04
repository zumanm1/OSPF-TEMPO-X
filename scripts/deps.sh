#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X Dependencies Installer                    ║
# ║                    Smart Mode: Skips already-met dependencies             ║
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
VERBOSE=false
for arg in "$@"; do
    case $arg in
        -f|--force) FORCE=true ;;
        -v|--verbose) VERBOSE=true ;;
    esac
done

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X Dependencies Installer                  ║${NC}"
echo -e "${BLUE}║              Smart Mode: Skips existing packages              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FORCE" = true ]; then
    echo -e "${YELLOW}[MODE]${NC} Force mode enabled - will reinstall all dependencies"
else
    echo -e "${GREEN}[MODE]${NC} Smart mode - will skip already-installed packages"
fi
echo ""

# ============================================================================
# Check prerequisites
# ============================================================================
echo -e "${BLUE}[CHECK]${NC} Verifying prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed."
    echo "  Run './ospf-tempo-x.sh install' first."
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}[OK]${NC} Node.js ${NODE_VERSION}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not installed."
    echo "  Run './ospf-tempo-x.sh install' first."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}[OK]${NC} npm v${NPM_VERSION}"
echo ""

# ============================================================================
# Check if dependencies are already installed and up-to-date
# ============================================================================
check_deps_uptodate() {
    local dir="$1"
    local name="$2"
    
    if [ ! -d "${dir}/node_modules" ]; then
        return 1  # Not installed
    fi
    
    # Check if package-lock.json is newer than node_modules
    if [ -f "${dir}/package-lock.json" ]; then
        if [ "${dir}/package-lock.json" -nt "${dir}/node_modules" ]; then
            return 1  # Needs update
        fi
    fi
    
    # Check if package.json is newer than node_modules
    if [ "${dir}/package.json" -nt "${dir}/node_modules" ]; then
        return 1  # Needs update
    fi
    
    return 0  # Up to date
}

# ============================================================================
# Install frontend dependencies
# ============================================================================
echo -e "${BLUE}[STEP 1/2]${NC} Checking frontend dependencies..."

FRONTEND_INSTALLED=false

if [ "$FORCE" = true ]; then
    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}[INFO]${NC} Force mode: Removing existing node_modules..."
        rm -rf node_modules
    fi
    echo -e "${BLUE}[INSTALL]${NC} Installing frontend dependencies..."
    npm install
    FRONTEND_INSTALLED=true
elif check_deps_uptodate "." "frontend"; then
    # Check number of installed packages
    PKG_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}[SKIP]${NC} Frontend dependencies already installed (${PKG_COUNT} packages) ✓"
else
    if [ -d "node_modules" ]; then
        echo -e "${BLUE}[UPDATE]${NC} Updating frontend dependencies..."
        npm install
    else
        echo -e "${BLUE}[INSTALL]${NC} Installing frontend dependencies..."
        npm install
    fi
    FRONTEND_INSTALLED=true
fi

if [ "$FRONTEND_INSTALLED" = true ]; then
    PKG_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}[SUCCESS]${NC} Frontend dependencies installed (${PKG_COUNT} packages)"
fi

# ============================================================================
# Check backend dependencies (if separate)
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 2/2]${NC} Checking backend dependencies..."

BACKEND_INSTALLED=false

if [ -f "server/package.json" ]; then
    echo -e "${BLUE}[INFO]${NC} Found separate server package.json"
    
    if [ "$FORCE" = true ]; then
        if [ -d "server/node_modules" ]; then
            echo -e "${YELLOW}[INFO]${NC} Force mode: Removing existing server/node_modules..."
            rm -rf server/node_modules
        fi
        cd server
        echo -e "${BLUE}[INSTALL]${NC} Installing backend dependencies..."
        npm install
        cd ..
        BACKEND_INSTALLED=true
    elif check_deps_uptodate "server" "backend"; then
        PKG_COUNT=$(ls -1 server/node_modules 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${GREEN}[SKIP]${NC} Backend dependencies already installed (${PKG_COUNT} packages) ✓"
    else
        cd server
        if [ -d "node_modules" ]; then
            echo -e "${BLUE}[UPDATE]${NC} Updating backend dependencies..."
            npm install
        else
            echo -e "${BLUE}[INSTALL]${NC} Installing backend dependencies..."
            npm install
        fi
        cd ..
        BACKEND_INSTALLED=true
    fi
    
    if [ "$BACKEND_INSTALLED" = true ]; then
        PKG_COUNT=$(ls -1 server/node_modules 2>/dev/null | wc -l | tr -d ' ')
        echo -e "${GREEN}[SUCCESS]${NC} Backend dependencies installed (${PKG_COUNT} packages)"
    fi
else
    echo -e "${GREEN}[OK]${NC} Backend uses root package.json (monorepo setup)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Dependencies Check Complete!                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FRONTEND_INSTALLED" = true ] || [ "$BACKEND_INSTALLED" = true ]; then
    echo -e "${GREEN}[SUMMARY]${NC} Dependencies updated successfully"
else
    echo -e "${GREEN}[SUMMARY]${NC} All dependencies were already up-to-date!"
fi

echo ""
echo -e "${BLUE}Installed packages:${NC}"
FRONTEND_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l | tr -d ' ')
echo "  Frontend:  ${FRONTEND_COUNT} packages"
if [ -d "server/node_modules" ]; then
    BACKEND_COUNT=$(ls -1 server/node_modules 2>/dev/null | wc -l | tr -d ' ')
    echo "  Backend:   ${BACKEND_COUNT} packages"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Setup database:  ./ospf-tempo-x.sh db-setup"
echo "  2. Start servers:   ./ospf-tempo-x.sh start"
echo ""
echo -e "${YELLOW}Tip:${NC} Use '--force' to reinstall all dependencies"
echo ""
