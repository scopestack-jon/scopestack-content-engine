import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  console.log('Legacy test scopestack endpoint called')
  
  try {
    const { url, token } = await request.json()

    console.log('Legacy test request:', {
      hasToken: !!token,
      url: url || 'not provided'
    })

    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 })
    }

    // Default to correct ScopeStack API URL if not provided or if it's the old format
    let baseUrl = url || 'https://api.scopestack.io'
    if (baseUrl.includes('app.scopestack.io')) {
      baseUrl = 'https://api.scopestack.io'
    }

    console.log('Testing ScopeStack authentication (legacy):', {
      baseUrl,
      hasToken: !!token,
      tokenPrefix: token.substring(0, 10) + '...'
    })

    // Test connection to ScopeStack API using /v1/me endpoint
    const response = await fetch(`${baseUrl}/v1/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      const userData = data.data.attributes
      
      console.log('Legacy authentication successful:', {
        userName: userData.name,
        accountSlug: userData['account-slug']
      })
      
      return Response.json({ 
        success: true, 
        message: "ScopeStack connection successful",
        userName: userData.name,
        accountSlug: userData['account-slug']
      })
    } else {
      console.error('Legacy authentication failed:', response.status, response.statusText)
      return Response.json({ error: "ScopeStack connection failed" }, { status: response.status })
    }
  } catch (error) {
    console.error("ScopeStack test failed:", error)
    return Response.json({ error: "ScopeStack connection failed" }, { status: 500 })
  }
}
