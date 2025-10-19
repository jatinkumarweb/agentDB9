#!/bin/bash

echo "🧪 Testing Bundle.js Loading Through Proxy"
echo "==========================================="
echo ""

PORT="${1:-3000}"

echo "Testing port: $PORT"
echo ""

echo "1️⃣  Testing main page:"
RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:8000/proxy/$PORT/" 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Main page loads"
  
  # Check for script tags
  if echo "$BODY" | grep -q "static/js/bundle.js\|static/js/main.js\|src/main.tsx\|src/main.jsx"; then
    echo "   ✅ JavaScript references found in HTML"
    
    # Extract script path
    SCRIPT_PATH=$(echo "$BODY" | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
    if [ -n "$SCRIPT_PATH" ]; then
      echo "   📄 Script path: $SCRIPT_PATH"
    fi
  else
    echo "   ⚠️  No JavaScript references found"
  fi
else
  echo "   ❌ Main page failed to load"
fi

echo ""
echo "2️⃣  Testing bundle.js directly:"

# Try common bundle paths
BUNDLE_PATHS=(
  "static/js/bundle.js"
  "static/js/main.js"
  "assets/index.js"
  "src/main.tsx"
)

for BUNDLE_PATH in "${BUNDLE_PATHS[@]}"; do
  echo -n "   Testing /$BUNDLE_PATH: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{content_type}" "http://localhost:8000/proxy/$PORT/$BUNDLE_PATH" 2>&1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
  CONTENT_TYPE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -2)
  
  if [ "$HTTP_CODE" = "200" ]; then
    if echo "$CONTENT_TYPE" | grep -q "javascript\|ecmascript"; then
      echo "✅ OK (MIME: $CONTENT_TYPE)"
      
      # Show first line of JS
      FIRST_LINE=$(echo "$BODY" | head -1 | cut -c1-60)
      echo "      Preview: $FIRST_LINE..."
      break
    else
      echo "❌ Wrong MIME type: $CONTENT_TYPE"
      if echo "$BODY" | grep -q "<html\|<!DOCTYPE"; then
        echo "      (Returning HTML - likely 404 page)"
      fi
    fi
  else
    echo "❌ Status $HTTP_CODE"
  fi
done

echo ""
echo "3️⃣  Checking PUBLIC_URL configuration:"
echo ""
echo "   In vscode container, dev server should have:"
echo "   export PUBLIC_URL=\"/\""
echo ""
echo "   NOT:"
echo "   export PUBLIC_URL=\"/proxy/$PORT\""
echo ""
echo "   The proxy handles the /proxy/$PORT/ prefix."
echo ""

echo "4️⃣  If bundle.js still shows MIME type error:"
echo ""
echo "   ❌ Problem: Dev server configured with wrong PUBLIC_URL"
echo ""
echo "   ✅ Solution:"
echo "   1. In vscode terminal: cd /home/coder/workspace/your-project"
echo "   2. Stop current dev server (Ctrl+C)"
echo "   3. Start with correct PUBLIC_URL:"
echo "      PUBLIC_URL=\"/\" npm start"
echo "   4. Test again: http://localhost:8000/proxy/$PORT/"
echo ""

echo "5️⃣  Backend logs to check:"
echo "   Look for:"
echo "   - 'Trying: http://vscode:$PORT/static/js/bundle.js'"
echo "   - 'Response status: 200'"
echo "   - 'Response content-type: application/javascript'"
echo ""
