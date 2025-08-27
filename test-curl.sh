#!/bin/bash

# Quick curl test for ScopeStack integration
# This tests the API endpoint with minimal valid content

echo "🧪 Testing ScopeStack API endpoint..."
echo "===================================="
echo ""

# Test with minimal valid content (will fail without token)
curl -X POST http://localhost:3000/api/push-to-scopestack \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "technology": "Test Technology",
      "questions": [
        {
          "text": "Sample question?",
          "type": "text",
          "required": true
        }
      ],
      "services": [
        {
          "name": "Test Service",
          "description": "A test service description",
          "hours": 10
        }
      ],
      "sources": [
        {
          "url": "https://example.com",
          "title": "Test Source",
          "summary": "Test summary",
          "credibility": "high",
          "relevance": 0.9,
          "sourceType": "documentation"
        }
      ],
      "calculations": [],
      "totalHours": 10
    },
    "clientName": "Test Client",
    "projectName": "Test Project"
  }' | python3 -m json.tool

echo ""
echo "===================================="
echo "✅ Test complete!"
echo ""
echo "Expected result without token:"
echo "  - Status 400"
echo "  - Error: 'ScopeStack API token not configured'"
echo ""
echo "To test with real credentials:"
echo "  1. Add your token to .env.local"
echo "  2. Restart the dev server"
echo "  3. Run this test again"