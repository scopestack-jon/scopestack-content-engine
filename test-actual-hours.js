#!/usr/bin/env node

/**
 * Test script for actual-hours field mapping
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testActualHours() {
  console.log('\n🔧 Testing Actual Hours Field Mapping');
  console.log('=' .repeat(50));
  
  if (!token) {
    console.error('❌ No SCOPESTACK_API_TOKEN found');
    return;
  }
  
  try {
    // Get account info
    const authResponse = await axios.get(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const accountSlug = authResponse.data.data.attributes['account-slug'];
    
    // Use existing project from previous tests
    const projectId = '90807';
    console.log(`Using existing project: ${projectId}`);
    
    // Test creating service with actual-hours
    console.log('\n🔧 Creating service with actual-hours mapping...');
    const serviceResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, {
      data: {
        type: 'project-services',
        attributes: {
          name: 'Actual Hours Test Service',
          quantity: 1,
          'actual-hours': 150, // This should store the unit hours
          'task-source': 'custom',
          'service-type': 'professional_services',
          'payment-frequency': 'one_time',
          position: 0,
          'service-description': 'Testing actual-hours field mapping for unit hours storage',
        },
        relationships: {
          project: {
            data: {
              id: parseInt(projectId),
              type: 'projects'
            }
          }
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const serviceId = serviceResponse.data.data.id;
    const serviceAttribs = serviceResponse.data.data.attributes;
    
    console.log(`✅ Created service: ${serviceAttribs.name} (ID: ${serviceId})`);
    console.log(`   Quantity: ${serviceAttribs.quantity}`);
    console.log(`   Actual Hours: ${serviceAttribs['actual-hours']}`);
    console.log(`   Task Source: ${serviceAttribs['task-source']}`);
    
    // Test creating subservice with actual-hours
    console.log('\n🔧 Creating subservice with actual-hours mapping...');
    try {
      const subResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/project-subservices`, {
        data: {
          type: 'project-subservices',
          attributes: {
            name: 'Actual Hours Test Subservice',
            quantity: 1,
            'actual-hours': 25,
            'service-description': 'Testing actual-hours field mapping for subservices',
            'task-source': 'custom',
          },
          relationships: {
            'project-service': {
              data: {
                id: parseInt(serviceId),
                type: 'project-services'
              }
            }
          }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      });
      
      const subAttribs = subResponse.data.data.attributes;
      console.log(`✅ Created subservice: ${subAttribs.name} (ID: ${subResponse.data.data.id})`);
      console.log(`   Quantity: ${subAttribs.quantity}`);
      console.log(`   Actual Hours: ${subAttribs['actual-hours']}`);
      console.log(`   Task Source: ${subAttribs['task-source']}`);
      
    } catch (error) {
      console.error('❌ Subservice creation failed:', error.response?.data?.errors?.[0]?.detail || error.message);
    }
    
    console.log(`\n🔗 Project URL: https://app.scopestack.io/projects/${projectId}/edit`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testActualHours();