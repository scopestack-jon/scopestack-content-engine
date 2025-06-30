/**
 * Test script for ScopeStack Content Engine
 * 
 * This script helps validate the app's functionality by running curl commands to test the API endpoints.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const SAMPLE_INPUT = 'Microsoft Email Migration to Office 365 for a Hospital with 1000 users';
const SKIP_OPENROUTER_TEST = process.env.SKIP_OPENROUTER_TEST === 'true';

// Run a curl command and return the output
function runCurl(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

// Test OpenRouter API connection
function testOpenRouterConnection() {
  console.log('Testing OpenRouter API connection...');
  
  if (SKIP_OPENROUTER_TEST) {
    console.log('⚠️ Skipping OpenRouter connection test (SKIP_OPENROUTER_TEST=true)');
    return true;
  }
  
  const command = `curl -s -X POST ${BASE_URL}/api/test-openrouter \
    -H "Content-Type: application/json" \
    -d '{"apiKey": "${OPENROUTER_API_KEY}"}'`;
  
  const result = runCurl(command);
  
  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      if (data.success) {
        console.log('✅ OpenRouter connection successful');
        return true;
      } else {
        console.error('❌ OpenRouter connection failed:', data.error);
        return false;
      }
    } catch (e) {
      console.error('❌ Failed to parse OpenRouter test response:', e.message);
      console.error('Response:', result.output);
      return false;
    }
  } else {
    console.error('❌ OpenRouter test error:', result.error);
    if (result.stdout) console.error('stdout:', result.stdout);
    if (result.stderr) console.error('stderr:', result.stderr);
    return false;
  }
}

// Test the API route.ts file directly
function testApiRouteFile() {
  console.log('Testing API route file...');
  
  // Check if the route.ts file exists
  const routeFilePath = path.join(__dirname, 'app', 'api', 'research', 'route.ts');
  if (!fs.existsSync(routeFilePath)) {
    console.error('❌ API route file not found:', routeFilePath);
    return false;
  }
  
  console.log('✅ API route file exists');
  
  // Check if the fixUrlsInJson function is used
  const routeContent = fs.readFileSync(routeFilePath, 'utf8');
  if (!routeContent.includes('fixUrlsInJson')) {
    console.error('❌ fixUrlsInJson function not found in route.ts');
    console.log('This function should be defined to fix URL formatting issues in JSON responses.');
    
    // Check for alternative files
    const backupFiles = [
      'route.ts.bak',
      'route.ts.clean',
      'route.ts.original',
      'route.ts.new'
    ];
    
    for (const backupFile of backupFiles) {
      const backupPath = path.join(__dirname, 'app', 'api', 'research', backupFile);
      if (fs.existsSync(backupPath)) {
        console.log(`Found backup file: ${backupFile}`);
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        if (backupContent.includes('fixUrlsInJson') || backupContent.includes('cleanAIResponse')) {
          console.log(`✅ Required functions found in ${backupFile}`);
          console.log(`Consider using ${backupFile} as your main route.ts file.`);
          break;
        }
      }
    }
    
    return false;
  }
  
  console.log('✅ fixUrlsInJson function found in route.ts');
  return true;
}

// Test settings page
function testSettingsPage() {
  console.log('Testing settings page...');
  
  const command = `curl -s ${BASE_URL}/settings`;
  const result = runCurl(command);
  
  if (result.success) {
    if (result.output.includes('ScopeStack Integration') || result.output.includes('OpenRouter Configuration') || 
        result.output.includes('Custom Prompts Configuration')) {
      console.log('✅ Settings page loaded successfully');
      return true;
    } else {
      console.error('❌ Settings page content not found');
      return false;
    }
  } else {
    console.error('❌ Failed to load settings page:', result.error);
    return false;
  }
}

// Test main page
function testMainPage() {
  console.log('Testing main page...');
  
  const command = `curl -s ${BASE_URL}`;
  const result = runCurl(command);
  
  if (result.success) {
    if (result.output.includes('ScopeStack Research-Driven Content Engine')) {
      console.log('✅ Main page loaded successfully');
      return true;
    } else {
      console.error('❌ Main page content not found');
      return false;
    }
  } else {
    console.error('❌ Failed to load main page:', result.error);
    return false;
  }
}

// Main test function
function runTests() {
  console.log('🧪 Starting ScopeStack Content Engine tests...');
  
  // Check if OpenRouter API key is set
  if (!OPENROUTER_API_KEY && !SKIP_OPENROUTER_TEST) {
    console.warn('⚠️ OPENROUTER_API_KEY environment variable is not set');
    console.log('Setting SKIP_OPENROUTER_TEST=true to continue with other tests');
    process.env.SKIP_OPENROUTER_TEST = 'true';
  }
  
  // Test API route file
  const apiRouteValid = testApiRouteFile();
  if (!apiRouteValid) {
    console.error('❌ API route file is invalid');
    // Continue with other tests
  }
  
  // Test OpenRouter connection
  const openRouterConnected = testOpenRouterConnection();
  if (!openRouterConnected && !SKIP_OPENROUTER_TEST) {
    console.error('❌ OpenRouter connection failed');
    // Continue with other tests
  }
  
  // Test main page
  const mainPageValid = testMainPage();
  if (!mainPageValid) {
    console.error('❌ Main page test failed');
  }
  
  // Test settings page
  const settingsPageValid = testSettingsPage();
  if (!settingsPageValid) {
    console.error('❌ Settings page test failed');
  }
  
  console.log('\n✅ All tests completed');
}

// Run the tests
runTests(); 