// Quick API test script
const fetch = require('node-fetch').default || require('node-fetch')

async function testAPIEndpoint() {
  console.log('🧪 Testing Enhanced Research API Endpoint\n')
  
  const testData = {
    input: "Office 365 email migration for healthcare organization",
    models: {
      parsing: "anthropic/claude-3.5-sonnet",
      research: "anthropic/claude-3.5-sonnet", 
      analysis: "anthropic/claude-3.5-sonnet",
      content: "anthropic/claude-3.5-sonnet"
    }
  }
  
  try {
    console.log('📤 Sending test request to API...')
    console.log('Input:', testData.input)
    console.log('URL: http://localhost:3002/api/research\n')
    
    const response = await fetch('http://localhost:3002/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📡 Response Status:', response.status)
    console.log('📡 Response Headers:')
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`)
    }
    console.log()
    
    if (response.ok) {
      console.log('✅ API endpoint is responding!')
      console.log('🔄 This will be a streaming response (Server-Sent Events)')
      console.log('💡 For full testing, use the web interface at http://localhost:3002')
      
      // Read the first few chunks of the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let chunks = 0
      
      while (chunks < 5) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        console.log(`📥 Stream chunk ${chunks + 1}:`, chunk.substring(0, 100) + '...')
        chunks++
      }
      
      reader.releaseLock()
      
    } else {
      console.log('❌ API Error:', response.status, response.statusText)
      const text = await response.text()
      console.log('Error details:', text)
    }
    
  } catch (error) {
    console.log('❌ Connection Error:', error.message)
    console.log('💡 Make sure the dev server is running: npm run dev')
  }
}

if (require.main === module) {
  testAPIEndpoint().catch(console.error)
}

module.exports = { testAPIEndpoint }