#!/bin/bash
# Mossy Backend Connection Test Script

echo "==================================="
echo "Mossy Backend Connection Test"
echo "==================================="
echo ""

# Test 1: Local Backend
echo "Test 1: Local Backend (http://localhost:8787)"
echo "-------------------------------------------"
if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "✅ Local backend is accessible"
    echo "Response:"
    curl -s http://localhost:8787/health | jq '.'
else
    echo "❌ Local backend is not accessible"
    echo "Start it with: npm run backend:start"
fi
echo ""

# Test 2: Render Backend
echo "Test 2: Render Backend (https://mossy.onrender.com)"
echo "---------------------------------------------------"
if curl -s --connect-timeout 5 https://mossy.onrender.com/health > /dev/null 2>&1; then
    echo "✅ Render backend is accessible"
    echo "Response:"
    curl -s https://mossy.onrender.com/health | jq '.'
else
    echo "❌ Render backend is not accessible"
    echo "   - May need deployment"
    echo "   - May be in sleep mode (free tier)"
    echo "   - May have different URL"
fi
echo ""

# Test 3: Chat Endpoint (Local)
echo "Test 3: Chat Endpoint Test (Local)"
echo "-----------------------------------"
if command -v curl &> /dev/null && curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "Sending test message to chat endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:8787/v1/chat \
      -H "Content-Type: application/json" \
      -d '{"messages":[{"role":"user","content":"Hello Mossy, are you working?"}],"model":"test"}')
    
    if echo "$RESPONSE" | grep -q "error"; then
        echo "⚠️  Backend responded but returned an error:"
        echo "$RESPONSE" | jq '.'
        echo "   - This is expected if API keys are not configured"
    else
        echo "✅ Chat endpoint working!"
        echo "$RESPONSE" | jq '.'
    fi
else
    echo "❌ Cannot test - local backend not running"
fi
echo ""

# Summary
echo "==================================="
echo "Summary"
echo "==================================="
echo ""
echo "Backend Configuration:"
echo "  - MOSSY_BACKEND_URL from .env.local: $(grep MOSSY_BACKEND_URL .env.local 2>/dev/null | cut -d= -f2)"
echo "  - Local backend status: $(curl -s http://localhost:8787/health > /dev/null 2>&1 && echo 'Running' || echo 'Not running')"
echo "  - Render backend status: $(curl -s --connect-timeout 5 https://mossy.onrender.com/health > /dev/null 2>&1 && echo 'Accessible' || echo 'Not accessible')"
echo ""
echo "To start local backend: npm run backend:start"
echo "To start Mossy app: npm run dev"
echo ""
