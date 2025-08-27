#!/usr/bin/env node

/**
 * Local setup test for ScopeStack integration
 * This tests the API endpoint is working without requiring credentials
 */

const http = require('http');

// Test if the API endpoint exists and handles requests properly
async function testEndpoint() {
  console.log('🧪 Testing ScopeStack Integration Setup\n');
  console.log('=' .repeat(50));
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      content: {
        technology: "Test Technology",
        questions: [],
        services: [],
        calculations: [],
        sources: [],
        totalHours: 0
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/push-to-scopestack',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n📡 Response Status: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(responseData);
          console.log('\n📦 Response Body:');
          console.log(JSON.stringify(response, null, 2));
          
          if (res.statusCode === 400 && response.error) {
            if (response.error.includes('token not configured')) {
              console.log('\n✅ Endpoint is working correctly!');
              console.log('   The API is properly rejecting requests without credentials.');
              console.log('\n📝 Next Steps:');
              console.log('   1. Get your ScopeStack API token from: https://app.scopestack.io');
              console.log('   2. Create a .env.local file:');
              console.log('      cp .env.local.test .env.local');
              console.log('   3. Add your token to .env.local:');
              console.log('      SCOPESTACK_API_TOKEN=your-actual-token-here');
              console.log('   4. Restart the dev server:');
              console.log('      npm run dev');
              console.log('   5. Run the full integration test:');
              console.log('      node test-scopestack-integration.js');
            } else if (response.error.includes('Invalid content structure')) {
              console.log('\n✅ Endpoint is working correctly!');
              console.log('   The API is properly validating content structure.');
            } else {
              console.log('\n⚠️  Unexpected error:', response.error);
            }
          } else if (res.statusCode === 500) {
            console.log('\n❌ Server error - check the console for details');
          } else {
            console.log('\n✅ API responded successfully!');
          }
        } catch (e) {
          console.log('\n❌ Failed to parse response:', e.message);
          console.log('Raw response:', responseData);
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        console.error('\n❌ Connection refused!');
        console.error('   Make sure the Next.js dev server is running:');
        console.error('   npm run dev\n');
      } else {
        console.error('\n❌ Request failed:', e.message);
      }
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// Test content validation
async function testValidation() {
  console.log('\n\n🧪 Testing Content Validation\n');
  console.log('=' .repeat(50));
  
  const testCases = [
    {
      name: 'Missing technology',
      content: {
        questions: [],
        services: [],
        sources: [],
        totalHours: 0
      }
    },
    {
      name: 'Empty services',
      content: {
        technology: 'Test',
        questions: [],
        services: [],
        sources: [],
        totalHours: 0
      }
    },
    {
      name: 'Valid minimal content',
      content: {
        technology: 'Test Technology',
        questions: [],
        services: [{
          name: 'Test Service',
          description: 'Test Description',
          hours: 10
        }],
        sources: [],
        totalHours: 10
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    
    const data = JSON.stringify({ content: testCase.content });
    
    await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/push-to-scopestack',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (res.statusCode === 400) {
              console.log(`  ✓ Validation: ${response.error || 'Failed as expected'}`);
              if (response.details) {
                console.log(`    Details: ${response.details}`);
              }
            } else {
              console.log(`  ✓ Status ${res.statusCode}: ${response.error || 'Success'}`);
            }
          } catch (e) {
            console.log(`  ❌ Parse error: ${e.message}`);
          }
          resolve();
        });
      });
      
      req.on('error', () => resolve());
      req.write(data);
      req.end();
    });
  }
}

// Run tests
async function runTests() {
  try {
    await testEndpoint();
    await testValidation();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Setup test completed!\n');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  }
}

runTests();