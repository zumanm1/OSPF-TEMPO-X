#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X NVM + Node.js Setup                       ║
# ║           Isolated Node.js Environment for Project Independence           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Configuration
NVM_VERSION="v0.39.7"
NODE_VERSION="20"
REQUIRED_NODE_MAJOR=18

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║             OSPF-TEMPO-X NVM + Node.js Setup                  ║${NC}"
echo -e "${CYAN}║         Isolated Node.js Environment Configuration           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Check if nvm is already installed
# ============================================================================
echo -e "${BLUE}[STEP 1/4]${NC} Checking for nvm (Node Version Manager)..."

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_INSTALLED=false

if [ -d "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    echo -e "${GREEN}[OK]${NC} nvm is already installed at $NVM_DIR"
    NVM_INSTALLED=true
    # Source nvm
    export NVM_DIR
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
else
    echo -e "${YELLOW}[INSTALL]${NC} Installing nvm ${NVM_VERSION}..."
    
    # Download and install nvm
    curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
    
    # Set up NVM_DIR and source it
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    if [ -d "$NVM_DIR" ]; then
        echo -e "${GREEN}[SUCCESS]${NC} nvm ${NVM_VERSION} installed"
        NVM_INSTALLED=true
    else
        echo -e "${RED}[ERROR]${NC} Failed to install nvm"
        echo "  Please install manually: https://github.com/nvm-sh/nvm#installing-and-updating"
        exit 1
    fi
fi

# ============================================================================
# Step 2: Install Node.js via nvm
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 2/4]${NC} Checking Node.js v${NODE_VERSION}..."

if command -v nvm &> /dev/null || [ -s "$NVM_DIR/nvm.sh" ]; then
    # Ensure nvm is loaded
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Check if Node.js v20 is installed
    if nvm ls "$NODE_VERSION" 2>/dev/null | grep -q "$NODE_VERSION"; then
        echo -e "${GREEN}[OK]${NC} Node.js v${NODE_VERSION} already installed via nvm"
        nvm use "$NODE_VERSION" 2>/dev/null || true
    else
        echo -e "${BLUE}[INSTALL]${NC} Installing Node.js v${NODE_VERSION} via nvm..."
        nvm install "$NODE_VERSION"
        nvm use "$NODE_VERSION"
        echo -e "${GREEN}[SUCCESS]${NC} Node.js $(node -v) installed"
    fi
    
    # Set default version
    nvm alias default "$NODE_VERSION" 2>/dev/null || true
else
    echo -e "${RED}[ERROR]${NC} nvm not found after installation"
    echo "  Please restart your terminal and run this script again"
    exit 1
fi

# ============================================================================
# Step 3: Create version pinning files
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 3/4]${NC} Creating version pinning files..."

# Create .nvmrc
if [ ! -f ".nvmrc" ] || [ "$(cat .nvmrc)" != "$NODE_VERSION" ]; then
    echo "$NODE_VERSION" > .nvmrc
    echo -e "${GREEN}[CREATED]${NC} .nvmrc (for nvm)"
else
    echo -e "${GREEN}[EXISTS]${NC} .nvmrc"
fi

# Create .node-version (for fnm, volta, nodenv)
if [ ! -f ".node-version" ] || [ "$(cat .node-version)" != "$NODE_VERSION" ]; then
    echo "$NODE_VERSION" > .node-version
    echo -e "${GREEN}[CREATED]${NC} .node-version (for fnm, volta, nodenv)"
else
    echo -e "${GREEN}[EXISTS]${NC} .node-version"
fi

# ============================================================================
# Step 4: Configure shell integration
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 4/4]${NC} Checking shell integration..."

SHELL_CONFIG=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
fi

if [ -n "$SHELL_CONFIG" ]; then
    # Check if nvm is already in shell config
    if grep -q "NVM_DIR" "$SHELL_CONFIG" 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} nvm already configured in $(basename $SHELL_CONFIG)"
    else
        echo -e "${YELLOW}[INFO]${NC} nvm configuration should have been added to $SHELL_CONFIG"
    fi
else
    echo -e "${YELLOW}[INFO]${NC} No shell config file found (.zshrc/.bashrc/.bash_profile)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Isolated Node.js Environment Ready!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Installed:${NC}"
echo "  nvm:      $(nvm --version 2>/dev/null || echo 'installed')"
echo "  Node.js:  $(node -v 2>/dev/null || echo 'run: nvm use')"
echo "  npm:      v$(npm -v 2>/dev/null || echo 'run: nvm use')"
echo ""
echo -e "${BLUE}Version files created:${NC}"
echo "  .nvmrc         → Pins Node v${NODE_VERSION} (for nvm)"
echo "  .node-version  → Pins Node v${NODE_VERSION} (for fnm, volta)"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}IMPORTANT: Start a new terminal OR run:${NC}"
echo ""
echo -e "  ${GREEN}source ~/.nvm/nvm.sh${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Install dependencies:  ./ospf-tempo-x.sh deps"
echo "  2. Setup database:        ./ospf-tempo-x.sh db-setup"
echo "  3. Start servers:         ./ospf-tempo-x.sh start"
echo ""
echo -e "${YELLOW}Quick start after terminal restart:${NC}"
echo "  ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh db-setup && ./ospf-tempo-x.sh start"
echo ""


