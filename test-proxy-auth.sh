#!/bin/bash

echo "=== Testing Proxy Authentication ==="
echo ""

BACKEND_URL="http://localhost:8000"

echo "✅ Correct proxy URL: $BACKEND_URL/proxy/3000/"
echo "❌ Wrong URL (vscode): http://localhost:8080/proxy/3000/"
echo ""
echo "---"
echo ""

echo "1. Testing proxy WITHOUT authentication (should fail with 401):"
echo "   Command: curl -i $BACKEND_URL/proxy/3000/"
echo ""
curl -i "$BACKEND_URL/proxy/3000/" 2>&1 | head -20
echo ""
echo "---"
echo ""

echo "2. Testing proxy WITH authentication:"
echo ""
echo "   Step 1: Login and get JWT token"
echo "   Command: curl -X POST $BACKEND_URL/api/auth/login \\"
echo "            -H 'Content-Type: application/json' \\"
echo "            -d '{\"email\":\"user@example.com\",\"password\":\"password\"}'"
echo ""
echo "   Step 2: Use token to access proxy"
echo "   Command: curl -H \"Authorization: Bearer \$TOKEN\" $BACKEND_URL/proxy/3000/"
echo ""
echo "---"
echo ""

echo "3. Quick test (if you have a token):"
echo "   export TOKEN='your-jwt-token-here'"
echo "   curl -H \"Authorization: Bearer \$TOKEN\" $BACKEND_URL/proxy/3000/"
echo ""
