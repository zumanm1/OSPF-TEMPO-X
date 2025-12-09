#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X System Requirements Installer             ║
# ║                    Smart Installer - Skips existing packages              ║
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

# Required versions
MIN_NODE_VERSION=18
MIN_NPM_VERSION=9

# Track what was installed
INSTALLED_NODE=false
INSTALLED_NPM=false
INSTALLED_PSQL=false
ALREADY_MET=0
NEWLY_INSTALLED=0

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    elif [[ -f /etc/redhat-release ]]; then
        OS="redhat"
    else
        OS="unknown"
    fi
    echo "$OS"
}

# Parse version number
parse_version() {
    echo "$1" | sed 's/[^0-9.]//g' | cut -d. -f1
}

OS=$(detect_os)

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X System Requirements Installer           ║${NC}"
echo -e "${BLUE}║              Smart Mode: Skips existing packages              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}[INFO]${NC} Detected OS: ${OS}"
echo ""

# ============================================================================
# Check Node.js
# ============================================================================
echo -e "${BLUE}[STEP 1/3]${NC} Checking Node.js (minimum: v${MIN_NODE_VERSION})..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(parse_version "$(node -v)")
    FULL_NODE_VERSION=$(node -v | cut -d'v' -f2)
    
    if [ "$NODE_VERSION" -ge "$MIN_NODE_VERSION" ]; then
        echo -e "${GREEN}[SKIP]${NC} Node.js v${FULL_NODE_VERSION} already installed ✓"
        ALREADY_MET=$((ALREADY_MET + 1))
    else
        echo -e "${YELLOW}[UPGRADE]${NC} Node.js v${FULL_NODE_VERSION} is below v${MIN_NODE_VERSION}"
        INSTALL_NODE=true
    fi
else
    echo -e "${YELLOW}[MISSING]${NC} Node.js not found"
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    echo -e "${BLUE}[INSTALL]${NC} Installing Node.js v20..."
    
    case "$OS" in
        macos)
            if command -v brew &> /dev/null; then
                # Check if already installed via brew
                if brew list node@24 &>/dev/null; then
                    echo -e "${GREEN}[SKIP]${NC} Node.js already installed via Homebrew"
                else
                    brew install node@24
                    brew link --overwrite node@24 2>/dev/null || true
                fi
            else
                echo -e "${BLUE}[INFO]${NC} Installing via nvm..."
                if [ ! -d "$HOME/.nvm" ]; then
                    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                fi
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 24
                nvm use 24
            fi
            ;;
        debian)
            echo -e "${BLUE}[INFO]${NC} Using NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        redhat)
            curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        *)
            echo -e "${YELLOW}[MANUAL]${NC} Please install Node.js v${MIN_NODE_VERSION}+ manually"
            echo "  https://nodejs.org/en/download/"
            ;;
    esac
    
    if command -v node &> /dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} Node.js $(node -v) installed"
        INSTALLED_NODE=true
        NEWLY_INSTALLED=$((NEWLY_INSTALLED + 1))
    fi
fi

# ============================================================================
# Check npm
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 2/3]${NC} Checking npm (minimum: v${MIN_NPM_VERSION})..."

if command -v npm &> /dev/null; then
    NPM_VERSION=$(parse_version "$(npm -v)")
    FULL_NPM_VERSION=$(npm -v)
    
    if [ "$NPM_VERSION" -ge "$MIN_NPM_VERSION" ]; then
        echo -e "${GREEN}[SKIP]${NC} npm v${FULL_NPM_VERSION} already installed ✓"
        ALREADY_MET=$((ALREADY_MET + 1))
    else
        echo -e "${YELLOW}[UPGRADE]${NC} Upgrading npm from v${FULL_NPM_VERSION} to latest..."
        npm install -g npm@latest
        INSTALLED_NPM=true
        NEWLY_INSTALLED=$((NEWLY_INSTALLED + 1))
    fi
else
    echo -e "${RED}[ERROR]${NC} npm not found. It should come with Node.js."
    echo "  Try reinstalling Node.js"
    exit 1
fi

# ============================================================================
# Check PostgreSQL
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 3/3]${NC} Checking PostgreSQL..."

if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -1)
    echo -e "${GREEN}[SKIP]${NC} ${PSQL_VERSION} already installed ✓"
    ALREADY_MET=$((ALREADY_MET + 1))
    
    # Check if running
    if command -v pg_isready &> /dev/null && pg_isready -q 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is running"
    else
        echo -e "${YELLOW}[WARNING]${NC} PostgreSQL is installed but not running"
        echo -e "${BLUE}[INFO]${NC} Start with:"
        case "$OS" in
            macos) echo "  brew services start postgresql@15" ;;
            *)     echo "  sudo systemctl start postgresql" ;;
        esac
    fi
else
    echo -e "${YELLOW}[MISSING]${NC} PostgreSQL not found"
    echo -e "${BLUE}[INSTALL]${NC} Installing PostgreSQL..."
    
    case "$OS" in
        macos)
            if command -v brew &> /dev/null; then
                # Check if already installed
                if brew list postgresql@15 &>/dev/null; then
                    echo -e "${GREEN}[SKIP]${NC} PostgreSQL already installed via Homebrew"
                else
                    brew install postgresql@15
                fi
                brew services start postgresql@15
            else
                echo -e "${YELLOW}[MANUAL]${NC} Please install PostgreSQL manually"
                echo "  brew install postgresql@15"
            fi
            ;;
        debian)
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        redhat)
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup --initdb 2>/dev/null || true
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        *)
            echo -e "${YELLOW}[MANUAL]${NC} Please install PostgreSQL manually"
            ;;
    esac
    
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL installed"
        INSTALLED_PSQL=true
        NEWLY_INSTALLED=$((NEWLY_INSTALLED + 1))
    fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          System Requirements Check Complete!                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Summary stats
if [ $NEWLY_INSTALLED -eq 0 ]; then
    echo -e "${GREEN}[SUMMARY]${NC} All requirements already met! (${ALREADY_MET} packages)"
else
    echo -e "${GREEN}[SUMMARY]${NC} Newly installed: ${NEWLY_INSTALLED}, Already met: ${ALREADY_MET}"
fi

echo ""
echo -e "${BLUE}Installed:${NC}"
if [ "$INSTALLED_NODE" = true ]; then
    echo -e "  Node.js:    $(node -v 2>/dev/null) ${GREEN}(NEW)${NC}"
else
    echo "  Node.js:    $(node -v 2>/dev/null || echo 'Not installed')"
fi

if [ "$INSTALLED_NPM" = true ]; then
    echo -e "  npm:        v$(npm -v 2>/dev/null) ${GREEN}(UPGRADED)${NC}"
else
    echo "  npm:        v$(npm -v 2>/dev/null || echo 'Not installed')"
fi

if [ "$INSTALLED_PSQL" = true ]; then
    echo -e "  PostgreSQL: $(psql --version 2>/dev/null | head -1 || echo 'Not installed') ${GREEN}(NEW)${NC}"
else
    echo "  PostgreSQL: $(psql --version 2>/dev/null | head -1 || echo 'Not installed')"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Install dependencies:  ./ospf-tempo-x.sh deps"
echo "  2. Setup database:        ./ospf-tempo-x.sh db-setup"
echo "  3. Start servers:         ./ospf-tempo-x.sh start"
echo ""
echo -e "${YELLOW}Quick start:${NC}"
echo "  ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh db-setup && ./ospf-tempo-x.sh start"
echo ""
