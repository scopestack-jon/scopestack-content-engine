#!/usr/bin/env node

/**
 * Minimal test to find correct subservice creation format
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testMinimalSubservice() {
  console.log('\n🧪 Testing Minimal Subservice Creation');
  console.log('=' .repeat(50));
  
  if (!token) {
    console.error('❌ No SCOPESTACK_API_TOKEN found');
    return;
  }
  
  try {
    // Get account info and create project/service first
    const authResponse = await axios.get(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const accountSlug = authResponse.data.data.attributes['account-slug'];
    const accountId = authResponse.data.data.attributes['account-id'];
    
    // Use the existing project 90807 and service 525144 from previous test
    const projectId = '90807';
    const serviceId = '525144';
    console.log(`Using existing project ${projectId} and service ${serviceId}`);
    
    // Test different minimal subservice configurations
    const testConfigs = [
      {
        name: 'absolutely-minimal',
        data: {
          type: 'project-subservices',
          attributes: {
            name: 'Minimal Subservice Test 1',
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
      },
      {
        name: 'with-position',
        data: {
          type: 'project-subservices',
          attributes: {
            name: 'Subservice with Position',
            position: 0,
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
      },
      {
        name: 'with-service-description',
        data: {
          type: 'project-subservices',
          attributes: {
            name: 'Subservice with Description',
            'service-description': 'A test subservice with description',
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
      }
    ];
    
    console.log('\n🔬 Testing configurations:');
    console.log('-' .repeat(50));
    
    for (const config of testConfigs) {
      console.log(`\nTesting: ${config.name}`);
      console.log(`Attributes: ${JSON.stringify(config.data.attributes, null, 2)}`);
      
      try {
        const response = await axios.post(`${baseUrl}/${accountSlug}/v1/project-subservices`, 
          { data: config.data }, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/vnd.api+json',
              'Accept': 'application/vnd.api+json'
            }
          }
        );
        
        console.log(`✅ SUCCESS! Subservice created with ID: ${response.data.data.id}`);
        console.log(`Response attributes:`, JSON.stringify(response.data.data.attributes, null, 2));
        break; // Stop on first success
        
      } catch (error) {
        if (error.response?.data?.errors) {
          const errorMsg = error.response.data.errors[0].detail || error.response.data.errors[0].title;
          console.log(`❌ FAILED: ${errorMsg}`);
        } else {
          console.log(`❌ FAILED: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMinimalSubservice();