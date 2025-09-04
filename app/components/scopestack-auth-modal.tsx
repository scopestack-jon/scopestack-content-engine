"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, CheckCircle, AlertCircle, User, Building2, Lock, Mail } from "lucide-react"

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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
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
      const response = await fetch("/api/test-scopestack-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const info: AccountInfo = {
          userName: result.userName,
          accountSlug: result.accountSlug,
          accountId: result.accountId,
          email: result.email,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
        }
        setAccountInfo(info)
        setStep("confirm")
        
        // Save session to localStorage
        localStorage.setItem("scopestack_session", JSON.stringify(info))
      } else {
        setError(result.error || "Invalid username or password. Please check and try again.")
      }
    } catch (err) {
      setError("Failed to authenticate. Please check your connection.")
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
    
    // Reset state
    setUsername("")
    setPassword("")
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
              ? "Enter your ScopeStack service account credentials to push content to your account."
              : "Confirm the account details before pushing content."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Service Account Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your service account username"
                disabled={isValidating}
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                Use your ScopeStack service account credentials
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Service Account Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your service account password"
                disabled={isValidating}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && !isValidating && authenticate()}
              />
              <p className="text-xs text-muted-foreground">
                Your credentials are used to obtain secure OAuth tokens.
              </p>
            </div>

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
                disabled={!username || !password || isValidating}
                className="bg-scopestack-primary hover:bg-scopestack-primary/90"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
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