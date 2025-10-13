#!/bin/bash

# Production Import - Quick Start Script
# This script will log in as admin and trigger the Google Sheets import

BACKEND_URL="https://clyne-paper-crm-backend.fly.dev"

echo "🔐 Logging in as admin..."
echo ""

# You need to replace these with your actual admin credentials
read -p "Enter admin email: " ADMIN_EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
echo ""

# Login to get token
echo "🔑 Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

# Extract token using jq (or manual parsing if jq not available)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Check status
echo "🔍 Checking import service status..."
STATUS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/admin-import/status" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# Trigger import
read -p "⚠️  Proceed with import? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Import cancelled"
  exit 0
fi

echo ""
echo "🚀 Triggering Google Sheets import..."
IMPORT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/admin-import/google-sheets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$IMPORT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$IMPORT_RESPONSE"
echo ""

echo "📊 Monitor progress with:"
echo "   fly logs -a clyne-paper-crm-backend"
echo ""
echo "✅ Done!"
