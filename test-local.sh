#!/bin/bash

# WeddingFlow Pro - Local Testing Script
# Tests all critical endpoints and functionality

echo "🧪 WeddingFlow Pro - Local Testing Suite"
echo "========================================"
echo ""

BASE_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $response)"
        ((FAILED++))
    fi
}

# Function to test JSON endpoint
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3

    echo -n "Testing $name... "

    response=$(curl -s "$url" 2>&1)

    if echo "$response" | grep -q "$expected_key"; then
        echo -e "${GREEN}✓ PASS${NC} (Found '$expected_key')"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Key '$expected_key' not found)"
        echo "  Response: $(echo $response | head -c 100)..."
        ((FAILED++))
    fi
}

echo "📡 Testing Core Endpoints"
echo "-------------------------"
test_json_endpoint "Health Check" "$BASE_URL/api/health" "status"
test_endpoint "Home Page (Redirects to /en)" "$BASE_URL/" "307"
test_endpoint "Localized Home (/en)" "$BASE_URL/en" "200"
test_endpoint "Manifest" "$BASE_URL/manifest.webmanifest" "200"
test_endpoint "Robots.txt" "$BASE_URL/robots.txt" "200"
test_endpoint "Sitemap" "$BASE_URL/sitemap.xml" "200"

echo ""
echo "🔐 Testing Authentication Routes"
echo "--------------------------------"
test_endpoint "Sign In Page" "$BASE_URL/en/sign-in" "200"
test_endpoint "Sign Up Page" "$BASE_URL/en/sign-up" "200"

echo ""
echo "🎯 Testing Protected Routes (Should Redirect)"
echo "--------------------------------------------"
test_endpoint "Dashboard (Requires Auth)" "$BASE_URL/en/dashboard" "307"
test_endpoint "Clients (Requires Auth)" "$BASE_URL/en/dashboard/clients" "307"
test_endpoint "Settings (Requires Auth)" "$BASE_URL/en/settings" "307"

echo ""
echo "🌐 Testing Internationalization"
echo "-------------------------------"
test_endpoint "English (en)" "$BASE_URL/en" "200"
test_endpoint "Spanish (es)" "$BASE_URL/es" "200"
test_endpoint "French (fr)" "$BASE_URL/fr" "200"
test_endpoint "German (de)" "$BASE_URL/de" "200"
test_endpoint "Japanese (ja)" "$BASE_URL/ja" "200"

echo ""
echo "📊 Testing API Routes"
echo "--------------------"
test_json_endpoint "tRPC Router" "$BASE_URL/api/trpc/users.list" "error"
test_endpoint "Email Send (POST)" "$BASE_URL/api/email/send" "405"
test_endpoint "SMS Send (POST)" "$BASE_URL/api/sms/send" "405"

echo ""
echo "🎨 Testing Static Assets"
echo "------------------------"
test_endpoint "PWA Service Worker" "$BASE_URL/sw.js" "200"

echo ""
echo "========================================"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
