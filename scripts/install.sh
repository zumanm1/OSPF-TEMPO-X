#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X System Requirements Installer             ║
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

OS=$(detect_os)

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X System Requirements Installer           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}[INFO]${NC} Detected OS: ${OS}"
echo ""

# Check and install Node.js
echo -e "${BLUE}[STEP 1/3]${NC} Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}[OK]${NC} Node.js v$(node -v | cut -d'v' -f2) is installed"
    else
        echo -e "${YELLOW}[WARNING]${NC} Node.js version is too old (v$(node -v)). Need v18+"
        INSTALL_NODE=true
    fi
else
    echo -e "${YELLOW}[INFO]${NC} Node.js not found"
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    echo -e "${BLUE}[INSTALL]${NC} Installing Node.js..."
    case "$OS" in
        macos)
            if command -v brew &> /dev/null; then
                brew install node@20
            else
                echo -e "${YELLOW}[INFO]${NC} Installing via nvm..."
                curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                nvm install 20
                nvm use 20
            fi
            ;;
        debian)
            echo -e "${BLUE}[INFO]${NC} Using NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        redhat)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        *)
            echo -e "${YELLOW}[INFO]${NC} Please install Node.js v18+ manually"
            echo "  https://nodejs.org/en/download/"
            ;;
    esac
    
    if command -v node &> /dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} Node.js $(node -v) installed"
    fi
fi

# Check npm
echo -e ""
echo -e "${BLUE}[STEP 2/3]${NC} Checking npm..."
if command -v npm &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} npm v$(npm -v) is installed"
else
    echo -e "${RED}[ERROR]${NC} npm not found. It should come with Node.js."
    exit 1
fi

# Check and install PostgreSQL
echo -e ""
echo -e "${BLUE}[STEP 3/3]${NC} Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -1)
    echo -e "${GREEN}[OK]${NC} ${PSQL_VERSION}"
else
    echo -e "${YELLOW}[INFO]${NC} PostgreSQL not found"
    echo -e "${BLUE}[INSTALL]${NC} Installing PostgreSQL..."
    
    case "$OS" in
        macos)
            if command -v brew &> /dev/null; then
                brew install postgresql@15
                brew services start postgresql@15
            else
                echo -e "${YELLOW}[WARNING]${NC} Please install PostgreSQL manually"
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
            sudo postgresql-setup --initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        *)
            echo -e "${YELLOW}[WARNING]${NC} Please install PostgreSQL manually"
            ;;
    esac
    
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL installed"
    fi
fi

# Verify PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    if pg_isready -q 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is running"
    else
        echo -e "${YELLOW}[WARNING]${NC} PostgreSQL is not running"
        echo -e "${BLUE}[INFO]${NC} Start with:"
        echo "  macOS:  brew services start postgresql@15"
        echo "  Linux:  sudo systemctl start postgresql"
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          System Requirements Check Complete!                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Installed:${NC}"
echo "  Node.js:    $(node -v 2>/dev/null || echo 'Not installed')"
echo "  npm:        v$(npm -v 2>/dev/null || echo 'Not installed')"
echo "  PostgreSQL: $(psql --version 2>/dev/null | head -1 || echo 'Not installed')"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Install dependencies:  ./ospf-tempo-x.sh deps"
echo "  2. Setup database:        ./ospf-tempo-x.sh db-setup"
echo "  3. Start servers:         ./ospf-tempo-x.sh start"
echo ""
echo -e "${YELLOW}Quick start:${NC}"
echo "  ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh db-setup && ./ospf-tempo-x.sh start"
echo ""
