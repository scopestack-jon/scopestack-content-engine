"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Key,
  ExternalLink,
  CheckCircle,
  Save,
  ArrowLeft,
  Database,
  Brain,
  TestTube,
  Settings,
} from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const [openRouterKey, setOpenRouterKey] = useState("")
  const [scopeStackUrl, setScopeStackUrl] = useState("")
  const [scopeStackToken, setScopeStackToken] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const [researchModel, setResearchModel] = useState("anthropic/claude-3.5-sonnet")
  const [analysisModel, setAnalysisModel] = useState("openai/gpt-4-turbo")
  const [contentModel, setContentModel] = useState("anthropic/claude-3.5-sonnet")
  const [formatModel, setFormatModel] = useState("openai/gpt-4o")

  const [availableModels, setAvailableModels] = useState([
    { id: "anthropic/claude-3.5-sonnet", name: "Claude-3.5-Sonnet", provider: "Anthropic" },
    { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "openai/gpt-4-turbo", name: "GPT-4-Turbo", provider: "OpenAI" },
    { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama-3.1-70B", provider: "Meta" },
    { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
    { id: "anthropic/claude-3-opus", name: "Claude-3-Opus", provider: "Anthropic" },
    { id: "anthropic/claude-3-haiku", name: "Claude-3-Haiku", provider: "Anthropic" },
    { id: "openai/gpt-3.5-turbo", name: "GPT-3.5-Turbo", provider: "OpenAI" },
    { id: "mistralai/mixtral-8x7b-instruct", name: "Mixtral-8x7B", provider: "Mistral AI" },
    { id: "mistralai/mistral-7b-instruct", name: "Mistral-7B", provider: "Mistral AI" },
    { id: "cohere/command-r-plus", name: "Command R+", provider: "Cohere" },
    { id: "perplexity/sonar", name: "Sonar", provider: "Perplexity" },
    { id: "perplexity/sonar-pro", name: "Sonar Pro", provider: "Perplexity" },
    { id: "microsoft/wizardlm-2-8x22b", name: "WizardLM-2-8x22B", provider: "Microsoft" },
    { id: "qwen/qwen-2-72b-instruct", name: "Qwen-2-72B", provider: "Alibaba" },
    { id: "deepseek/deepseek-coder", name: "DeepSeek-Coder", provider: "DeepSeek" },
    { id: "x-ai/grok-3-mini-beta", name: "Grok-3-Mini", provider: "X AI" },
  ])

  useEffect(() => {
    // Load saved settings from localStorage
    const savedOpenRouterKey = localStorage.getItem("openrouter_key") || ""
    const savedScopeStackUrl = localStorage.getItem("scopestack_api_url") || "https://api.scopestack.io"
    const savedScopeStackToken = localStorage.getItem("scopestack_api_key") || ""

    setOpenRouterKey(savedOpenRouterKey)
    setScopeStackUrl(savedScopeStackUrl)
    setScopeStackToken(savedScopeStackToken)

    const savedResearchModel = localStorage.getItem("research_model") || "anthropic/claude-3.5-sonnet"
    const savedAnalysisModel = localStorage.getItem("analysis_model") || "openai/gpt-4-turbo"
    const savedContentModel = localStorage.getItem("content_model") || "anthropic/claude-3.5-sonnet"
    const savedFormatModel = localStorage.getItem("format_model") || "openai/gpt-4o"

    setResearchModel(savedResearchModel)
    setAnalysisModel(savedAnalysisModel)
    setContentModel(savedContentModel)
    setFormatModel(savedFormatModel)
  }, [])

  // Fetch all available models from OpenRouter when API key changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!openRouterKey) return
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          const models = data.data.map((model: any) => ({
            id: model.id,
            name: model.name || model.id.split("/").pop(),
            provider: model.id.split("/")[0],
          }))
          setAvailableModels(models)
        }
      } catch (error) {
        console.error("Failed to fetch OpenRouter models:", error)
      }
    }
    fetchModels()
  }, [openRouterKey])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("idle")

    try {
      // Save to localStorage
      localStorage.setItem("openrouter_key", openRouterKey)
      localStorage.setItem("scopestack_api_key", scopeStackToken)
      localStorage.setItem("scopestack_api_url", scopeStackUrl)
      localStorage.setItem("scopestack_account_slug", "")
      localStorage.setItem("scopestack_workflow", "project-with-services")
      localStorage.setItem("scopestack_use_direct_services", "true")
      localStorage.setItem("scopestack_skip_survey", "false")
      localStorage.setItem("scopestack_skip_document", "false")
      
      // Save model selections
      localStorage.setItem("research_model", researchModel)
      localStorage.setItem("analysis_model", analysisModel)
      localStorage.setItem("content_model", contentModel)
      localStorage.setItem("format_model", formatModel)

      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  const testScopeStackConnection = async () => {
    if (!scopeStackUrl || !scopeStackToken) {
      alert("Please enter both ScopeStack URL and API key")
      return
    }

    try {
      const response = await fetch("/api/test-scopestack-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: scopeStackToken,
          apiUrl: scopeStackUrl,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`ScopeStack connection successful! Connected as: ${result.userName || 'Unknown'} (${result.accountSlug || 'Unknown'})`)
      } else {
        const result = await response.json()
        alert(`ScopeStack connection failed: ${result.error || 'Please check your credentials.'}`)
      }
    } catch (error) {
      alert("ScopeStack connection failed. Please check your credentials.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scopestack-primary/5 to-scopestack-button/10 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Engine
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Configure your AI models and ScopeStack integration</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* ScopeStack Integration Section */}
          <section>
            <h2 className="text-2xl font-bold text-scopestack-primary mb-4">ScopeStack Integration</h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    API Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      Connect to your ScopeStack instance to automatically push generated content.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scopestack-api-key">ScopeStack API Key <span className="text-red-500">*</span></Label>
                      <Input
                        id="scopestack-api-key"
                        type="password"
                        placeholder="Enter your ScopeStack API key"
                        value={scopeStackToken}
                        onChange={(e) => setScopeStackToken(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Your API key can be found in ScopeStack Settings → API Access</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scopestack-api-url">API URL</Label>
                      <Input
                        id="scopestack-api-url"
                        type="url"
                        placeholder="https://api.scopestack.io"
                        value={scopeStackUrl}
                        onChange={(e) => setScopeStackUrl(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Default: https://api.scopestack.io</p>
                    </div>

                    <Button
                      onClick={testScopeStackConnection}
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={!scopeStackUrl || !scopeStackToken}
                    >
                      <TestTube className="h-4 w-4" />
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* API Keys & Models Section - Hidden since we use static LLM endpoints */}
          {/* <section>
            <h2 className="text-2xl font-bold text-scopestack-primary mb-4">API Keys & Models</h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    OpenRouter Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      OpenRouter provides access to multiple AI models (GPT-4o, Claude-3.5-Sonnet, GPT-4-Turbo) for
                      enhanced research quality.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                      <Input
                        id="openrouter-key"
                        type="password"
                        placeholder="sk-or-..."
                        value={openRouterKey}
                        onChange={(e) => setOpenRouterKey(e.target.value)}
                      />
                      <div className="text-sm text-gray-500">
                        Get your API key from{" "}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-scopestack-primary hover:text-scopestack-primary/80 inline-flex items-center gap-1"
                        >
                          openrouter.ai/keys
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">Model Selection for Research Pipeline:</div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="research-model">Live Web Research</Label>
                          <select
                            id="research-model"
                            value={researchModel}
                            onChange={(e) => setResearchModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scopestack-primary focus:border-scopestack-primary"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="analysis-model">Analyzing Findings</Label>
                          <select
                            id="analysis-model"
                            value={analysisModel}
                            onChange={(e) => setAnalysisModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scopestack-primary focus:border-scopestack-primary"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="content-model">Generating Content Structure</Label>
                          <select
                            id="content-model"
                            value={contentModel}
                            onChange={(e) => setContentModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scopestack-primary focus:border-scopestack-primary"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="format-model">Formatting for ScopeStack</Label>
                          <select
                            id="format-model"
                            value={formatModel}
                            onChange={(e) => setFormatModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-scopestack-primary focus:border-scopestack-primary"
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section> */}

          {/* Other Section */}
          <section>
            <h2 className="text-2xl font-bold text-scopestack-primary mb-4">Other</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure general application preferences.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="debug-mode" className="rounded" />
                    <Label htmlFor="debug-mode" className="text-sm">
                      Enable debug mode (shows additional logging and controls)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="auto-save" className="rounded" />
                    <Label htmlFor="auto-save" className="text-sm">
                      Auto-save user input
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Save Button */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Settings are saved locally and used for API connections</div>
              <div className="flex items-center gap-2">
                {saveStatus === "success" && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
                {saveStatus === "error" && <Badge variant="destructive">Error saving</Badge>}
                <Button onClick={handleSave} disabled={isSaving} className="bg-scopestack-primary hover:bg-scopestack-primary/90 text-white">
                  {isSaving ? (
                    <>
                      <Key className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}