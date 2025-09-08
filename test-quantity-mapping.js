// Test script to verify quantity mapping is working correctly

async function testQuantityMapping() {
  console.log('Testing quantity mapping functionality...\n');
  
  // Test the research endpoint first
  console.log('1. Testing research endpoint to generate content with quantities...');
  
  const researchResponse = await fetch('http://localhost:3002/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request: 'Office 365 migration for 100 mailboxes'
    })
  });
  
  if (!researchResponse.ok) {
    console.error('Research request failed:', researchResponse.status);
    return;
  }
  
  const generatedContent = await researchResponse.json();
  
  console.log('\n2. Generated Content Summary:');
  console.log('   Technology:', generatedContent.technology);
  console.log('   Total Hours:', generatedContent.totalHours);
  console.log('   Services Count:', generatedContent.services?.length || 0);
  console.log('   Questions Count:', generatedContent.questions?.length || 0);
  
  // Check if services have quantities
  console.log('\n3. Service Quantities:');
  generatedContent.services?.forEach((service, index) => {
    console.log(`   Service ${index + 1}: ${service.name}`);
    console.log(`     - Hours: ${service.hours}`);
    console.log(`     - Base Hours: ${service.baseHours || 'not set'}`);
    console.log(`     - Quantity: ${service.quantity || 'not set'}`);
    
    if (service.subservices) {
      service.subservices.forEach((sub, subIndex) => {
        console.log(`     Subservice ${subIndex + 1}: ${sub.name}`);
        console.log(`       - Hours: ${sub.hours}`);
        console.log(`       - Base Hours: ${sub.baseHours || 'not set'}`);
        console.log(`       - Quantity: ${sub.quantity || 'not set'}`);
      });
    }
  });
  
  // Check calculations
  console.log('\n4. Calculations:');
  generatedContent.calculations?.forEach((calc, index) => {
    if (calc.mappedServices && calc.mappedServices.length > 0) {
      console.log(`   Calculation ${index + 1}: ${calc.name}`);
      console.log(`     - Formula: ${calc.formula}`);
      console.log(`     - Value: ${calc.value}`);
      console.log(`     - Mapped Services: ${calc.mappedServices.join(', ')}`);
    }
  });
  
  // Test push to ScopeStack with the generated content
  console.log('\n5. Testing push to ScopeStack with calculated quantities...');
  
  const pushResponse = await fetch('http://localhost:3002/api/push-to-scopestack', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: generatedContent,
      clientName: 'Test Client',
      projectName: 'Quantity Test Project',
      workflow: 'catalog-only',
      skipSurvey: true,
      skipDocument: true
    })
  });
  
  if (!pushResponse.ok) {
    console.error('Push to ScopeStack failed:', pushResponse.status);
    const errorText = await pushResponse.text();
    console.error('Error:', errorText);
    return;
  }
  
  const pushResult = await pushResponse.json();
  console.log('\n6. Push to ScopeStack Result:');
  console.log('   Success:', pushResult.success);
  console.log('   Workflow:', pushResult.workflow);
  
  // Check if quantities were properly sent
  if (pushResult.catalogServices) {
    console.log('\n7. Services sent to ScopeStack:');
    pushResult.catalogServices.forEach(service => {
      console.log(`   - ${service.name}: Quantity=${service.quantity || 'not set'}, BaseHours=${service.baseHours || 'not set'}`);
    });
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testQuantityMapping().catch(console.error);