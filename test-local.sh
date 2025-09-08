#!/bin/bash

# Test script for local development
# Tests the research API without OAuth

echo "🧪 Testing Research API Locally"
echo "================================"
echo ""

# Test with POST request
echo "Testing with POST request..."
curl -X POST http://localhost:3002/api/research-test \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Office 365 migration for 100 mailboxes and 50 users"
  }' | python3 -m json.tool

echo ""
echo "================================"
echo "✅ Test complete!"
echo ""
echo "You can also test in your browser:"
echo "http://localhost:3002/api/research-test?q=Office+365+migration+for+100+mailboxes"