import { NextRequest } from "next/server"
import axios from "axios"

export async function POST(request: NextRequest) {
  console.log('Test auth endpoint called')
  
  try {
    const body = await request.json()
    const { apiKey, scopeStackApiKey, apiUrl, scopeStackApiUrl, accountSlug } = body
    
    // Support both parameter name formats for backwards compatibility
    const finalApiKey = apiKey || scopeStackApiKey
    const finalApiUrl = apiUrl || scopeStackApiUrl
    
    console.log('Test auth request:', {
      hasApiKey: !!finalApiKey,
      apiUrl: finalApiUrl || 'not provided',
      accountSlug: accountSlug || 'not provided'
    })
    
    if (!finalApiKey) {
      console.log('No API key provided')
      return Response.json({ 
        error: "API key is required" 
      }, { status: 400 })
    }
    
    // Default to the correct ScopeStack API URL
    const baseUrl = finalApiUrl || 'https://api.scopestack.io'
    
    // Ensure URL doesn't have trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const fullUrl = `${cleanBaseUrl}/v1/me`
    
    console.log('Testing ScopeStack authentication:', {
      baseUrl: cleanBaseUrl,
      fullUrl,
      hasApiKey: !!finalApiKey,
      apiKeyPrefix: finalApiKey.substring(0, 10) + '...'
    })
    
    // Test authentication using the /me endpoint
    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${finalApiKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        timeout: 10000 // Add 10 second timeout
      })
      
      const userData = response.data.data.attributes
      
      console.log('Authentication successful:', {
        userName: userData.name,
        accountSlug: userData['account-slug'],
        accountId: userData['account-id']
      })
      
      return Response.json({
        success: true,
        userName: userData.name,
        accountSlug: userData['account-slug'],
        accountId: userData['account-id'],
        email: userData.email
      })
      
    } catch (error: any) {
      console.error('Authentication failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        requestUrl: fullUrl,
        errorCode: error.code,
        errorMessage: error.message
      })
      
      if (error.response?.status === 401) {
        return Response.json({ 
          error: "Invalid API key. Please check your API key and try again." 
        }, { status: 401 })
      } else if (error.response?.status === 404) {
        return Response.json({ 
          error: `API endpoint not found. URL tried: ${fullUrl}. Please verify the API URL is correct.`,
          details: `Expected format: https://api.scopestack.io (no trailing slash)`
        }, { status: 404 })
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return Response.json({ 
          error: `Cannot connect to ScopeStack API at ${cleanBaseUrl}. Please check the URL.`,
          details: error.message
        }, { status: 503 })
      } else if (error.code === 'ETIMEDOUT') {
        return Response.json({ 
          error: "Connection to ScopeStack API timed out. Please try again.",
          details: `Timeout after 10 seconds trying to reach ${fullUrl}`
        }, { status: 504 })
      } else {
        return Response.json({ 
          error: `Authentication failed: ${error.response?.statusText || error.message}`,
          details: error.response?.data || error.message
        }, { status: error.response?.status || 500 })
      }
    }
    
  } catch (error: any) {
    console.error('Test auth error:', error)
    return Response.json({ 
      error: "Failed to test authentication",
      details: error.message 
    }, { status: 500 })
  }
}