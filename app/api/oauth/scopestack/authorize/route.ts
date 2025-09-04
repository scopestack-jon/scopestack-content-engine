import { NextRequest, NextResponse } from 'next/server';
import { scopeStackOAuth } from '../../../../../lib/scopestack-oauth-service';

export async function POST(request: NextRequest) {
  try {
    const { state } = await request.json();

    console.log('Generating OAuth authorization URL...');
    
    // Use Vercel HTTPS callback URL
    const redirectUri = 'https://scopestack-content-engine.vercel.app/api/oauth/scopestack/callback';
    
    // Generate the OAuth authorization URL
    const authUrl = scopeStackOAuth.getAuthorizationUrl(redirectUri, state);
    
    console.log('OAuth authorization URL generated:', {
      authUrl,
      redirectUri,
      state
    });

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri
    });

  } catch (error) {
    console.error('OAuth authorization URL generation failed:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}