const { ActiveResearchEngine } = require('./lib/active-research-engine.ts');

async function testActiveResearch() {
  console.log('🔬 Testing Active Research Engine...\n');
  
  const engine = new ActiveResearchEngine();
  
  const testCases = [
    {
      topic: "Microsoft 365 migration for healthcare organizations",
      context: {
        industry: "healthcare",
        technology: "Microsoft 365",
        scale: "enterprise",
        compliance: ["HIPAA", "HITECH"]
      }
    },
    {
      topic: "AWS infrastructure security best practices",
      context: {
        industry: "finance",
        technology: "AWS",
        scale: "large",
        compliance: ["SOX", "PCI-DSS"]
      }
    },
    {
      topic: "Kubernetes deployment for startup companies",
      context: {
        technology: "Kubernetes",
        scale: "small"
      }
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n=== Test Case ${i + 1}: ${testCase.topic} ===`);
    
    try {
      const startTime = Date.now();
      
      const result = await engine.performActiveResearch(
        testCase.topic,
        testCase.context,
        8 // Target 8 sources for testing
      );
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Research completed in ${duration}ms`);
      console.log(`📊 Results Summary:`);
      console.log(`   - Sources found: ${result.totalSourcesFound}`);
      console.log(`   - Research confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   - Key insights: ${result.keyInsights.length}`);
      console.log(`   - Research gaps: ${result.gaps.length}`);
      
      console.log(`\n📋 Sources Quality Breakdown:`);
      const highCredibility = result.sources.filter(s => s.credibility === 'high').length;
      const mediumCredibility = result.sources.filter(s => s.credibility === 'medium').length;
      const lowCredibility = result.sources.filter(s => s.credibility === 'low').length;
      const highRelevance = result.sources.filter(s => s.relevance >= 0.7).length;
      
      console.log(`   - High credibility: ${highCredibility}/${result.sources.length}`);
      console.log(`   - Medium credibility: ${mediumCredibility}/${result.sources.length}`);
      console.log(`   - Low credibility: ${lowCredibility}/${result.sources.length}`);
      console.log(`   - High relevance (70%+): ${highRelevance}/${result.sources.length}`);
      
      console.log(`\n🔗 Top 3 Sources:`);
      result.sources.slice(0, 3).forEach((source, idx) => {
        console.log(`   ${idx + 1}. ${source.title}`);
        console.log(`      URL: ${source.url}`);
        console.log(`      Credibility: ${source.credibility} | Relevance: ${Math.round(source.relevance * 100)}%`);
        console.log(`      Type: ${source.sourceType}`);
        console.log(`      Summary: ${source.summary.substring(0, 100)}...`);
        console.log('');
      });
      
      if (result.keyInsights.length > 0) {
        console.log(`🔍 Key Insights:`);
        result.keyInsights.slice(0, 3).forEach((insight, idx) => {
          console.log(`   ${idx + 1}. ${insight}`);
        });
      }
      
      if (result.gaps.length > 0) {
        console.log(`\n⚠️ Research Gaps:`);
        result.gaps.forEach((gap, idx) => {
          console.log(`   ${idx + 1}. ${gap}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      console.error(`Error details:`, error);
    }
    
    console.log(`\n${'='.repeat(80)}`);
  }
}

// Environment validation
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}

// Run the test
testActiveResearch().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});