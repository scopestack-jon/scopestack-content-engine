# ScopeStack Content Engine - Testing Guide

This document provides instructions for testing the ScopeStack Content Engine application.

## Prerequisites

- Node.js 18+ installed
- An OpenRouter API key (get one from [openrouter.ai/keys](https://openrouter.ai/keys))
- Optional: ScopeStack integration credentials (URL and API token)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your OpenRouter API key as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your-api-key-here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Automated Testing

We've included several test scripts that validate the functionality of the application:

```bash
# Basic functionality test
node test-app.js

# Skip OpenRouter API connection test
export SKIP_OPENROUTER_TEST=true && node test-app.js

# Error handling test
node test-error-handling.js
```

The test scripts check:
1. If the API route files exist and contain required functions
2. If the OpenRouter API connection works (can be skipped)
3. If the main page loads correctly
4. If the settings page loads correctly
5. If error handling works correctly (test-error-handling.js)

### Error Handling Tests

The `test-error-handling.js` script specifically tests the application's error handling capabilities:

1. Finds which port the app is running on (tries ports 3000-3004)
2. Tests that the research API responds correctly to valid requests
3. Tests that the research API returns appropriate error codes for invalid requests

Run this test after making changes to error handling code to ensure everything works as expected:

```bash
node test-error-handling.js
```

## Manual Testing

### Basic Functionality

1. Open the application in your browser at http://localhost:3000
2. Enter a technology solution in the input field (e.g., "Microsoft Email Migration to Office 365 for a Hospital with 1000 users")
3. Click "Generate Content"
4. Verify that the research process starts and progresses through the steps:
   - Parsing Technology Requirements
   - Conducting Live Web Research
   - Analyzing Research Findings
   - Generating Content Structure
   - Formatting for ScopeStack
5. Once complete, verify that the generated content appears with:
   - Discovery Questions
   - Calculations
   - Service Structure
   - Sources

### Settings Configuration

1. Navigate to the Settings page by clicking the "Settings" button
2. Test OpenRouter Configuration:
   - Enter your OpenRouter API key
   - Select different models for each step of the research process
   - Save settings
   - Return to the main page and generate content to verify the selected models are used
3. Test Custom Prompts:
   - Modify the prompts for each step
   - Save settings
   - Generate content to verify the custom prompts are used
4. Test ScopeStack Integration:
   - Enter your ScopeStack URL and API token
   - Click "Test Connection" to verify the connection works
   - Generate content and click "Push to ScopeStack" to verify the integration works

### Content Generation Features

1. Test with different types of technology solutions:
   - Network infrastructure (e.g., "Cisco ISE implementation for 500-user healthcare organization")
   - Cloud migration (e.g., "AWS migration for a financial services company with 2000 users")
   - Software implementation (e.g., "Salesforce implementation for retail company with 300 users")
2. Verify the generated content includes:
   - Accurate technology identification
   - Relevant discovery questions with options
   - Appropriate service structure with phases
   - Realistic hour estimates
   - Valid sources with URLs

### Edge Cases

1. Test with very short input (e.g., "Office 365")
2. Test with very long, detailed input
3. Test with non-technology input to see how the system handles it
4. Test the reset functionality to clear generated content
5. Test browser refresh to verify that content is preserved via localStorage

### Error Handling

1. Test with invalid API requests:
   - Try submitting an empty input field
   - Verify that appropriate error messages are shown
   - Check that the UI correctly shows error states

2. Test network error handling:
   - Disconnect from the internet and try generating content
   - Verify that appropriate error messages are shown
   - Check that the application doesn't crash

3. Test API error handling:
   - Modify your OpenRouter API key to be invalid
   - Try generating content
   - Verify that the error is properly caught and displayed to the user
   - Check that the research steps show the error state correctly

4. Test stream interruption:
   - Start content generation and then close/refresh the browser tab
   - Reopen the application and verify it's in a stable state
   - Check that you can start a new generation process

## Troubleshooting

### Common Issues

1. **OpenRouter API Connection Fails**
   - Verify your API key is correct
   - Check if you have sufficient credits in your OpenRouter account
   - Try a different model if one is unavailable

2. **Content Generation Fails**
   - Check the browser console for errors
   - Verify that the route.ts file contains all required functions (cleanAIResponse, fixUrlsInJson)
   - Try a simpler input query

3. **ScopeStack Integration Fails**
   - Verify your ScopeStack URL and API token
   - Check if your ScopeStack instance is accessible
   - Verify that the content format matches what ScopeStack expects

### Debug Mode

The application includes a debug button that logs information to the console:

1. Click the "Debug" button on the main page
2. Open your browser's developer tools (F12 or Cmd+Option+I)
3. Check the console for debug information

## Reporting Issues

If you encounter any issues that you cannot resolve, please report them with:

1. A description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser and OS information
6. Any error messages or console logs

## Performance Considerations

- Content generation can take 1-3 minutes depending on the complexity of the request
- The application uses Server-Sent Events (SSE) to stream progress updates
- OpenRouter API calls may have rate limits depending on your subscription 