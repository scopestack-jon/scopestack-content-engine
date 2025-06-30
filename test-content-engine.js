/**
 * Test script for ScopeStack Content Engine
 * 
 * This script helps validate the app's functionality by:
 * 1. Testing the OpenRouter API connection
 * 2. Testing the research endpoint with a sample input
 * 3. Testing the ScopeStack integration
 */

const fs = require('fs');
const path = require('path');
// Using built-in fetch API
// const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const SAMPLE_INPUT = 'Microsoft Email Migration to Office 365 for a Hospital with 1000 users';

// Test OpenRouter API connection
async function testOpenRouterConnection() {
  console.log('Testing OpenRouter API connection...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: OPENROUTER_API_KEY }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ OpenRouter connection successful');
      return true;
    } else {
      console.error('❌ OpenRouter connection failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenRouter test error:', error.message);
    return false;
  }
}

// Test research endpoint
async function testResearchEndpoint() {
  console.log('Testing research endpoint with sample input...');
  console.log(`Input: "${SAMPLE_INPUT}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: SAMPLE_INPUT,
        models: {
          research: 'anthropic/claude-3.5-sonnet',
          analysis: 'openai/gpt-4-turbo',
          content: 'anthropic/claude-3.5-sonnet',
          format: 'openai/gpt-4o',
        },
      }),
    });
    
    if (!response.ok) {
      console.error(`❌ Research endpoint failed with status ${response.status}`);
      return null;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = null;
    
    console.log('Receiving SSE stream...');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'step') {
              console.log(`Step update: ${data.stepId} - ${data.status} (${data.progress}%)`);
            } else if (data.type === 'complete') {
              console.log('✅ Content generation complete');
              content = data.content;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
    
    if (content) {
      console.log('Content summary:');
      console.log(`- Technology: ${content.technology}`);
      console.log(`- Questions: ${content.questions?.length || 0}`);
      console.log(`- Services: ${content.services?.length || 0}`);
      console.log(`- Total Hours: ${content.totalHours}`);
      console.log(`- Sources: ${content.sources?.length || 0}`);
      
      // Save the content to a file for inspection
      fs.writeFileSync(
        path.join(__dirname, 'test-content.json'),
        JSON.stringify(content, null, 2)
      );
      console.log('Content saved to test-content.json');
    }
    
    return content;
  } catch (error) {
    console.error('❌ Research test error:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting ScopeStack Content Engine tests...');
  
  // Check if OpenRouter API key is set
  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.log('Please set the environment variable and try again:');
    console.log('export OPENROUTER_API_KEY=your-api-key');
    process.exit(1);
  }
  
  // Test OpenRouter connection
  const openRouterConnected = await testOpenRouterConnection();
  if (!openRouterConnected) {
    console.error('❌ Cannot proceed without OpenRouter connection');
    process.exit(1);
  }
  
  // Test research endpoint
  console.log('\n--- Testing Research Endpoint ---');
  const content = await testResearchEndpoint();
  
  if (content) {
    console.log('\n✅ All tests completed successfully');
  } else {
    console.error('\n❌ Tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 