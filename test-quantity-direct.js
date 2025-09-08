// Direct test of quantity mapping functionality without API calls

const { CalculationGenerator } = require('./lib/research/generators/calculation-generator.ts');
const { Service, Question } = require('./lib/research/types/interfaces.ts');

// Mock data for testing
const mockQuestions = [
  {
    text: "How many mailboxes need to be migrated?",
    slug: "how_many_mailboxes_need_to_be_migrated",
    type: "number",
    required: true
  },
  {
    text: "How many users require training?",
    slug: "how_many_users_require_training", 
    type: "number",
    required: true
  },
  {
    text: "How many servers need to be configured?",
    slug: "how_many_servers_need_to_be_configured",
    type: "number",
    required: true
  }
];

const mockServices = [
  {
    name: "Mailbox Migration Service",
    description: "Migrate mailboxes to Office 365",
    hours: 50,
    phase: "Implementation",
    subservices: [
      {
        name: "Mailbox Data Migration",
        description: "Migrate mailbox data",
        hours: 30
      },
      {
        name: "Mailbox Configuration",
        description: "Configure mailbox settings",
        hours: 20
      }
    ]
  },
  {
    name: "User Training Service",
    description: "Train users on new system",
    hours: 40,
    phase: "Training",
    subservices: [
      {
        name: "End User Training",
        description: "Train end users",
        hours: 30
      },
      {
        name: "Administrator Training",
        description: "Train administrators",
        hours: 10
      }
    ]
  },
  {
    name: "Server Configuration Service",
    description: "Configure servers",
    hours: 80,
    phase: "Implementation",
    subservices: [
      {
        name: "Server Setup",
        description: "Initial server setup",
        hours: 40
      },
      {
        name: "Server Testing",
        description: "Test server configuration",
        hours: 40
      }
    ]
  }
];

// Mock question responses
const mockResponses = {
  "how_many_mailboxes_need_to_be_migrated": 100,
  "how_many_users_require_training": 50,
  "how_many_servers_need_to_be_configured": 5
};

function testQuantityMapping() {
  console.log('Testing Quantity Mapping Functionality\n');
  console.log('=' .repeat(50));
  
  // Create calculation generator
  const calcGen = new CalculationGenerator();
  
  // Step 1: Generate calculations
  console.log('\n1. Generating Calculations from Questions...');
  const calculations = calcGen.generateCalculationsFromQuestions(mockQuestions, mockServices);
  
  console.log(`   Generated ${calculations.length} calculations`);
  calculations.forEach((calc, i) => {
    if (calc.mappedServices && calc.mappedServices.length > 0) {
      console.log(`   ${i+1}. ${calc.name}`);
      console.log(`      Formula: ${calc.formula}`);
      console.log(`      Base value: ${calc.value} ${calc.unit}`);
      console.log(`      Mapped to: ${calc.mappedServices.join(', ')}`);
    }
  });
  
  // Step 2: Apply calculations to services
  console.log('\n2. Applying Calculations to Services...');
  const servicesWithQuantities = calcGen.applyCalculationsToServices(
    mockServices,
    calculations,
    mockResponses
  );
  
  // Step 3: Display results
  console.log('\n3. Services with Applied Quantities:');
  console.log('=' .repeat(50));
  
  servicesWithQuantities.forEach((service, i) => {
    console.log(`\nService ${i+1}: ${service.name}`);
    console.log(`  Phase: ${service.phase}`);
    console.log(`  Total Hours: ${service.hours}`);
    console.log(`  Base Hours: ${service.baseHours || 'not set'}`);
    console.log(`  Quantity: ${service.quantity || 'not set'}`);
    console.log(`  Calculated Total: ${(service.baseHours || service.hours) * (service.quantity || 1)} hours`);
    
    if (service.subservices) {
      console.log(`  Subservices:`);
      service.subservices.forEach((sub, j) => {
        console.log(`    ${j+1}. ${sub.name}`);
        console.log(`       Hours: ${sub.hours}`);
        console.log(`       Base Hours: ${sub.baseHours || 'not set'}`);
        console.log(`       Quantity: ${sub.quantity || 'not set'}`);
        console.log(`       Calculated: ${(sub.baseHours || sub.hours) * (sub.quantity || 1)} hours`);
      });
    }
  });
  
  // Step 4: Calculate total project hours
  console.log('\n4. Total Project Calculation:');
  console.log('=' .repeat(50));
  
  const totalHours = calcGen.calculateTotalHours(servicesWithQuantities, calculations);
  console.log(`  Total Project Hours: ${totalHours}`);
  
  // Verify quantities are properly set
  console.log('\n5. Verification:');
  console.log('=' .repeat(50));
  
  let hasQuantities = false;
  servicesWithQuantities.forEach(service => {
    if (service.quantity && service.quantity > 1) {
      console.log(`  ✅ ${service.name} has quantity: ${service.quantity}`);
      hasQuantities = true;
    }
    if (service.subservices) {
      service.subservices.forEach(sub => {
        if (sub.quantity && sub.quantity > 1) {
          console.log(`  ✅ ${sub.name} has quantity: ${sub.quantity}`);
          hasQuantities = true;
        }
      });
    }
  });
  
  if (!hasQuantities) {
    console.log('  ❌ No quantities were set on services!');
  } else {
    console.log('\n  ✅ Quantities are being properly applied to services!');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Test Complete!');
}

// Run the test
try {
  // Note: This won't work directly with TypeScript imports
  // We need to test via the API instead
  console.log('Note: This test needs to be run through the API endpoints');
  console.log('The direct import test won\'t work with TypeScript modules.');
  console.log('\nTo properly test, use the API with a valid ScopeStack API key.');
} catch (error) {
  console.error('Error:', error.message);
}