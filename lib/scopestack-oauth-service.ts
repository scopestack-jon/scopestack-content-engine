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
  private readonly clientId = "xmhTrbBbsVIOmZZkxkDxvx5towkN5wIFtSmO9dacYh4"
  private readonly clientSecret = "wrh-uLcXu2px5QWSygoMl7zu6wU6N5C7WkhrHr0cJn8"
  private readonly tokenEndpoint = "https://app.scopestack.io/oauth/token"
  private readonly apiBaseUrl = "https://api.scopestack.io"

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

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OAuth token request failed:', error)
      throw new Error('Invalid username or password')
    }

    return response.json()
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