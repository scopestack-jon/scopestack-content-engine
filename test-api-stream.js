// Test the API with streaming support

async function testAPI() {
  console.log('Testing Quantity Mapping via API (with streaming)\n');
  console.log('=' .repeat(50));
  
  // Use a test API key for local testing
  const testApiKey = 'test-api-key-for-local-development';
  
  try {
    console.log('\n1. Testing research endpoint...');
    const response = await fetch('http://localhost:3002/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: 'Office 365 migration for 100 mailboxes and 50 users',
        scopeStackApiKey: testApiKey
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return;
    }
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = null;
    
    console.log('\n2. Reading streaming response...');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            if (data.type === 'complete' && data.content) {
              fullContent = data.content;
              console.log('   ✅ Received complete content');
            } else if (data.type === 'step') {
              console.log(`   Step: ${data.stepId} - ${data.status}`);
            } else if (data.type === 'progress') {
              console.log(`   Progress: ${data.progress}%`);
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
    
    if (!fullContent) {
      console.error('No content received from API');
      return;
    }
    
    const data = fullContent;
    
    console.log('\n3. Generated Content Summary:');
    console.log('   Technology:', data.technology);
    console.log('   Total Hours:', data.totalHours);
    console.log('   Services:', data.services?.length || 0);
    console.log('   Questions:', data.questions?.length || 0);
    
    console.log('\n4. Service Quantity Analysis:');
    console.log('=' .repeat(50));
    
    let servicesWithQuantity = 0;
    let subservicesWithQuantity = 0;
    
    data.services?.forEach((service, i) => {
      console.log(`\n   Service ${i+1}: ${service.name}`);
      console.log(`     Hours: ${service.hours}`);
      console.log(`     Base Hours: ${service.baseHours || 'not set'}`);
      console.log(`     Quantity: ${service.quantity || 'not set'}`);
      
      if (service.quantity && service.quantity > 1) {
        console.log(`     ✅ Has quantity set: ${service.quantity}`);
        servicesWithQuantity++;
      }
      
      if (service.subservices) {
        service.subservices.forEach((sub, j) => {
          console.log(`\n     Subservice ${j+1}: ${sub.name}`);
          console.log(`       Hours: ${sub.hours}`);
          console.log(`       Base Hours: ${sub.baseHours || 'not set'}`);
          console.log(`       Quantity: ${sub.quantity || 'not set'}`);
          
          if (sub.quantity && sub.quantity > 1) {
            console.log(`       ✅ Has quantity set: ${sub.quantity}`);
            subservicesWithQuantity++;
          }
        });
      }
    });
    
    console.log('\n5. Quantity Questions:');
    const quantityQuestions = data.questions?.filter(q => 
      q.text.toLowerCase().includes('how many') || 
      q.text.toLowerCase().includes('number of')
    );
    
    quantityQuestions?.forEach((q, i) => {
      console.log(`   ${i+1}. ${q.text}`);
      console.log(`      Slug: ${q.slug || 'not set'}`);
    });
    
    console.log('\n6. Relevant Calculations:');
    const relevantCalcs = data.calculations?.filter(c => 
      c.mappedServices && c.mappedServices.length > 0
    );
    
    relevantCalcs?.forEach((calc, i) => {
      console.log(`   ${i+1}. ${calc.name}`);
      console.log(`      Formula: ${calc.formula}`);
      console.log(`      Value: ${calc.value}`);
      console.log(`      Maps to: ${calc.mappedServices.join(', ')}`);
    });
    
    // Final verification
    console.log('\n7. FINAL VERIFICATION:');
    console.log('=' .repeat(50));
    
    if (servicesWithQuantity > 0 || subservicesWithQuantity > 0) {
      console.log(`✅ SUCCESS: Found ${servicesWithQuantity} services and ${subservicesWithQuantity} subservices with quantities!`);
      console.log('✅ Quantity mapping is working correctly!');
    } else {
      console.log('❌ ISSUE: No quantities found on services.');
      console.log('   This means questions are not properly mapping to service quantities.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testAPI();