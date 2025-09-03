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
    
    console.log('Testing ScopeStack authentication:', {
      baseUrl,
      hasApiKey: !!finalApiKey,
      apiKeyPrefix: finalApiKey.substring(0, 10) + '...'
    })
    
    // Test authentication using the /me endpoint
    try {
      const response = await axios.get(`${baseUrl}/v1/me`, {
        headers: {
          'Authorization': `Bearer ${finalApiKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        }
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
        data: error.response?.data
      })
      
      if (error.response?.status === 401) {
        return Response.json({ 
          error: "Invalid API key. Please check your API key and try again." 
        }, { status: 401 })
      } else if (error.response?.status === 404) {
        return Response.json({ 
          error: "API endpoint not found. Please check the API URL." 
        }, { status: 404 })
      } else {
        return Response.json({ 
          error: `Authentication failed: ${error.response?.statusText || error.message}` 
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