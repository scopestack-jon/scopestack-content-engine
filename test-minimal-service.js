#!/usr/bin/env node

/**
 * Minimal test to find correct service creation format
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testMinimalService() {
  console.log('\n🧪 Testing Minimal Service Creation');
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
    const accountId = authResponse.data.data.attributes['account-id'];
    console.log(`✅ Account: ${accountSlug}`);
    
    // Create a test client
    const timestamp = Date.now();
    const clientResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/clients`, {
      data: {
        type: 'clients',
        attributes: {
          name: `Minimal Test Client ${timestamp}`,
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
    
    // Create a test project
    const projectResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/projects`, {
      data: {
        type: 'projects',
        attributes: {
          'project-name': `Minimal Test Project ${timestamp}`,
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
    
    // Test different minimal service configurations
    const testConfigs = [
      {
        name: 'absolutely-minimal',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Minimal Service Test 1',
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
            name: 'Service with Quantity',
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
        name: 'with-task-source',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Service with Task Source',
            quantity: 40,
            'task-source': 'custom',
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
        name: 'with-service-type',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Service with Type',
            quantity: 40,
            'task-source': 'custom',
            'service-type': 'professional_services',
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
        name: 'with-payment-frequency',
        data: {
          type: 'project-services',
          attributes: {
            name: 'Service with Payment',
            quantity: 40,
            'task-source': 'custom',
            'service-type': 'professional_services',
            'payment-frequency': 'one_time',
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
    
    console.log('\n🔬 Testing configurations:');
    console.log('-' .repeat(50));
    
    for (const config of testConfigs) {
      console.log(`\nTesting: ${config.name}`);
      console.log(`Attributes: ${JSON.stringify(config.data.attributes, null, 2)}`);
      
      try {
        const response = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, 
          { data: config.data }, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/vnd.api+json',
              'Accept': 'application/vnd.api+json'
            }
          }
        );
        
        console.log(`✅ SUCCESS! Service created with ID: ${response.data.data.id}`);
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
    
    // Get project with services to verify
    console.log('\n📋 Fetching project services...');
    const projectDetailsResponse = await axios.get(
      `${baseUrl}/${accountSlug}/v1/projects/${projectId}?include=project-services`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );
    
    const services = projectDetailsResponse.data.included?.filter(item => item.type === 'project-services') || [];
    console.log(`\n✅ Project has ${services.length} service(s):`);
    services.forEach(service => {
      console.log(`  - ${service.attributes.name} (${service.attributes.quantity || 0} hours)`);
    });
    
    console.log(`\n🔗 Project URL: https://app.scopestack.io/${accountSlug}/projects/${projectId}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMinimalService();