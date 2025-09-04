import { NextRequest, NextResponse } from 'next/server';
import { scopeStackOAuth } from '../../../../../lib/scopestack-oauth-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state,
      error
    });

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?oauth_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/?oauth_error=no_code', request.url)
      );
    }

    // Exchange authorization code for tokens
    const session = await scopeStackOAuth.exchangeCodeForTokens(code);
    
    console.log('OAuth callback successful:', {
      userName: session.userName,
      accountSlug: session.accountSlug
    });

    // Store session in a way that the frontend can access it
    // We'll use a temporary cookie or redirect with session data
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('oauth_success', 'true');
    redirectUrl.searchParams.set('session_data', btoa(JSON.stringify(session)));

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/?oauth_error=${encodeURIComponent('callback_failed')}`, request.url)
    );
  }
}