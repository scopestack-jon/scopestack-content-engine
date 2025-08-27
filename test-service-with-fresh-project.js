#!/usr/bin/env node

/**
 * Test script for creating a fresh project and adding services
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testWithFreshProject() {
  console.log('🆕 Testing Service Creation with Fresh Project');
  console.log('=' .repeat(50));
  
  if (!token) {
    console.error('❌ No SCOPESTACK_API_TOKEN found in .env.local');
    return;
  }
  
  try {
    // Step 1: Get account info
    const authResponse = await axios.get(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const userData = authResponse.data.data.attributes;
    const accountSlug = userData['account-slug'];
    const accountId = userData['account-id'];
    
    console.log(`✅ Account: ${accountSlug} (ID: ${accountId})`);
    
    // Step 2: Create a test client
    const clientResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/clients`, {
      data: {
        type: 'clients',
        attributes: {
          name: 'Service Test Client ' + Date.now(),
          active: true,
        },
        relationships: {
          account: {
            data: {
              type: 'accounts',
              id: accountId.toString(),
            },
          },
        },
      },
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const clientId = clientResponse.data.data.id;
    console.log(`✅ Created client: ${clientId}`);
    
    // Step 3: Create a test project
    const projectResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/projects`, {
      data: {
        type: 'projects',
        attributes: {
          'project-name': 'Service Test Project ' + Date.now(),
          'executive-summary': 'Test project for service creation',
        },
        relationships: {
          client: {
            data: {
              type: 'clients',
              id: clientId,
            },
          },
          account: {
            data: {
              type: 'accounts',
              id: accountId.toString(),
            },
          },
        },
      },
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const projectId = projectResponse.data.data.id;
    console.log(`✅ Created project: ${projectId}`);
    console.log('Project attributes:', JSON.stringify(projectResponse.data.data.attributes, null, 2));
    
    // Step 4: Try to add a service to this project
    console.log(`\n🔧 Adding service to project ${projectId}...`);
    
    const serviceData = {
      data: {
        type: 'project-services',
        attributes: {
          name: 'Test Service',
          'service-description': 'A test service for API validation',
          quantity: 20,
          position: 1,
        },
        relationships: {
          project: {
            data: {
              type: 'projects',
              id: projectId
            }
          }
        }
      }
    };
    
    console.log('Service payload:', JSON.stringify(serviceData, null, 2));
    
    const serviceResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, serviceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    console.log('\n✅ Service creation successful!');
    console.log('Service response:', JSON.stringify(serviceResponse.data, null, 2));
    
    // Step 5: Verify the service was added by fetching project services
    console.log(`\n🔍 Fetching services for project ${projectId}...`);
    const projectServicesResponse = await axios.get(`${baseUrl}/${accountSlug}/v1/projects/${projectId}?include=project-services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const services = projectServicesResponse.data.included?.filter(item => item.type === 'project-services') || [];
    console.log(`✅ Found ${services.length} services:`);
    services.forEach(service => {
      console.log(`  - ${service.attributes.name} (${service.attributes.quantity} hours)`);
    });
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('URL:', error.config?.url);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
  }
}

testWithFreshProject();