#!/usr/bin/env node

/**
 * Enhanced test script for adding services to ScopeStack projects
 * This script tests the new service creation format with task-source: custom
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEnhancedServiceCreation() {
  log('\n🚀 Enhanced Service Creation Test', colors.bright);
  log('=' .repeat(60), colors.cyan);
  
  if (!token) {
    log('❌ No SCOPESTACK_API_TOKEN found in .env.local', colors.red);
    process.exit(1);
  }
  
  try {
    // Step 1: Get account info
    log('\n📋 Step 1: Getting account information...', colors.blue);
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
    
    log(`✅ Account: ${accountSlug} (ID: ${accountId})`, colors.green);
    
    // Step 2: Create a test client
    log('\n📋 Step 2: Creating test client...', colors.blue);
    const timestamp = Date.now();
    const clientResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/clients`, {
      data: {
        type: 'clients',
        attributes: {
          name: `Enhanced Service Test Client ${timestamp}`,
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
    log(`✅ Created client: ${clientResponse.data.data.attributes.name}`, colors.green);
    
    // Step 3: Get available rate tables and payment terms (optional but useful)
    log('\n📋 Step 3: Getting default configurations...', colors.blue);
    let rateTableId = null;
    let paymentTermId = null;
    
    try {
      const rateTablesResponse = await axios.get(`${baseUrl}/${accountSlug}/v1/rate-tables?filter[active]=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json'
        }
      });
      const defaultRateTable = rateTablesResponse.data.data.find(table => table.attributes.default === true);
      rateTableId = defaultRateTable ? defaultRateTable.id : null;
      if (rateTableId) log(`✅ Found default rate table: ${rateTableId}`, colors.green);
    } catch (error) {
      log('⚠️  Could not fetch rate tables', colors.yellow);
    }
    
    // Step 4: Create a test project
    log('\n📋 Step 4: Creating test project...', colors.blue);
    const projectResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/projects`, {
      data: {
        type: 'projects',
        attributes: {
          'project-name': `Enhanced Service Test Project ${timestamp}`,
          'executive-summary': 'Testing enhanced service creation with custom task source',
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
          ...(rateTableId && {
            'rate-table': {
              data: {
                type: 'rate-tables',
                id: rateTableId,
              },
            },
          }),
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
    log(`✅ Created project: ${projectResponse.data.data.attributes.name} (ID: ${projectId})`, colors.green);
    
    // Step 5: Test different service configurations
    log('\n📋 Step 5: Testing service creation with different configurations...', colors.blue);
    
    const testServices = [
      {
        name: 'Meraki 120-48 Switch Configuration',
        description: 'Complete configuration and deployment of Meraki 120-48 switch',
        config: {
          data: {
            type: 'project-services',
            attributes: {
              name: 'Meraki 120-48 Switch Configuration',
              quantity: 40,
              'task-source': 'custom',
              'service-type': 'professional_services',
              'payment-frequency': 'one_time',
              position: 0,
              'service-description': 'Complete configuration and deployment of Meraki 120-48 switch including VLAN setup, port security, and management configuration',
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
        }
      },
      {
        name: 'Network Assessment and Planning',
        description: 'Comprehensive network assessment and future state planning',
        config: {
          data: {
            type: 'project-services',
            attributes: {
              name: 'Network Assessment and Planning',
              quantity: 80,
              'task-source': 'custom',
              'service-type': 'professional_services',
              'payment-frequency': 'one_time',
              position: 1,
              'service-description': 'Comprehensive network assessment including current state analysis, future state design, gap analysis, and implementation roadmap',
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
        }
      },
      {
        name: 'Ongoing Support and Maintenance',
        description: 'Monthly support and maintenance services',
        config: {
          data: {
            type: 'project-services',
            attributes: {
              name: 'Ongoing Support and Maintenance',
              quantity: 20,
              'task-source': 'custom',
              'service-type': 'managed_services',
              'payment-frequency': 'monthly',
              position: 2,
              'service-description': 'Monthly support and maintenance services including monitoring, patches, troubleshooting, and optimization',
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
        }
      }
    ];
    
    const successfulServices = [];
    const failedServices = [];
    
    for (const testService of testServices) {
      log(`\n🔧 Testing service: ${testService.name}`, colors.cyan);
      log(`   Description: ${testService.description}`, colors.reset);
      log(`   Service Type: ${testService.config.data.attributes['service-type']}`, colors.reset);
      log(`   Payment Frequency: ${testService.config.data.attributes['payment-frequency']}`, colors.reset);
      log(`   Task Source: ${testService.config.data.attributes['task-source']}`, colors.reset);
      log(`   Hours: ${testService.config.data.attributes['total-hours']}`, colors.reset);
      
      try {
        const response = await axios.post(`${baseUrl}/${accountSlug}/v1/project-services`, testService.config, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        });
        
        log(`   ✅ Service created successfully! (ID: ${response.data.data.id})`, colors.green);
        successfulServices.push({
          name: testService.name,
          id: response.data.data.id,
          attributes: response.data.data.attributes
        });
        
      } catch (error) {
        log(`   ❌ Service creation failed`, colors.red);
        if (error.response?.status) {
          log(`   Status: ${error.response.status}`, colors.red);
        }
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach(err => {
            log(`   Error: ${err.detail || err.title}`, colors.red);
          });
        }
        failedServices.push({
          name: testService.name,
          error: error.response?.data || error.message
        });
      }
    }
    
    // Step 6: Verify services were added
    log('\n📋 Step 6: Verifying services on project...', colors.blue);
    const projectDetailsResponse = await axios.get(
      `${baseUrl}/${accountSlug}/v1/projects/${projectId}?include=project-services`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );
    
    const projectServices = projectDetailsResponse.data.included?.filter(item => item.type === 'project-services') || [];
    log(`✅ Found ${projectServices.length} services on project:`, colors.green);
    
    let totalHours = 0;
    projectServices.forEach((service, index) => {
      const hours = service.attributes.quantity || service.attributes['total-hours'] || 0;
      totalHours += hours;
      log(`   ${index + 1}. ${service.attributes.name} (${hours} hours)`, colors.cyan);
    });
    log(`   Total Hours: ${totalHours}`, colors.bright);
    
    // Step 7: Summary
    log('\n' + '=' .repeat(60), colors.cyan);
    log('📊 Test Summary', colors.bright);
    log('=' .repeat(60), colors.cyan);
    log(`Project ID: ${projectId}`, colors.blue);
    log(`Project URL: https://app.scopestack.io/${accountSlug}/projects/${projectId}`, colors.blue);
    log(`Successful Services: ${successfulServices.length}`, colors.green);
    log(`Failed Services: ${failedServices.length}`, failedServices.length > 0 ? colors.red : colors.green);
    log(`Total Project Hours: ${totalHours}`, colors.cyan);
    
    if (successfulServices.length > 0) {
      log('\n✅ Successfully Created Services:', colors.green);
      successfulServices.forEach(service => {
        log(`   - ${service.name} (ID: ${service.id})`, colors.green);
      });
    }
    
    if (failedServices.length > 0) {
      log('\n❌ Failed Services:', colors.red);
      failedServices.forEach(service => {
        log(`   - ${service.name}`, colors.red);
      });
    }
    
    log('\n🎉 Test completed successfully!', colors.bright + colors.green);
    
  } catch (error) {
    log('\n❌ Test failed with error:', colors.red);
    log(`Message: ${error.message}`, colors.red);
    
    if (error.response) {
      log(`Status: ${error.response.status}`, colors.red);
      log(`Status Text: ${error.response.statusText}`, colors.red);
      log(`URL: ${error.config?.url}`, colors.red);
      
      if (error.response.data) {
        log('Response Data:', colors.red);
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testEnhancedServiceCreation();