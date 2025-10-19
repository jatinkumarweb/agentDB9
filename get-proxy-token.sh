#!/bin/bash

BACKEND_URL="http://localhost:8000"

echo "=== Get JWT Token for Proxy Access ==="
echo ""

# Check if email and password provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <email> <password>"
  echo ""
  echo "Example:"
  echo "  $0 user@example.com password123"
  echo ""
  echo "Or set as environment variables:"
  echo "  export PROXY_EMAIL=user@example.com"
  echo "  export PROXY_PASSWORD=password123"
  echo "  $0"
  exit 1
fi

EMAIL="${1:-$PROXY_EMAIL}"
PASSWORD="${2:-$PROXY_PASSWORD}"

echo "Logging in as: $EMAIL"
echo ""

# Login and extract token
RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check if jq is available
if command -v jq &> /dev/null; then
  TOKEN=$(echo "$RESPONSE" | jq -r '.token // .access_token // empty')
else
  # Fallback: extract token without jq
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  if [ -z "$TOKEN" ]; then
    TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  fi
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed!"
  echo ""
  echo "Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""
echo "JWT Token:"
echo "$TOKEN"
echo ""
echo "---"
echo ""
echo "Export to environment:"
echo "  export PROXY_TOKEN='$TOKEN'"
echo ""
echo "Test proxy access:"
echo "  curl -H \"Authorization: Bearer \$PROXY_TOKEN\" $BACKEND_URL/proxy/3000/"
echo ""
echo "Or use in browser console:"
echo "  localStorage.setItem('token', '$TOKEN');"
echo ""

# Auto-export if sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  export PROXY_TOKEN="$TOKEN"
  echo "✅ Token exported to \$PROXY_TOKEN"
fi
