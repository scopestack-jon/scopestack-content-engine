# ScopeStack Integration Documentation

## Overview

The Content Engine now includes comprehensive integration with the ScopeStack API, enabling automatic creation of projects, surveys, and documents from generated content.

## Features

### Complete Project Creation Workflow
1. **Authentication**: Secure API token-based authentication
2. **Client Management**: Automatic client creation or selection
3. **Project Creation**: Full project setup with services and executive summary
4. **Survey Integration**: Optional survey creation and calculation
5. **Document Generation**: Automatic SOW document creation
6. **Pricing Calculation**: Retrieves project pricing after setup

### Data Transformation
- Questions → Survey Responses
- Services → Project Services with detailed descriptions
- Sources → Executive Summary generation
- Calculations → Project metrics

### Error Handling
- Retry logic with exponential backoff
- Graceful degradation for optional features
- Detailed error reporting
- Warning collection for non-critical issues

## Setup

### 1. Environment Configuration

Copy the example environment file and add your credentials:

```bash
cp .env.scopestack.example .env.local
```

Edit `.env.local` with your ScopeStack API credentials:

```env
SCOPESTACK_API_TOKEN=your-api-token-here
NEXT_PUBLIC_SCOPESTACK_API_TOKEN=your-api-token-here
SCOPESTACK_ACCOUNT_SLUG=your-account-slug  # Optional
```

### 2. API Token

Get your API token from ScopeStack:
1. Log into your ScopeStack account
2. Navigate to Settings → API Access
3. Create or copy your API token

## Usage

### API Endpoint

**POST** `/api/push-to-scopestack`

### Request Format

```json
{
  "content": {
    "technology": "Azure Cloud Infrastructure",
    "questions": [...],
    "services": [...],
    "calculations": [...],
    "sources": [...],
    "totalHours": 260
  },
  "clientName": "Acme Corporation",  // Optional
  "projectName": "Cloud Migration Project",  // Optional
  "questionnaireTags": ["cloud", "azure"],  // Optional
  "skipSurvey": false,  // Optional
  "skipDocument": false  // Optional
}
```

### Response Format

```json
{
  "success": true,
  "project": {
    "id": "12345",
    "name": "Cloud Migration Project",
    "status": "draft",
    "url": "https://app.scopestack.io/mycompany/projects/12345",
    "executiveSummary": "...",
    "pricing": {
      "revenue": 50000,
      "cost": 30000,
      "margin": 40
    }
  },
  "client": {
    "id": "67890",
    "name": "Acme Corporation"
  },
  "survey": {
    "id": "11111",
    "name": "Cloud Migration Survey",
    "status": "completed"
  },
  "document": {
    "id": "22222",
    "url": "https://documents.scopestack.io/...",
    "status": "finished"
  },
  "metadata": {
    "technology": "Azure Cloud Infrastructure",
    "totalHours": 260,
    "serviceCount": 5,
    "questionCount": 10,
    "sourceCount": 3,
    "generatedAt": "2024-01-01T12:00:00Z"
  },
  "warnings": []  // Optional warnings for non-critical issues
}
```

## Testing

### Run Integration Test

1. Ensure your environment variables are set:
```bash
export SCOPESTACK_API_TOKEN=your-token-here
```

2. Start the development server:
```bash
npm run dev
```

3. Run the test script:
```bash
node test-scopestack-integration.js
```

### Test Options

Edit `test-scopestack-integration.js` to customize:
- `clientName`: Test client name
- `projectName`: Test project name
- `skipSurvey`: Skip survey creation
- `skipDocument`: Skip document generation

## API Service Methods

The `ScopeStackApiService` class provides these methods:

### Authentication
- `getCurrentUser()`: Get authenticated user details

### Client Management
- `searchClients(searchTerm)`: Search for existing clients
- `createClient(name, accountId)`: Create new client

### Project Operations
- `createProject(projectData)`: Create new project
- `addServicesToProject(projectId, services)`: Add services
- `updateProjectExecutiveSummary(projectId, summary)`: Update summary
- `getProjectDetails(projectId)`: Get project with pricing

### Survey Operations
- `getQuestionnaires(tag?)`: Get available questionnaires
- `createSurvey(projectId, questionnaireId, data)`: Create survey
- `calculateSurvey(surveyId)`: Calculate recommendations
- `applySurveyRecommendations(surveyId)`: Apply recommendations

### Document Operations
- `getDocumentTemplates()`: Get available templates
- `createProjectDocument(projectId, templateId?)`: Generate document

## Error Handling

### Retry Logic

The integration includes automatic retry for transient failures:
- Network errors (ECONNREFUSED, ETIMEDOUT)
- Server errors (500, 502, 503, 504)
- Rate limiting (429)

### Non-Retryable Errors
- Authentication failures (401)
- Permission errors (403)
- Validation errors (400)
- Not found errors (404)

### Graceful Degradation

Optional features that fail will not block the main workflow:
- Survey creation can fail without blocking project creation
- Document generation can fail without blocking the response
- Pricing retrieval can fail with fallback to basic project data

## Best Practices

1. **API Token Security**: Never commit API tokens to version control
2. **Client Reuse**: The integration automatically searches for existing clients
3. **Error Monitoring**: Check the `warnings` array in responses
4. **Timeout Handling**: Long operations (document generation) have extended timeouts
5. **Rate Limiting**: Retry logic handles rate limit responses automatically

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API token is correct
   - Check token has not expired
   - Ensure token has necessary permissions

2. **Client Creation Failed**
   - Check account permissions
   - Verify account ID is correct
   - Ensure client name is unique

3. **Document Generation Timeout**
   - Document generation can take 30-60 seconds
   - Check ScopeStack status page for issues
   - Retry after a few minutes

4. **Survey Not Created**
   - Verify questionnaires exist with matching tags
   - Check questionnaire permissions
   - Ensure survey responses format is correct

### Debug Mode

Enable detailed logging by setting:
```javascript
console.log = console.error; // Redirect all logs to stderr
```

## Architecture

```
Content Engine
    ↓
[Transform Data]
    ↓
ScopeStack API Service
    ↓
[Authenticate]
    ↓
[Find/Create Client]
    ↓
[Create Project]
    ↓
[Create Survey] (optional)
    ↓
[Generate Document] (optional)
    ↓
[Return Results]
```

## Files Created

1. **`lib/scopestack-api-service.ts`**: Main API service class
2. **`lib/scopestack-retry-wrapper.ts`**: Retry logic utilities
3. **`app/api/push-to-scopestack/route.ts`**: API endpoint (basic)
4. **`app/api/push-to-scopestack/route.enhanced.ts`**: API endpoint (with full error handling)
5. **`test-scopestack-integration.js`**: Integration test script
6. **`.env.scopestack.example`**: Environment variables template

## Next Steps

1. Add frontend UI for triggering push to ScopeStack
2. Implement webhook support for async operations
3. Add batch processing for multiple projects
4. Create progress tracking for long operations
5. Add support for custom questionnaire mapping