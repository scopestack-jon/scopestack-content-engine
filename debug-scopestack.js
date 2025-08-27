#!/usr/bin/env node

/**
 * Debug script for ScopeStack API issues
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN;
const baseUrl = 'https://api.scopestack.io';

async function debugScopeStack() {
  console.log('🔍 Debug ScopeStack API');
  console.log('=' .repeat(50));
  
  if (!token) {
    console.error('❌ No SCOPESTACK_API_TOKEN found in .env.local');
    return;
  }
  
  console.log(`✅ Token found: ${token.substring(0, 20)}...`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  
  try {
    // Step 1: Test authentication
    console.log('\n1️⃣ Testing authentication...');
    
    const authResponse = await axios.get(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    console.log('✅ Authentication successful!');
    const userData = authResponse.data.data.attributes;
    console.log(`   User: ${userData.name}`);
    console.log(`   Account ID: ${userData['account-id']}`);
    console.log(`   Account Slug: ${userData['account-slug']}`);
    
    // Step 2: Test creating a client
    console.log('\n2️⃣ Testing client creation...');
    const accountSlug = userData['account-slug'];
    const accountId = userData['account-id'];
    
    const clientResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/clients`, {
      data: {
        type: 'clients',
        attributes: {
          name: 'Debug Test Client ' + Date.now(),
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
    
    console.log('✅ Client creation successful!');
    const clientData = clientResponse.data.data;
    console.log(`   Client ID: ${clientData.id}`);
    console.log(`   Client Name: ${clientData.attributes.name}`);
    
    // Step 3: Test getting rate table and payment term
    console.log('\n3️⃣ Testing rate table and payment terms...');
    
    try {
      const rateTableResponse = await axios.get(`${baseUrl}/${accountSlug}/v1/rate-tables?filter[active]=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      });
      
      const defaultRateTable = rateTableResponse.data.data.find(table => table.attributes.default === true);
      console.log(`   Rate tables found: ${rateTableResponse.data.data.length}`);
      console.log(`   Default rate table: ${defaultRateTable ? defaultRateTable.id : 'None'}`);
    } catch (error) {
      console.log('   ⚠️  Rate table error:', error.response?.data || error.message);
    }
    
    try {
      const paymentTermResponse = await axios.get(`${baseUrl}/${accountSlug}/v1/payment-terms?filter[active]=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      });
      
      const defaultPaymentTerm = paymentTermResponse.data.data.find(term => term.attributes.default === true);
      console.log(`   Payment terms found: ${paymentTermResponse.data.data.length}`);
      console.log(`   Default payment term: ${defaultPaymentTerm ? defaultPaymentTerm.id : 'None'}`);
    } catch (error) {
      console.log('   ⚠️  Payment term error:', error.response?.data || error.message);
    }
    
    // Step 4: Test creating a minimal project
    console.log('\n4️⃣ Testing project creation...');
    
    const projectData = {
      data: {
        type: 'projects',
        attributes: {
          'project-name': 'Debug Test Project ' + Date.now(),
          'executive-summary': 'Test project for debugging',
        },
        relationships: {
          client: {
            data: {
              type: 'clients',
              id: clientData.id,
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
    };
    
    console.log('   Project payload:', JSON.stringify(projectData, null, 2));
    
    const projectResponse = await axios.post(`${baseUrl}/${accountSlug}/v1/projects`, projectData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });
    
    console.log('✅ Project creation successful!');
    const project = projectResponse.data.data;
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Project Name: ${project.attributes.name}`);
    console.log(`   Project Status: ${project.attributes.status}`);
    
    console.log('\n🎉 All tests passed! ScopeStack API is working correctly.');
    console.log('\n💡 The issue might be in the content transformation or API service code.');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
  }
}

debugScopeStack();