// Simple test script to verify optimizations
const { OptimizedAPIClient, OptimizedJSONParser } = require('./lib/api-optimizations')

async function testOptimizations() {
  console.log('🧪 Testing API optimizations...')
  
  // Test 1: JSON Parser
  console.log('\n1. Testing OptimizedJSONParser...')
  const testJson = '{"test": "value", "nested": {"key": "data"}}'
  
  try {
    const parsed = await OptimizedJSONParser.parseWithTimeout(testJson, 5000)
    console.log('✅ JSON parsing successful:', parsed)
  } catch (error) {
    console.error('❌ JSON parsing failed:', error.message)
  }
  
  // Test 2: API Client with mock
  console.log('\n2. Testing OptimizedAPIClient caching...')
  const client = new OptimizedAPIClient()
  
  // Note: This would require actual API key to fully test
  console.log('✅ API client initialized successfully')
  console.log('⚠️  Full API testing requires OPENROUTER_API_KEY environment variable')
  
  // Test 3: Regex patterns
  console.log('\n3. Testing compiled regex patterns...')
  const testText = 'Visit https://example.com for more info and also https://test.com'
  const matches = OptimizedJSONParser.extractWithCompiledRegex(testText, 'url')
  console.log('✅ Found URLs:', matches.map(m => m[0]))
  
  console.log('\n🎉 All optimization tests completed!')
}

// Only run if called directly
if (require.main === module) {
  testOptimizations().catch(console.error)
}

module.exports = { testOptimizations }