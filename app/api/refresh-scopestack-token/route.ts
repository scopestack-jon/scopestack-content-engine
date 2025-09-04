import { NextRequest, NextResponse } from 'next/server';
import { scopeStackOAuth } from '../../../lib/scopestack-oauth-service';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    console.log('Refreshing ScopeStack OAuth token...');
    
    // Refresh the OAuth session
    const session = await scopeStackOAuth.refreshSession(refreshToken);
    
    console.log('Token refresh successful:', {
      userName: session.userName,
      accountSlug: session.accountSlug,
      expiresAt: new Date(session.expiresAt).toISOString()
    });
    
    return NextResponse.json(session);

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token refresh failed' },
      { status: 401 }
    );
  }
}