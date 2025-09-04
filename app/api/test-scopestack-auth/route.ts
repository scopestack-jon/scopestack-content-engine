import { NextRequest, NextResponse } from 'next/server';
import { scopeStackOAuth } from '../../../lib/scopestack-oauth-service';

export async function POST(request: NextRequest) {
  console.log('Test auth endpoint called')
  
  try {
    const body = await request.json()
    
    // Check if this is the new OAuth flow (username/password) or legacy API key flow
    if (body.username && body.password) {
      // New OAuth flow
      console.log('Using OAuth authentication flow')
      
      try {
        const session = await scopeStackOAuth.authenticate({
          username: body.username,
          password: body.password
        })
        
        console.log('OAuth authentication successful:', {
          userName: session.userName,
          accountSlug: session.accountSlug,
          accountId: session.accountId
        })
        
        return NextResponse.json({
          success: true,
          userName: session.userName,
          accountSlug: session.accountSlug,
          accountId: session.accountId,
          email: session.email,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt
        })
        
      } catch (error: any) {
        console.error('OAuth authentication failed:', error)
        
        if (error.message.includes('Invalid username or password')) {
          return NextResponse.json({
            error: "Invalid username or password. Please check your credentials."
          }, { status: 401 })
        }
        
        return NextResponse.json({
          error: error.message || "Authentication failed"
        }, { status: 500 })
      }
      
    } else {
      // Legacy API key flow (for backwards compatibility)
      const { apiKey, scopeStackApiKey, apiUrl, scopeStackApiUrl } = body
      
      // Support both parameter name formats for backwards compatibility
      const finalApiKey = apiKey || scopeStackApiKey
      const finalApiUrl = apiUrl || scopeStackApiUrl
      
      console.log('Using legacy API key authentication')
      
      if (!finalApiKey) {
        return NextResponse.json({ 
          error: "API key is required" 
        }, { status: 400 })
      }
      
      const baseUrl = finalApiUrl || 'https://api.scopestack.io'
      const cleanBaseUrl = baseUrl.replace(/\/$/, '')
      const fullUrl = `${cleanBaseUrl}/v1/me`
      
      console.log('Testing ScopeStack authentication:', {
        baseUrl: cleanBaseUrl,
        fullUrl,
        hasApiKey: !!finalApiKey
      })
      
      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            'Accept': 'application/vnd.api+json',
          },
        })
        
        const responseText = await response.text()
        let responseData
        
        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText}`)
        }
        
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
          throw new Error('Invalid response format')
        }
        
        const userData = responseData.data.attributes
        
        return NextResponse.json({
          success: true,
          userName: userData.name,
          accountSlug: userData['account-slug'],
          accountId: userData['account-id'],
          email: userData.email
        })
        
      } catch (error: any) {
        console.error('API key authentication failed:', error)
        
        if (error.message === 'Unauthorized') {
          return NextResponse.json({ 
            error: "Invalid API key. Please check your API key and try again." 
          }, { status: 401 })
        } else if (error.message === 'Endpoint not found') {
          return NextResponse.json({ 
            error: `API endpoint not found. Please verify the API URL is correct.`
          }, { status: 404 })
        } else {
          return NextResponse.json({ 
            error: `Authentication failed: ${error.message}`
          }, { status: 500 })
        }
      }
    }
    
  } catch (error: any) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      error: "Failed to test authentication",
      details: error.message 
    }, { status: 500 })
  }
}