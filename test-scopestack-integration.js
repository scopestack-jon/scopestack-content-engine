#!/usr/bin/env node

/**
 * Test script for ScopeStack integration
 * Usage: node test-scopestack-integration.js
 * 
 * Make sure to set environment variables:
 * - SCOPESTACK_API_TOKEN or NEXT_PUBLIC_SCOPESTACK_API_TOKEN
 * - SCOPESTACK_API_URL (optional, defaults to https://api.scopestack.io)
 * - SCOPESTACK_ACCOUNT_SLUG (optional, will be fetched from API)
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Adjust if your app runs on a different port
const PUSH_ENDPOINT = '/api/push-to-scopestack';

// Sample content data that mimics what the content engine generates
const sampleContent = {
  technology: "Azure Cloud Infrastructure",
  questions: [
    {
      id: "q1",
      slug: "environment_type",
      text: "What type of environment are you building?",
      type: "multiple_choice",
      options: ["Production", "Development", "Staging", "Hybrid"],
      required: true
    },
    {
      id: "q2",
      slug: "user_count",
      text: "How many users will access the system?",
      type: "number",
      options: [],
      required: true
    },
    {
      id: "q3",
      slug: "high_availability",
      text: "Do you require high availability?",
      type: "boolean",
      options: [],
      required: true
    },
    {
      id: "q4",
      slug: "compliance_requirements",
      text: "What are your compliance requirements?",
      type: "text",
      options: [],
      required: false
    }
  ],
  services: [
    {
      name: "Azure Infrastructure Assessment",
      description: "Comprehensive assessment of current infrastructure and Azure readiness",
      hours: 40,
      phase: "Discovery",
      serviceDescription: "We will conduct a thorough assessment of your existing infrastructure, identify workloads suitable for Azure migration, and create a detailed migration roadmap.",
      keyAssumptions: "Access to existing infrastructure documentation and key stakeholders will be provided",
      clientResponsibilities: "Provide access to systems and documentation, assign technical contacts",
      outOfScope: "Actual migration execution, third-party application modifications"
    },
    {
      name: "Azure Architecture Design",
      description: "Design of target Azure architecture including networking, security, and governance",
      hours: 60,
      phase: "Design",
      serviceDescription: "Create detailed Azure architecture blueprints covering compute, storage, networking, security, and governance aspects aligned with your requirements.",
      keyAssumptions: "Requirements gathered during assessment phase are complete and approved",
      clientResponsibilities: "Review and approve architecture designs, provide feedback on proposed solutions",
      outOfScope: "Implementation of the architecture, custom application development"
    },
    {
      name: "Azure Landing Zone Implementation",
      description: "Setup of Azure landing zone with best practices for security and governance",
      hours: 80,
      phase: "Implementation",
      serviceDescription: "Deploy Azure landing zone following Microsoft Cloud Adoption Framework, including management groups, subscriptions, policies, and core networking.",
      keyAssumptions: "Azure tenant and subscriptions are available, naming conventions are agreed upon",
      clientResponsibilities: "Provide Azure subscription details, approve policy definitions",
      outOfScope: "Migration of existing workloads, operational support"
    },
    {
      name: "Security and Compliance Configuration",
      description: "Implementation of security controls and compliance monitoring",
      hours: 50,
      phase: "Implementation",
      serviceDescription: "Configure Azure Security Center, implement identity and access management, setup compliance monitoring, and establish security baselines.",
      keyAssumptions: "Security requirements and compliance standards are defined",
      clientResponsibilities: "Define security policies, provide compliance requirements",
      outOfScope: "Security incident response, ongoing security monitoring"
    },
    {
      name: "Knowledge Transfer and Documentation",
      description: "Comprehensive documentation and knowledge transfer sessions",
      hours: 30,
      phase: "Transition",
      serviceDescription: "Deliver detailed documentation of the implemented solution and conduct knowledge transfer sessions with your technical team.",
      keyAssumptions: "Technical team members are available for training sessions",
      clientResponsibilities: "Ensure team availability for training, review documentation",
      outOfScope: "Ongoing training programs, certification preparation"
    }
  ],
  calculations: [
    {
      id: "calc1",
      name: "Total Implementation Hours",
      value: 260,
      formula: "sum(all_service_hours)",
      unit: "hours",
      source: "Generated from service estimates"
    }
  ],
  sources: [
    {
      url: "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/",
      title: "Microsoft Cloud Adoption Framework for Azure",
      summary: "Proven guidance and best practices that help you confidently adopt the cloud",
      credibility: "high",
      relevance: 0.95,
      sourceType: "documentation"
    },
    {
      url: "https://learn.microsoft.com/en-us/azure/architecture/",
      title: "Azure Architecture Center",
      summary: "Guidance for architecting solutions on Azure using established patterns and practices",
      credibility: "high",
      relevance: 0.9,
      sourceType: "documentation"
    },
    {
      url: "https://azure.microsoft.com/en-us/solutions/",
      title: "Azure Solutions",
      summary: "Comprehensive solutions and reference architectures for common scenarios",
      credibility: "high",
      relevance: 0.85,
      sourceType: "vendor"
    }
  ],
  totalHours: 260
};

// Test configuration options
const testOptions = {
  clientName: "Test Client " + new Date().toISOString().slice(0, 10),
  projectName: "Azure Migration Project - Test " + Date.now(),
  questionnaireTags: ["technology", "azure", "cloud"],
  skipSurvey: false,  // Set to true to skip survey creation
  skipDocument: false  // Set to true to skip document generation
};

// Main test function
async function testScopeStackIntegration() {
  console.log('🚀 Starting ScopeStack Integration Test');
  console.log('=' .repeat(50));
  
  // Check if API token is set
  const hasToken = process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN;
  if (!hasToken) {
    console.error('❌ Error: SCOPESTACK_API_TOKEN environment variable is not set');
    console.log('Please set your ScopeStack API token:');
    console.log('  export SCOPESTACK_API_TOKEN=your-token-here');
    process.exit(1);
  }
  
  try {
    console.log('\n📦 Sending test content to ScopeStack API...');
    console.log(`  - Technology: ${sampleContent.technology}`);
    console.log(`  - Services: ${sampleContent.services.length}`);
    console.log(`  - Questions: ${sampleContent.questions.length}`);
    console.log(`  - Total Hours: ${sampleContent.totalHours}`);
    console.log(`  - Client Name: ${testOptions.clientName}`);
    console.log(`  - Project Name: ${testOptions.projectName}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${API_BASE_URL}${PUSH_ENDPOINT}`,
      {
        content: sampleContent,
        ...testOptions
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000 // 2 minute timeout for long operations
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Success! Operation completed in ${duration} seconds`);
    console.log('=' .repeat(50));
    
    const result = response.data;
    
    if (result.project) {
      console.log('\n📋 Project Details:');
      console.log(`  - ID: ${result.project.id}`);
      console.log(`  - Name: ${result.project.name}`);
      console.log(`  - Status: ${result.project.status}`);
      console.log(`  - URL: ${result.project.url}`);
      
      if (result.project.pricing) {
        console.log('\n💰 Pricing:');
        console.log(`  - Revenue: $${result.project.pricing.revenue || 'N/A'}`);
        console.log(`  - Cost: $${result.project.pricing.cost || 'N/A'}`);
        console.log(`  - Margin: ${result.project.pricing.margin || 'N/A'}%`);
      }
    }
    
    if (result.client) {
      console.log('\n👤 Client:');
      console.log(`  - ID: ${result.client.id}`);
      console.log(`  - Name: ${result.client.name}`);
    }
    
    if (result.survey) {
      console.log('\n📊 Survey:');
      console.log(`  - ID: ${result.survey.id}`);
      console.log(`  - Name: ${result.survey.name}`);
      console.log(`  - Status: ${result.survey.status}`);
    }
    
    if (result.document) {
      console.log('\n📄 Document:');
      console.log(`  - ID: ${result.document.id}`);
      console.log(`  - Status: ${result.document.status}`);
      if (result.document.url) {
        console.log(`  - URL: ${result.document.url}`);
      }
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Integration test completed successfully!');
    
    // Save result to file for debugging
    const fs = require('fs');
    const outputFile = `test-result-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full response saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('\nResponse Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data?.details) {
        console.error('\nError Details:', error.response.data.details);
      }
      
      if (error.response.data?.stack) {
        console.error('\nStack Trace:', error.response.data.stack);
      }
    } else if (error.request) {
      console.error('\nNo response received. Check if the server is running on', API_BASE_URL);
    } else {
      console.error('\nError setting up request:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testScopeStackIntegration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});