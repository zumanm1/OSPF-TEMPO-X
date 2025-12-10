#!/bin/bash
#===============================================================================
# App4 - OSPF Tempo-X Validator
# Purpose: Validate all components are running correctly
# Ports: Frontend (9100), Backend API (9101)
# GitHub: https://github.com/zumanm1/OSPF-TEMPO-X
#===============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
APP_NAME="App4 - Tempo-X"
FRONTEND_PORT=9100
BACKEND_PORT=9101
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Counters
PASS=0
FAIL=0
WARN=0

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
log_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 $APP_NAME - Validation                     ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "  ${YELLOW}!${NC} $1"
    ((WARN++))
}

check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

#-------------------------------------------------------------------------------
# Validation Checks
#-------------------------------------------------------------------------------
validate_ports() {
    echo -e "${BLUE}[1/7] Checking Ports...${NC}"

    if check_port $FRONTEND_PORT; then
        check_pass "Frontend port $FRONTEND_PORT is UP"
    else
        check_fail "Frontend port $FRONTEND_PORT is DOWN"
    fi

    if check_port $BACKEND_PORT; then
        check_pass "Backend port $BACKEND_PORT is UP"
    else
        check_fail "Backend port $BACKEND_PORT is DOWN"
    fi
}

validate_frontend() {
    echo -e "${BLUE}[2/7] Checking Frontend...${NC}"

    local response=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$FRONTEND_PORT 2>/dev/null)
    if [ "$response" = "200" ]; then
        check_pass "Frontend responding (HTTP $response)"
    else
        check_fail "Frontend not responding (HTTP $response)"
    fi
}

validate_api_health() {
    echo -e "${BLUE}[3/7] Checking API Health...${NC}"

    local health=$(curl -s http://localhost:$BACKEND_PORT/api/health 2>/dev/null)
    if echo "$health" | grep -qi "ok\|healthy\|status"; then
        check_pass "API health endpoint: OK"

        # Check database connection
        if echo "$health" | grep -qi "database.*connected\|db.*ok"; then
            check_pass "Database: connected"
        else
            check_warn "Database status unknown"
        fi
    else
        check_fail "API health endpoint not responding"
    fi
}

validate_auth_config() {
    echo -e "${BLUE}[4/7] Checking Auth Config...${NC}"

    local auth_config=$(curl -s http://localhost:$BACKEND_PORT/api/auth/config 2>/dev/null)
    if [ -n "$auth_config" ] && [ "$auth_config" != "null" ]; then
        check_pass "Auth config endpoint available"
    else
        check_warn "Auth config endpoint not responding"
    fi
}

validate_cors() {
    echo -e "${BLUE}[5/7] Checking CORS...${NC}"

    local cors_header=$(curl -s -I -X OPTIONS http://localhost:$BACKEND_PORT/api/health 2>/dev/null | grep -i "access-control")
    if [ -n "$cors_header" ]; then
        check_pass "CORS headers present"
    else
        check_warn "CORS headers not detected (may be OK)"
    fi
}

validate_files() {
    echo -e "${BLUE}[6/7] Checking Files...${NC}"

    if [ -f "$SCRIPT_DIR/package.json" ]; then
        check_pass "package.json exists"
    else
        check_fail "package.json missing"
    fi

    if [ -d "$SCRIPT_DIR/node_modules" ]; then
        check_pass "node_modules installed"
    else
        check_fail "node_modules missing"
    fi

    if [ -f "$SCRIPT_DIR/.env" ]; then
        check_pass ".env configured"
    else
        check_warn ".env missing (using defaults)"
    fi

    if [ -f "$SCRIPT_DIR/ospf-tempo-x.sh" ]; then
        check_pass "ospf-tempo-x.sh script exists"
    else
        check_warn "ospf-tempo-x.sh not found"
    fi
}

validate_database() {
    echo -e "${BLUE}[7/7] Checking Database...${NC}"

    if command -v psql &> /dev/null; then
        if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "ospf_tempo_x"; then
            check_pass "Database 'ospf_tempo_x' exists"
        else
            check_warn "Database 'ospf_tempo_x' not found"
        fi
    else
        check_warn "psql not available - skipping database check"
    fi
}

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
show_summary() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                      VALIDATION SUMMARY                        ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}  $PASS"
    echo -e "  ${RED}Failed:${NC}  $FAIL"
    echo -e "  ${YELLOW}Warnings:${NC} $WARN"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "  ${GREEN}Overall Status: HEALTHY${NC}"
        echo ""
        echo -e "  ${CYAN}Access URLs:${NC}"
        echo -e "    Frontend: http://localhost:$FRONTEND_PORT"
        echo -e "    API:      http://localhost:$BACKEND_PORT"
        echo -e "    Health:   http://localhost:$BACKEND_PORT/api/health"
        return 0
    else
        echo -e "  ${RED}Overall Status: UNHEALTHY${NC}"
        echo ""
        echo -e "  ${YELLOW}Troubleshooting:${NC}"
        echo -e "    ./ospf-tempo-x.sh stop && ./ospf-tempo-x.sh start"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    log_header
    validate_ports
    validate_frontend
    validate_api_health
    validate_auth_config
    validate_cors
    validate_files
    validate_database
    show_summary
}

main "$@"
