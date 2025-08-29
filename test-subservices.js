#!/usr/bin/env node

/**
 * Test script for creating services with subservices
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function testSubserviceCreation() {
  console.log('\n🔧 Testing Service Creation with Subservices');
  console.log('=' .repeat(60));
  
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
    const timestamp = Date.now();
    const clientResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/clients`, {
      data: {
        type: 'clients',
        attributes: {
          name: `Subservice Test Client ${timestamp}`,
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
    console.log(`✅ Created client: ${clientResponse.data.data.attributes.name}`);
    
    // Step 3: Create a test project
    const projectResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/projects`, {
      data: {
        type: 'projects',
        attributes: {
          'project-name': `Subservice Test Project ${timestamp}`,
          'executive-summary': 'Testing subservice creation functionality',
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
    console.log(`✅ Created project: ${projectResponse.data.data.attributes.name} (ID: ${projectId})`);
    
    // Step 4: Create a parent service
    console.log('\n🔧 Creating parent service...');
    const serviceResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, {
      data: {
        type: 'project-services',
        attributes: {
          name: 'ISE Implementation Service',
          quantity: 200,
          'task-source': 'custom',
          'service-type': 'professional_services',
          'payment-frequency': 'one_time',
          position: 0,
          'service-description': 'Complete ISE implementation including planning, configuration, and testing',
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
    
    const parentServiceId = serviceResponse.data.data.id;
    console.log(`✅ Created parent service: ${serviceResponse.data.data.attributes.name} (ID: ${parentServiceId})`);
    
    // Step 5: Try to create subservices
    console.log('\n🔧 Creating subservices...');
    
    const subservices = [
      {
        name: 'Requirements Gathering',
        description: 'Gather and document technical requirements',
        hours: 40,
        'service-description': 'Detailed analysis of current network infrastructure and authentication needs',
        'key-assumptions': 'Access to technical stakeholders and existing documentation',
        'client-responsibilities': 'Participate in requirements workshops',
        'out-of-scope': 'Business process reengineering'
      },
      {
        name: 'Architecture Design',
        description: 'Design ISE deployment architecture',
        hours: 60,
        'service-description': 'Development of detailed ISE architecture including node placement and HA configuration',
        'key-assumptions': 'Requirements documented and approved',
        'client-responsibilities': 'Review and approve architecture designs',
        'out-of-scope': 'Virtual infrastructure setup'
      },
      {
        name: 'ISE Installation',
        description: 'Install and configure ISE nodes',
        hours: 80,
        'service-description': 'Installation and basic configuration of ISE nodes according to approved architecture',
        'key-assumptions': 'Virtual/hardware resources ready',
        'client-responsibilities': 'Provide system access and support installation activities',
        'out-of-scope': 'Hardware setup and OS installation'
      },
      {
        name: 'Testing and Validation',
        description: 'Test ISE functionality and validate configuration',
        hours: 20,
        'service-description': 'Comprehensive testing of ISE authentication and policy enforcement',
        'key-assumptions': 'Test environment available with sample devices',
        'client-responsibilities': 'Provide test devices and support testing activities',
        'out-of-scope': 'User training and documentation'
      }
    ];
    
    let successCount = 0;
    for (let i = 0; i < subservices.length; i++) {
      const sub = subservices[i];
      try {
        console.log(`Creating subservice: ${sub.name} (${sub.hours} hours)`);
        
        const subResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/project-subservices`, {
          data: {
            type: 'project-subservices',
            attributes: {
              name: sub.name,
              hours: sub.hours,
              position: i,
              'service-description': sub['service-description'],
              'key-assumptions': sub['key-assumptions'],
              'client-responsibilities': sub['client-responsibilities'],
              'out-of-scope': sub['out-of-scope'],
            },
            relationships: {
              'project-service': {
                data: {
                  id: parseInt(parentServiceId),
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
        
        console.log(`  ✅ Created subservice: ${sub.name} (ID: ${subResponse.data.data.id})`);
        successCount++;
        
      } catch (error) {
        console.error(`  ❌ Failed to create subservice: ${sub.name}`);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach(err => {
            console.error(`     Error: ${err.detail || err.title}`);
          });
        }
      }
    }
    
    console.log(`\n📊 Summary: Created ${successCount}/${subservices.length} subservices`);
    console.log(`🔗 Project URL: https://app.scopestack.io/projects/${projectId}/edit`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSubserviceCreation();