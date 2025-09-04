import { scopeStackOAuth, type ScopeStackSession } from './scopestack-oauth-service';

class SessionManager {
  private SESSION_KEY = 'scopestack_session';

  // Get current session from localStorage
  getSession(): ScopeStackSession | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(this.SESSION_KEY);
    if (!stored) return null;
    
    try {
      const session = JSON.parse(stored);
      return session;
    } catch {
      return null;
    }
  }

  // Save session to localStorage
  saveSession(session: ScopeStackSession) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  // Clear session
  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
    // Also clear legacy storage
    localStorage.removeItem('scopestack_api_key');
    localStorage.removeItem('scopestack_api_url');
    localStorage.removeItem('scopestack_account_info');
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    const session = this.getSession();
    if (!session) return null;

    // Check if token is expired or will expire soon (5 minutes buffer)
    if (scopeStackOAuth.isTokenExpired(session.expiresAt)) {
      try {
        // Refresh the session
        const response = await fetch('/api/refresh-scopestack-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: session.refreshToken
          })
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const newSession = await response.json();
        this.saveSession(newSession);
        return newSession.accessToken;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.clearSession();
        return null;
      }
    }

    return session.accessToken;
  }

  // Get session info for display
  getAccountInfo() {
    const session = this.getSession();
    if (!session) return null;

    return {
      userName: session.userName,
      accountSlug: session.accountSlug,
      accountId: session.accountId,
      email: session.email
    };
  }
}

export const sessionManager = new SessionManager();