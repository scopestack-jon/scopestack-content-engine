import { NextRequest } from "next/server"

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
    
    // Test authentication using the /me endpoint with native fetch
    try {
      console.log('Making request with fetch to:', fullUrl)
      console.log('Headers being sent:', {
        'Authorization': `Bearer ${finalApiKey.substring(0, 20)}...`,
        'Accept': 'application/vnd.api+json'
      })
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${finalApiKey}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      
      console.log('Raw response status:', response.status)
      const responseText = await response.text()
      console.log('Raw response text:', responseText)
      
      // Try to parse as JSON
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse response as JSON:', e)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
      
      // Check if we got a 404 even with valid request
      if (response.status === 404) {
        throw new Error('Endpoint not found')
      }
      
      if (response.status === 401) {
        throw new Error('Unauthorized')
      }
      
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      
      if (!responseData || !responseData.data) {
        console.error('Invalid response format:', responseData)
        throw new Error('Invalid response format')
      }
      
      const userData = responseData.data.attributes
      
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
        errorMessage: error.message,
        requestUrl: fullUrl,
        errorDetails: error
      })
      
      if (error.message === 'Unauthorized') {
        return Response.json({ 
          error: "Invalid API key. Please check your API key and try again." 
        }, { status: 401 })
      } else if (error.message === 'Endpoint not found') {
        return Response.json({ 
          error: `API endpoint not found. URL tried: ${fullUrl}. Please verify the API URL is correct.`,
          details: `Expected format: https://api.scopestack.io (no trailing slash)`
        }, { status: 404 })
      } else {
        return Response.json({ 
          error: `Authentication failed: ${error.message}`,
          details: error.message
        }, { status: 500 })
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