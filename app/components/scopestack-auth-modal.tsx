"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, CheckCircle, AlertCircle, User, Building2, Lock, Mail, Info } from "lucide-react"

interface ScopeStackAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticated: (accountInfo: AccountInfo) => void
}

interface AccountInfo {
  userName: string
  accountSlug: string
  accountId: string
  email: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function ScopeStackAuthModal({ isOpen, onClose, onAuthenticated }: ScopeStackAuthModalProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [step, setStep] = useState<"input" | "confirm">("input")

  // Check for existing saved session
  useEffect(() => {
    const savedSession = localStorage.getItem("scopestack_session")
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        // Check if token is not expired
        if (session.expiresAt && Date.now() < session.expiresAt) {
          setAccountInfo(session)
          setStep("confirm")
        } else {
          // Session expired, clear it
          localStorage.removeItem("scopestack_session")
        }
      } catch (e) {
        // Invalid saved data, start fresh
        localStorage.removeItem("scopestack_session")
      }
    }
  }, [isOpen])

  const authenticate = async () => {
    setIsValidating(true)
    setError(null)

    try {
      // Generate state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('oauth_state', state)
      
      // Get authorization URL
      const response = await fetch('/api/oauth/scopestack/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      })
      
      const result = await response.json()
      
      if (response.ok && result.authUrl) {
        console.log('Redirecting to OAuth:', result.authUrl)
        // Redirect to ScopeStack OAuth
        window.location.href = result.authUrl
      } else {
        setError(result.error || 'Failed to initiate OAuth flow')
      }
    } catch (err) {
      setError('Failed to start authentication. Please check your connection.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirm = () => {
    if (accountInfo) {
      onAuthenticated(accountInfo)
      onClose()
    }
  }

  const handleChangeAccount = () => {
    // Clear saved session
    localStorage.removeItem("scopestack_session")
    localStorage.removeItem("oauth_state")
    
    // Reset state
    setAccountInfo(null)
    setStep("input")
    setError(null)
  }

  const handleCancel = () => {
    // If user cancels, clear any temporary state but keep saved credentials
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-scopestack-primary" />
            ScopeStack Authentication
          </DialogTitle>
          <DialogDescription>
            {step === "input" 
              ? "Click below to authenticate with ScopeStack using OAuth. You'll be redirected to ScopeStack to sign in."
              : "Confirm the account details before pushing content."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will be redirected to ScopeStack to complete the authentication process securely. 
                After signing in, you'll be redirected back with an authorization code to complete the setup.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Authentication successful!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">User</p>
                  <p className="text-sm text-muted-foreground">{accountInfo?.userName}</p>
                  <p className="text-xs text-muted-foreground">{accountInfo?.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-sm text-muted-foreground">{accountInfo?.accountSlug}</p>
                  <p className="text-xs text-muted-foreground">ID: {accountInfo?.accountId}</p>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Content will be pushed to the account shown above. Please confirm this is correct.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isValidating}>
                Cancel
              </Button>
              <Button 
                onClick={authenticate} 
                disabled={isValidating}
                className="bg-scopestack-primary hover:bg-scopestack-primary/90"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In with ScopeStack
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleChangeAccount}>
                Change Account
              </Button>
              <Button 
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm & Push
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}