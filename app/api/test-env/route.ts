import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      SCOPESTACK_API_TOKEN: !!process.env.SCOPESTACK_API_TOKEN,
      NEXT_PUBLIC_SCOPESTACK_API_TOKEN: !!process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN,
      SCOPESTACK_API_URL: !!process.env.SCOPESTACK_API_URL,
      NEXT_PUBLIC_SCOPESTACK_API_URL: !!process.env.NEXT_PUBLIC_SCOPESTACK_API_URL,
      SCOPESTACK_ACCOUNT_SLUG: !!process.env.SCOPESTACK_ACCOUNT_SLUG,
      NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG: !!process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG,
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    console.log('🔍 Environment check:', envCheck)

    return Response.json({
      message: "Environment variable check",
      environment: envCheck,
      hasRequiredVars: !!(
        (process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN) &&
        (process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL) &&
        (process.env.SCOPESTACK_ACCOUNT_SLUG || process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG)
      )
    })

  } catch (error) {
    console.error('Environment check failed:', error)
    
    return Response.json({
      error: "Environment check failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}