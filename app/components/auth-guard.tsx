"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  LogIn, 
  Shield, 
  Key, 
  User, 
  Database,
  CheckCircle,
  LogOut,
  Settings
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ScopeStackSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountSlug: string
  accountId: string
  userName: string
  email: string
}

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [session, setSession] = useState<ScopeStackSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    checkAuthStatus()
    
    // Handle OAuth success callback
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const sessionData = urlParams.get('session_data');

    if (oauthSuccess === 'true' && sessionData) {
      try {
        const sessionObj = JSON.parse(atob(sessionData));
        localStorage.setItem('scopestack_session', JSON.stringify(sessionObj));
        setSession(sessionObj);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Failed to process OAuth session:', error);
      }
    }
  }, [])

  const checkAuthStatus = () => {
    try {
      const savedSession = localStorage.getItem('scopestack_session')
      if (savedSession) {
        const sessionObj = JSON.parse(savedSession)
        if (sessionObj.expiresAt > Date.now()) {
          setSession(sessionObj)
        } else {
          // Session expired, remove it
          localStorage.removeItem('scopestack_session')
          setSession(null)
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      localStorage.removeItem('scopestack_session')
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  const authenticate = async () => {
    setIsAuthenticating(true)
    try {
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('oauth_state', state)
      
      const response = await fetch('/api/oauth/scopestack/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      })
      
      const result = await response.json()
      if (response.ok && result.authUrl) {
        window.location.href = result.authUrl
      } else {
        alert('Failed to start authentication')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      alert('Failed to start authentication')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem('scopestack_session')
    setSession(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-scopestack-primary to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-scopestack-button/20 border-t-scopestack-button mx-auto mb-6"></div>
          <p className="text-slate-300 text-lg">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-scopestack-primary to-slate-800">
        {/* Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center p-4">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,196,171,0.1),transparent_50%)]"></div>
          
          <div className="relative z-10 max-w-lg mx-auto">
            {/* Logo and Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-8">
                <Image 
                  src="/scopestack-logo-white.png" 
                  alt="ScopeStack" 
                  width={240} 
                  height={48}
                  className="h-12 w-auto"
                />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                AI Services Content Engine
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                Research-driven content generation for professional services
              </p>
            </div>

            {/* Authentication Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-scopestack-button/10 rounded-full mb-4">
                    <Shield className="h-8 w-8 text-scopestack-button" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-slate-600">
                    Sign in to your Content Engine Workspace
                  </p>
                </div>

                <div className="space-y-6">
                  <Button
                    onClick={authenticate}
                    disabled={isAuthenticating}
                    size="lg"
                    className="w-full bg-scopestack-button hover:bg-scopestack-button/90 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    {isAuthenticating ? (
                      <>
                        <Key className="h-5 w-5 mr-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5 mr-3" />
                        Authenticate with ScopeStack
                      </>
                    )}
                  </Button>

                  {/* Feature Benefits */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">AI-Powered Research</p>
                          <p className="text-sm text-slate-600">Advanced content generation with intelligent research capabilities</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Workspace Integration</p>
                          <p className="text-sm text-slate-600">Seamlessly connects with your ScopeStack projects and services</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Automated Workflow</p>
                          <p className="text-sm text-slate-600">Streamlined project creation and content management</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-slate-400 text-sm">
                Secure authentication powered by ScopeStack
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, show the app with user info
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top auth bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-700">
              Signed in as <strong className="text-slate-900">{session.userName}</strong> ({session.accountSlug})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-slate-300 hover:bg-slate-50">
                <Settings className="h-3 w-3" />
                Settings
              </Button>
            </Link>
            <Button 
              onClick={signOut}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main app content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}