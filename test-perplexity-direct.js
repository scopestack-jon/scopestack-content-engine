// Load environment variables
const fs = require('fs');
const path = require('path');

// Load .env.local file manually
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.error('⚠️ Could not load .env.local:', error.message);
}

// Test Perplexity research directly
async function testPerplexityResearch() {
  console.log('🔬 Testing direct Perplexity research...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('ROUTER')));
    return;
  }

  const topic = "Microsoft Teams setup for small business";
  const contextString = "Technology: Microsoft Teams | Scale: small business";
  
  const researchPrompt = `You are a research specialist conducting comprehensive research on technology implementations.

TOPIC: ${topic}
CONTEXT: ${contextString}

Your task is to find 8-10 high-quality, real sources that provide comprehensive coverage of this topic. Focus on:

1. Official vendor documentation and guides
2. Industry best practices and implementation methodologies  
3. Technical whitepapers and case studies
4. Compliance and regulatory guidance
5. Professional services benchmarks
6. Security and architecture considerations

For each source, provide:
- Complete, working URL
- Exact title as it appears
- Brief summary of relevance
- Source credibility assessment
- Relevance score (0.0-1.0)

Return your findings in this JSON format:
{
  "sources": [
    {
      "title": "exact title",
      "url": "complete working URL",
      "summary": "what this source covers",
      "credibility": "high|medium|low", 
      "relevance": 0.85,
      "sourceType": "documentation|guide|whitepaper|case_study|blog"
    }
  ],
  "researchSummary": "brief overview of research findings",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "confidence": 0.85
}

Focus on current, authoritative sources that collectively provide comprehensive coverage. Prioritize quality over quantity.`;

  try {
    console.log('📡 Making request to Perplexity...');
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Research Content Engine Test"
      },
      body: JSON.stringify({
        model: "perplexity/sonar",
        messages: [{ role: "user", content: researchPrompt }],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Response received from Perplexity');
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('❌ No content in response');
      return;
    }

    console.log('\n📝 Raw Perplexity Response:');
    console.log('=' .repeat(80));
    console.log(content);
    console.log('=' .repeat(80));
    
    // Test JSON parsing with improved cleaning
    try {
      let cleaned = content
        .replace(/```json\s*([\s\S]*?)\s*```/g, '$1')
        .replace(/```\s*([\s\S]*?)\s*```/g, '$1')
        .trim();
      
      // More aggressive JSON extraction - find any JSON object in the response
      const jsonMatch = cleaned.match(/({[\s\S]*})/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      }
      
      const parsed = JSON.parse(cleaned);
      
      console.log('\n✅ JSON Parse Successful!');
      console.log(`📊 Sources found: ${parsed.sources?.length || 0}`);
      console.log(`🎯 Confidence: ${parsed.confidence || 'not provided'}`);
      console.log(`💡 Insights: ${parsed.keyInsights?.length || 0}`);
      
      if (parsed.sources && parsed.sources.length > 0) {
        console.log('\n🔗 Sources:');
        parsed.sources.forEach((source, idx) => {
          console.log(`${idx + 1}. ${source.title}`);
          console.log(`   URL: ${source.url}`);
          console.log(`   Credibility: ${source.credibility} | Relevance: ${source.relevance}`);
          console.log('');
        });
      }
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('First 200 chars of cleaned response:', cleaned.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPerplexityResearch().catch(console.error);