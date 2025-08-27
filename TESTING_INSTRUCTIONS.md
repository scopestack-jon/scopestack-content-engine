# Testing ScopeStack Integration Locally

## Current Status ✅

The ScopeStack integration is fully implemented and ready for testing. The local server is running and the API endpoint is working correctly.

## Setup Instructions

### 1. Prerequisites
- Node.js installed
- ScopeStack account with API access
- API token from ScopeStack

### 2. Get Your ScopeStack API Token

1. Log into your ScopeStack account: https://app.scopestack.io
2. Navigate to **Settings → API Access**
3. Create or copy your API token

### 3. Configure Environment Variables

```bash
# Copy the template file
cp .env.local.test .env.local

# Edit .env.local and add your token
# Replace YOUR_TOKEN_HERE with your actual token
```

Your `.env.local` should look like:
```env
SCOPESTACK_API_TOKEN=ss_live_abc123xyz789...
NEXT_PUBLIC_SCOPESTACK_API_TOKEN=ss_live_abc123xyz789...
```

### 4. Restart the Development Server

```bash
# Stop the current server (Ctrl+C)
# Start it again with the new environment variables
npm run dev
```

### 5. Run the Integration Test

```bash
# This will create a real project in your ScopeStack account
node test-scopestack-integration.js
```

## What the Test Does

The integration test will:

1. **Authenticate** with ScopeStack using your API token
2. **Create a test client** (or find existing one)
3. **Create a project** with:
   - 5 Azure cloud services
   - Executive summary
   - Total of 260 hours
4. **Create a survey** (if questionnaires are available)
5. **Generate a document** (SOW)
6. **Return the project URL** for you to review in ScopeStack

## Expected Output

```
🚀 Starting ScopeStack Integration Test
==================================================

📦 Sending test content to ScopeStack API...
  - Technology: Azure Cloud Infrastructure
  - Services: 5
  - Questions: 4
  - Total Hours: 260
  - Client Name: Test Client 2024-01-01
  - Project Name: Azure Migration Project - Test 1234567890

✅ Success! Operation completed in 45.23 seconds
==================================================

📋 Project Details:
  - ID: 12345
  - Name: Azure Migration Project - Test 1234567890
  - Status: draft
  - URL: https://app.scopestack.io/yourcompany/projects/12345

💰 Pricing:
  - Revenue: $50000
  - Cost: $30000
  - Margin: 40%

👤 Client:
  - ID: 67890
  - Name: Test Client 2024-01-01

📊 Survey:
  - ID: 11111
  - Name: Azure Migration Project Survey
  - Status: completed

📄 Document:
  - ID: 22222
  - Status: finished
  - URL: https://documents.scopestack.io/...

==================================================
🎉 Integration test completed successfully!

💾 Full response saved to: test-result-1234567890.json
```

## Testing Without Credentials

To test the setup without credentials:

```bash
# This verifies the endpoint is working
node test-local-setup.js
```

This will confirm:
- ✅ API endpoint is accessible
- ✅ Content validation is working
- ✅ Error handling is functioning

## Manual Testing via HTTP

You can also test manually using curl:

```bash
# Test without token (should fail with 400)
curl -X POST http://localhost:3000/api/push-to-scopestack \
  -H "Content-Type: application/json" \
  -d '{"content":{"technology":"Test","questions":[],"services":[{"name":"Test Service","description":"Test","hours":10}],"sources":[],"totalHours":10}}'
```

## Customizing the Test

Edit `test-scopestack-integration.js` to customize:

```javascript
const testOptions = {
  clientName: "Your Client Name",
  projectName: "Your Project Name",
  questionnaireTags: ["technology", "cloud"],
  skipSurvey: false,     // Set to true to skip survey
  skipDocument: false    // Set to true to skip document
};
```

## Troubleshooting

### "API token not configured"
- Make sure `.env.local` file exists
- Verify the token is correct
- Restart the dev server after adding the token

### "Connection refused"
- Ensure the dev server is running: `npm run dev`
- Check it's running on port 3000

### "Authentication failed"
- Verify your API token is valid
- Check token permissions in ScopeStack
- Ensure token hasn't expired

### "Client creation failed"
- Check your ScopeStack account permissions
- Verify you can create clients in the UI

## Using with Real Content

To push actual generated content from the Content Engine:

1. Generate content using the main app
2. Click "Push to ScopeStack" button (when implemented in UI)
3. Or call the API directly with generated content

## API Endpoint Details

**Endpoint:** `POST /api/push-to-scopestack`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "content": {
    "technology": "string",
    "questions": [...],
    "services": [...],
    "calculations": [...],
    "sources": [...],
    "totalHours": number
  },
  "clientName": "optional string",
  "projectName": "optional string",
  "questionnaireTags": ["optional", "array"],
  "skipSurvey": false,
  "skipDocument": false
}
```

## Next Steps

After successful testing:

1. **Add UI Button**: Implement a "Push to ScopeStack" button in the content output component
2. **Settings Page**: Add ScopeStack configuration to the settings page
3. **Progress Tracking**: Show real-time progress during the push operation
4. **Error Recovery**: Implement retry UI for failed operations
5. **Batch Operations**: Support pushing multiple projects at once

## Support

- Check the logs in the terminal running `npm run dev`
- Review `SCOPESTACK_INTEGRATION.md` for detailed documentation
- Check ScopeStack API documentation: https://api.scopestack.io/docs