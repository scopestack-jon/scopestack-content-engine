// Performance monitoring script for local testing
const fs = require('fs')

function createPerformanceMonitor() {
  const startTime = Date.now()
  let lastLogTime = startTime
  
  const monitor = {
    testResults: [],
    
    logTiming(step, details = {}) {
      const now = Date.now()
      const stepTime = now - lastLogTime
      const totalTime = now - startTime
      
      const result = {
        step,
        stepTime: `${stepTime}ms`,
        totalTime: `${Math.floor(totalTime/1000)}s`,
        timestamp: new Date().toISOString(),
        ...details
      }
      
      this.testResults.push(result)
      console.log(`⏱️  ${step}: ${stepTime}ms (total: ${Math.floor(totalTime/1000)}s)`)
      
      if (details.sources) {
        console.log(`   📚 Sources: ${details.sources} (${details.validated || 0} validated)`)
      }
      
      lastLogTime = now
    },
    
    checkOptimizations() {
      console.log('\n📊 Performance Check:')
      const totalTime = Date.now() - startTime
      const minutes = Math.floor(totalTime / 60000)
      const seconds = Math.floor((totalTime % 60000) / 1000)
      
      console.log(`Total runtime: ${minutes}m ${seconds}s`)
      
      if (totalTime < 360000) { // 6 minutes
        console.log('✅ Performance target met (under 6 minutes)')
      } else {
        console.log('⚠️  Performance slower than target (over 6 minutes)')
      }
      
      return {
        totalTimeMs: totalTime,
        totalTimeFormatted: `${minutes}m ${seconds}s`,
        meetsPerfTarget: totalTime < 360000,
        steps: this.testResults
      }
    },
    
    saveResults(testCase) {
      const results = this.checkOptimizations()
      const filename = `test-results-${Date.now()}.json`
      
      const report = {
        testCase,
        timestamp: new Date().toISOString(),
        performance: results,
        optimizations: {
          parallelProcessing: this.testResults.some(r => r.step.includes('parallel')),
          caching: this.testResults.some(r => r.details?.cached),
          enhancedResearch: this.testResults.some(r => r.step.includes('enhanced'))
        }
      }
      
      fs.writeFileSync(filename, JSON.stringify(report, null, 2))
      console.log(`\n📁 Results saved to: ${filename}`)
      
      return report
    }
  }
  
  return monitor
}

// Test case helper
function runTestCase(caseName, input) {
  console.log(`\n🧪 Starting Test Case: ${caseName}`)
  console.log(`📝 Input: "${input}"`)
  console.log(`🕐 Started at: ${new Date().toLocaleTimeString()}\n`)
  
  const monitor = createPerformanceMonitor()
  
  // Simulate the steps we expect to see
  console.log('👀 Watch for these console messages in your browser/terminal:')
  console.log('   📊 Step 1: Parsing input...')
  console.log('   📊 Step 2: Conducting enhanced dynamic research...')
  console.log('   🔬 Step 3: Analyzing research with specialized focus...')
  console.log('   📝 Step 4: Generating content using multi-stage approach...')
  console.log('\n💡 Open browser dev tools to see detailed logging')
  
  return monitor
}

// Quick test runner
if (require.main === module) {
  console.log('🚀 Performance Monitor Ready')
  console.log('\n📋 Test these inputs manually in the web interface:')
  
  const testCases = [
    {
      name: "Office 365 Healthcare",
      input: "Office 365 email migration for healthcare organization",
      expectedTime: "3-5 minutes",
      features: ["Microsoft sources", "HIPAA compliance", "Healthcare insights"]
    },
    {
      name: "AWS Finance", 
      input: "AWS cloud infrastructure setup for finance company",
      expectedTime: "4-6 minutes", 
      features: ["AWS documentation", "SOX compliance", "Finance regulations"]
    },
    {
      name: "Cisco Enterprise",
      input: "Cisco network infrastructure implementation", 
      expectedTime: "3-5 minutes",
      features: ["Cisco sources", "Network implementation", "Enterprise deployment"]
    }
  ]
  
  testCases.forEach((test, i) => {
    console.log(`\n${i + 1}. ${test.name}`)
    console.log(`   Input: "${test.input}"`)
    console.log(`   Expected Time: ${test.expectedTime}`)
    console.log(`   Expected Features: ${test.features.join(', ')}`)
  })
  
  console.log('\n🎯 Success Criteria:')
  console.log('   ✅ Completes in under 6 minutes')
  console.log('   ✅ Shows parallel processing messages')  
  console.log('   ✅ Sources have ✓ or ⚡ indicators')
  console.log('   ✅ Industry-specific content appears')
  console.log('   ✅ No example.com URLs in output')
  
  console.log('\n🔗 Start testing at: http://localhost:3000')
}

module.exports = { createPerformanceMonitor, runTestCase }