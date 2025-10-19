#!/bin/bash

echo "=== Testing Proxy Authentication ==="
echo ""

BACKEND_URL="http://localhost:8000"

echo "1. Testing proxy WITHOUT authentication (should fail with 401):"
curl -i "$BACKEND_URL/proxy/3000/" 2>&1 | head -20
echo ""
echo "---"
echo ""

echo "2. Testing proxy WITH authentication (need valid JWT token):"
echo "   First, you need to login and get a token."
echo "   Example:"
echo "   TOKEN=\$(curl -s -X POST $BACKEND_URL/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"user@example.com\",\"password\":\"password\"}' | jq -r '.token')"
echo ""
echo "   Then test proxy:"
echo "   curl -H \"Authorization: Bearer \$TOKEN\" $BACKEND_URL/proxy/3000/"
echo ""
