#!/usr/bin/env node

/**
 * Test script for adding services to ScopeStack projects
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testProjectServiceCreation() {
  console.log('🔧 Testing Project Service Creation');
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
    
    const accountSlug = authResponse.data.data.attributes['account-slug'];
    console.log(`✅ Account: ${accountSlug}`);
    
    // For testing, let's use the most recent project ID (90426 from the logs)
    const projectId = '90426'; // Update this with actual project ID
    console.log(`🎯 Testing with Project ID: ${projectId}`);
    
    // Test different service data formats to find the correct one
    const testServices = [
      {
        name: 'minimal',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Email Migration Assessment',
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
      },
      {
        name: 'with-service-description-only',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Email Migration Assessment',
            'service-description': 'Comprehensive assessment of current email infrastructure',
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
      },
      {
        name: 'with-quantity',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Email Migration Assessment',
            'service-description': 'Comprehensive assessment of current email infrastructure',
            quantity: 40,
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
      },
      {
        name: 'with-position',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Email Migration Assessment',
            'service-description': 'Comprehensive assessment of current email infrastructure',
            quantity: 40,
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
      }
    ];
    
    for (const testService of testServices) {
      console.log(`\n🧪 Testing ${testService.name} format...`);
      try {
        const response = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, { data: testService.data }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        });
        
        console.log(`✅ ${testService.name} format worked!`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        break; // Stop testing once we find a working format
        
      } catch (error) {
        console.log(`❌ ${testService.name} format failed:`);
        console.log('Status:', error.response?.status);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach(err => {
            console.log(`   - ${err.detail}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 This might help debug the issue:');
      console.log('- Check if the project ID exists');
      console.log('- Verify required fields are present');
      console.log('- Check field name formatting (dashes vs underscores)');
    }
  }
}

// Test different service attribute formats
async function testServiceAttributeFormats() {
  console.log('\n🔬 Testing different service attribute formats...');
  
  // Let's test what attributes are actually required/accepted
  const testFormats = [
    {
      name: 'minimal-test',
      attributes: {
        name: 'Minimal Test Service',
        description: 'Basic service description'
      }
    },
    {
      name: 'with-hours-test', 
      attributes: {
        name: 'Service With Hours',
        description: 'Service with hours specified',
        'total-hours': 20
      }
    },
    {
      name: 'full-format-test',
      attributes: {
        name: 'Full Format Service',
        description: 'Service with all common fields',
        'service-description': 'Detailed service description',
        'total-hours': 30,
        position: 1,
        active: true
      }
    }
  ];
  
  for (const format of testFormats) {
    console.log(`\nTesting format: ${format.name}`);
    console.log('Attributes:', JSON.stringify(format.attributes, null, 2));
  }
}

testProjectServiceCreation();
testServiceAttributeFormats();