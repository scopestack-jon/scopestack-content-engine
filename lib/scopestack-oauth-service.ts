interface OAuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface ScopeStackCredentials {
  username: string
  password: string
}

interface ScopeStackSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountSlug: string
  accountId: string
  userName: string
  email: string
}

class ScopeStackOAuthService {
  private readonly clientId = "I8VeTSSNnwoqnaN5FQ7biwp0_O37RNGjPvZC1v6qRGI"
  private readonly clientSecret = "4BdXU3ipmtkKDuSCycCMWFeOGGsAHoVAzuGfiLzzq8M"
  private readonly tokenEndpoint = "https://app.scopestack.io/oauth/token"
  private readonly authorizeEndpoint = "https://app.scopestack.io/oauth/authorize"
  private readonly apiBaseUrl = "https://api.scopestack.io"

  // Get OAuth authorization URL for redirect flow
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // Remove scope parameter to test if that's causing the issue
    })

    if (state) {
      params.set('state', state)
    }

    return `${this.authorizeEndpoint}?${params.toString()}`
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, redirectUri?: string): Promise<ScopeStackSession> {
    try {
      // Use the provided redirect URI or default to the configured one
      const finalRedirectUri = redirectUri || 'https://scopestack-content-engine.vercel.app/api/oauth/scopestack/callback'
      
      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: finalRedirectUri
      })

      console.log('Exchanging code for tokens:', {
        endpoint: this.tokenEndpoint,
        clientId: this.clientId,
        redirectUri: finalRedirectUri,
        hasCode: !!code
      })

      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      const responseText = await response.text()
      console.log('Token exchange response:', response.status, responseText)

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${responseText}`)
      }

      const tokenResponse: OAuthTokenResponse = JSON.parse(responseText)
      
      // Get user info using the access token
      const userInfo = await this.getUserInfo(tokenResponse.access_token)
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
      
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        accountSlug: userInfo.accountSlug,
        accountId: userInfo.accountId,
        userName: userInfo.userName,
        email: userInfo.email
      }
    } catch (error) {
      console.error('Code exchange failed:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  private getRedirectUri(): string {
    // ScopeStack requires HTTPS redirect URIs, so we need to use production URL
    if (typeof window !== 'undefined') {
      // Browser environment - use current origin
      return `${window.location.origin}/api/oauth/scopestack/callback`
    }
    
    // Server environment - determine URL based on environment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/oauth/scopestack/callback`
    }
    
    if (process.env.NODE_ENV === 'production') {
      return 'https://your-production-domain.com/api/oauth/scopestack/callback'
    }
    
    // For local development, you'll need to use ngrok or deploy to test OAuth
    return 'https://your-vercel-app.vercel.app/api/oauth/scopestack/callback'
  }

  async authenticate(credentials: ScopeStackCredentials): Promise<ScopeStackSession> {
    try {
      // Get OAuth token using password grant
      const tokenResponse = await this.getAccessToken(credentials)
      
      // Get user info using the access token
      const userInfo = await this.getUserInfo(tokenResponse.access_token)
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
      
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        accountSlug: userInfo.accountSlug,
        accountId: userInfo.accountId,
        userName: userInfo.userName,
        email: userInfo.email
      }
    } catch (error) {
      console.error('OAuth authentication failed:', error)
      throw new Error('Authentication failed. Please check your credentials.')
    }
  }

  async refreshSession(refreshToken: string): Promise<ScopeStackSession> {
    try {
      // Refresh the OAuth token
      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      })

      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const tokenResponse: OAuthTokenResponse = await response.json()
      
      // Get updated user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token)
      
      // Calculate new token expiration time
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
      
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        accountSlug: userInfo.accountSlug,
        accountId: userInfo.accountId,
        userName: userInfo.userName,
        email: userInfo.email
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw new Error('Session refresh failed. Please log in again.')
    }
  }

  private async getAccessToken(credentials: ScopeStackCredentials): Promise<OAuthTokenResponse> {
    const formData = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: credentials.username,
      password: credentials.password
    })

    console.log('OAuth token request:', {
      endpoint: this.tokenEndpoint,
      clientId: this.clientId,
      username: credentials.username,
      hasPassword: !!credentials.password
    })

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    console.log('OAuth response status:', response.status)
    const responseText = await response.text()
    console.log('OAuth response body:', responseText)

    if (!response.ok) {
      console.error('OAuth token request failed:', responseText)
      
      // Parse the error response to provide better error messages
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.error === 'invalid_grant') {
          throw new Error('Invalid username or password, or password grant not enabled for this client')
        } else if (errorData.error === 'invalid_client') {
          throw new Error('Invalid client credentials')
        } else {
          throw new Error(errorData.error_description || errorData.error || 'Authentication failed')
        }
      } catch (parseError) {
        throw new Error('Invalid username or password')
      }
    }

    return JSON.parse(responseText)
  }

  private async getUserInfo(accessToken: string): Promise<{
    accountSlug: string
    accountId: string
    userName: string
    email: string
  }> {
    const response = await fetch(`${this.apiBaseUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.api+json',
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user information')
    }

    const data = await response.json()
    
    return {
      accountSlug: data.data?.attributes?.['account-slug'] || '',
      accountId: data.data?.attributes?.['account-id'] || '',
      userName: data.data?.attributes?.name || '',
      email: data.data?.attributes?.email || ''
    }
  }

  isTokenExpired(expiresAt: number): boolean {
    // Check if token expires in less than 5 minutes
    return Date.now() > (expiresAt - 5 * 60 * 1000)
  }
}

export const scopeStackOAuth = new ScopeStackOAuthService()
export type { ScopeStackSession, ScopeStackCredentials }