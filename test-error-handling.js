/**
 * Test script to verify error handling in the ScopeStack Content Engine
 * 
 * This script simulates different error scenarios to test the app's error handling.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORTS = [3000, 3001, 3002, 3003, 3004];
let BASE_URL = null;

// Helper function to run curl commands
function runCurl(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

// Test 1: Find which port the app is running on
function findAppPort() {
  console.log('\n--- Test 1: Find which port the app is running on ---');
  
  for (const port of PORTS) {
    const url = `http://localhost:${port}`;
    console.log(`Trying ${url}...`);
    
    const result = runCurl(`curl -s ${url} -o /dev/null -w "%{http_code}" -H "Accept: text/html"`);
    
    if (result.success && result.output.trim() === '200') {
      console.log(`✅ App is running on port ${port}`);
      BASE_URL = url;
      return true;
    }
  }
  
  console.error('❌ App is not running on any of the tested ports');
  return false;
}

// Test 2: Verify that the research API endpoint responds to valid requests
function testResearchApiWithValidRequest() {
  console.log('\n--- Test 2: Verify research API with valid request ---');
  
  if (!BASE_URL) {
    console.error('❌ Cannot test API: App URL not found');
    return false;
  }
  
  const requestBody = JSON.stringify({
    input: 'Test input',
    models: {
      research: 'anthropic/claude-3.5-sonnet',
      analysis: 'openai/gpt-4-turbo',
      content: 'anthropic/claude-3.5-sonnet',
      format: 'openai/gpt-4o',
    },
    prompts: {}
  });
  
  const result = runCurl(`curl -s -X POST ${BASE_URL}/api/research -H "Content-Type: application/json" -d '${requestBody}' -w "%{http_code}" -o /dev/null`);
  
  if (result.success) {
    console.log(`✅ Research API responded with status code: ${result.output}`);
    return true;
  } else {
    console.error('❌ Research API request failed');
    console.error(`Error: ${result.error}`);
    return false;
  }
}

// Test 3: Verify that the research API handles invalid requests properly
function testResearchApiWithInvalidRequest() {
  console.log('\n--- Test 3: Verify research API with invalid request ---');
  
  if (!BASE_URL) {
    console.error('❌ Cannot test API: App URL not found');
    return false;
  }
  
  // Invalid request with missing required field (input)
  const requestBody = JSON.stringify({
    models: {
      research: 'anthropic/claude-3.5-sonnet',
    },
    prompts: {}
  });
  
  const result = runCurl(`curl -s -X POST ${BASE_URL}/api/research -H "Content-Type: application/json" -d '${requestBody}' -w "%{http_code}" -o /dev/null`);
  
  if (result.success && result.output.trim() === '400') {
    console.log('✅ Research API correctly returned 400 status code for invalid request');
    return true;
  } else {
    console.log(`⚠️ Research API returned ${result.output} instead of 400 for invalid request`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('Starting ScopeStack Content Engine error handling tests...');
  
  const appFound = findAppPort();
  
  const testResults = [
    appFound,
    appFound ? testResearchApiWithValidRequest() : false,
    appFound ? testResearchApiWithInvalidRequest() : false
  ];
  
  const passedTests = testResults.filter(Boolean).length;
  const totalTests = testResults.length;
  
  console.log(`\n--- Test Summary ---`);
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed! Error handling is working correctly.');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} tests failed. Check the logs above for details.`);
  }
}

// Execute tests
runAllTests(); 