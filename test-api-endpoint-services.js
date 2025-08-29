#!/usr/bin/env node

/**
 * Test the push-to-scopestack API endpoint with direct services
 */

const axios = require('axios');

async function testApiEndpoint() {
  console.log('\n🌐 Testing Push-to-ScopeStack API Endpoint');
  console.log('=' .repeat(60));
  
  const testPayload = {
    content: {
      technology: "Network Infrastructure Upgrade",
      services: [
        {
          name: "Meraki Switch Configuration",
          description: "Complete configuration and deployment of Meraki switches",
          hours: 40,
          phase: "Implementation",
          serviceDescription: "Configure Meraki MS switches including VLAN setup, port security, and management access",
          keyAssumptions: "Client has existing network infrastructure documented",
          clientResponsibilities: "Provide network documentation and access credentials",
          outOfScope: "Physical installation and cabling"
        },
        {
          name: "Network Security Assessment",
          description: "Comprehensive security assessment of network infrastructure",
          hours: 60,
          phase: "Assessment",
          serviceDescription: "Evaluate current security posture and provide recommendations",
          keyAssumptions: "Full access to network equipment for assessment",
          clientResponsibilities: "Coordinate access and provide security policies",
          outOfScope: "Implementation of security recommendations"
        },
        {
          name: "Ongoing Network Support",
          description: "Monthly network monitoring and support services",
          hours: 20,
          phase: "Support",
          serviceDescription: "24/7 monitoring, incident response, and preventive maintenance",
          keyAssumptions: "Remote access available for monitoring",
          clientResponsibilities: "Escalate issues promptly and provide change approvals",
          outOfScope: "On-site support visits"
        }
      ],
      questions: [
        {
          text: "What is your current network size?",
          type: "multiple_choice",
          options: ["Small (1-50 devices)", "Medium (51-200 devices)", "Large (200+ devices)"]
        },
        {
          text: "Do you have existing documentation?",
          type: "boolean"
        }
      ],
      sources: [
        {
          title: "Meraki Best Practices",
          url: "https://documentation.meraki.com",
          credibility: "high"
        }
      ],
      totalHours: 120
    },
    clientName: "API Test Client",
    projectName: "Network Infrastructure Test Project",
    useDirectServices: true,
    skipSurvey: true,
    skipDocument: true
  };
  
  try {
    console.log('🚀 Sending request to API endpoint...');
    console.log('Payload summary:');
    console.log(`  Technology: ${testPayload.content.technology}`);
    console.log(`  Services: ${testPayload.content.services.length}`);
    console.log(`  Total Hours: ${testPayload.content.totalHours}`);
    console.log(`  Use Direct Services: ${testPayload.useDirectServices}`);
    console.log(`  Client: ${testPayload.clientName}`);
    console.log('');
    
    // Start dev server first
    console.log('⚠️  Make sure your dev server is running: npm run dev');
    console.log('Testing against: http://localhost:3000/api/push-to-scopestack');
    console.log('');
    
    const response = await axios.post('http://localhost:3000/api/push-to-scopestack', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('✅ API call successful!');
    console.log('');
    console.log('📋 Response Summary:');
    console.log(`  Success: ${response.data.success}`);
    if (response.data.project) {
      console.log(`  Project ID: ${response.data.project.id}`);
      console.log(`  Project Name: ${response.data.project.name}`);
      console.log(`  Project URL: ${response.data.project.url}`);
      if (response.data.project.pricing) {
        console.log(`  Revenue: $${response.data.project.pricing.revenue || 0}`);
        console.log(`  Cost: $${response.data.project.pricing.cost || 0}`);
        console.log(`  Margin: ${response.data.project.pricing.margin || 0}%`);
      }
    }
    if (response.data.client) {
      console.log(`  Client ID: ${response.data.client.id}`);
      console.log(`  Client Name: ${response.data.client.name}`);
    }
    if (response.data.metadata) {
      console.log(`  Services Created: ${response.data.metadata.serviceCount}`);
      console.log(`  Total Hours: ${response.data.metadata.totalHours}`);
    }
    if (response.data.warnings && response.data.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      response.data.warnings.forEach(warning => {
        console.log(`    - ${warning}`);
      });
    }
    
    console.log('');
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ API call failed:');
    console.error(`Message: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 The development server is not running.');
      console.error('Start it with: npm run dev');
      console.error('Then run this test again.');
    } else if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testApiEndpoint();