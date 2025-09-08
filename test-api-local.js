// Test the API locally with a test API key

async function testAPI() {
  console.log('Testing Quantity Mapping via API\n');
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
    
    const data = await response.json();
    
    console.log('\n2. Generated Content:');
    console.log('   Technology:', data.technology);
    console.log('   Total Hours:', data.totalHours);
    console.log('   Services:', data.services?.length || 0);
    console.log('   Questions:', data.questions?.length || 0);
    
    console.log('\n3. Service Details:');
    data.services?.forEach((service, i) => {
      console.log(`\n   Service ${i+1}: ${service.name}`);
      console.log(`     Hours: ${service.hours}`);
      console.log(`     Base Hours: ${service.baseHours || 'not set'}`);
      console.log(`     Quantity: ${service.quantity || 'not set'}`);
      
      if (service.quantity && service.quantity > 1) {
        console.log(`     ✅ Has quantity set!`);
      }
      
      if (service.subservices) {
        service.subservices.forEach((sub, j) => {
          console.log(`\n     Subservice ${j+1}: ${sub.name}`);
          console.log(`       Hours: ${sub.hours}`);
          console.log(`       Base Hours: ${sub.baseHours || 'not set'}`);
          console.log(`       Quantity: ${sub.quantity || 'not set'}`);
          
          if (sub.quantity && sub.quantity > 1) {
            console.log(`       ✅ Has quantity set!`);
          }
        });
      }
    });
    
    console.log('\n4. Questions Generated:');
    const quantityQuestions = data.questions?.filter(q => 
      q.text.toLowerCase().includes('how many') || 
      q.text.toLowerCase().includes('number of')
    );
    
    quantityQuestions?.forEach((q, i) => {
      console.log(`   ${i+1}. ${q.text}`);
      console.log(`      Type: ${q.type}`);
      console.log(`      Slug: ${q.slug}`);
    });
    
    console.log('\n5. Calculations:');
    const relevantCalcs = data.calculations?.filter(c => 
      c.mappedServices && c.mappedServices.length > 0
    );
    
    relevantCalcs?.forEach((calc, i) => {
      console.log(`   ${i+1}. ${calc.name}`);
      console.log(`      Formula: ${calc.formula}`);
      console.log(`      Maps to: ${calc.mappedServices.join(', ')}`);
    });
    
    // Check if quantities are being set
    console.log('\n6. Quantity Verification:');
    console.log('=' .repeat(50));
    
    let hasQuantities = false;
    data.services?.forEach(service => {
      if (service.quantity && service.quantity > 1) {
        hasQuantities = true;
      }
      service.subservices?.forEach(sub => {
        if (sub.quantity && sub.quantity > 1) {
          hasQuantities = true;
        }
      });
    });
    
    if (hasQuantities) {
      console.log('✅ SUCCESS: Quantities are being properly set on services!');
    } else {
      console.log('❌ ISSUE: No quantities found on services. Check the calculation mapping.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testAPI();