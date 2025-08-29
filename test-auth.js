#!/usr/bin/env node

/**
 * Simple authentication test for ScopeStack API
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const token = process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN;
const baseUrl = process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL || 'https://api.scopestack.io';

async function testAuth() {
  console.log('🔐 Testing ScopeStack Authentication');
  console.log('=' .repeat(50));
  
  if (!token) {
    console.error('❌ No SCOPESTACK_API_TOKEN found in .env.local');
    console.log('\nPlease ensure your .env.local file contains:');
    console.log('SCOPESTACK_API_TOKEN=your-api-token-here');
    console.log('or');
    console.log('NEXT_PUBLIC_SCOPESTACK_API_TOKEN=your-api-token-here');
    return;
  }
  
  console.log(`📍 API URL: ${baseUrl}`);
  console.log(`🔑 Token: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
  console.log();
  
  try {
    console.log('Testing authentication...');
    const response = await axios.get(`${baseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json'
      }
    });
    
    const userData = response.data.data.attributes;
    console.log('✅ Authentication successful!');
    console.log();
    console.log('Account Details:');
    console.log(`  Name: ${userData.name}`);
    console.log(`  Account ID: ${userData['account-id']}`);
    console.log(`  Account Slug: ${userData['account-slug']}`);
    console.log(`  Email: ${userData.email || 'N/A'}`);
    console.log();
    console.log('You can now use this token to push content to ScopeStack!');
    
  } catch (error) {
    console.error('❌ Authentication failed');
    console.log();
    
    if (error.response?.status === 401) {
      console.log('The API token appears to be invalid or expired.');
      console.log('Please check your ScopeStack account and generate a new token.');
      console.log();
      console.log('To get a new token:');
      console.log('1. Log into ScopeStack');
      console.log('2. Go to Settings → API Access');
      console.log('3. Generate a new API token');
      console.log('4. Update your .env.local file');
    } else {
      console.log(`Error: ${error.message}`);
      if (error.response?.data) {
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testAuth();