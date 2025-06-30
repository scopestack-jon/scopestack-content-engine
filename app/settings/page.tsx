"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  RefreshCw,
  FileText,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"

const DEFAULT_PROMPTS = {
  parsing: `Analyze this technology solution request and extract key information:

"{input}"

Extract and return in JSON format:
- technology: main technology/platform
- scale: number of users/size
- industry: industry sector
- compliance: compliance requirements
- complexity: complexity factors

Be specific and detailed.`,

  research: `Based on this technology solution: "{input}"

Conduct comprehensive research and provide detailed findings about:
1. Implementation methodologies and frameworks
2. Industry best practices and standards
3. Professional services approaches
4. Hour estimates based on complexity
5. Common challenges and solutions
6. Compliance considerations
7. Testing and validation approaches
8. Specific service breakdown requirements
9. Subservice components and dependencies
10. Resource allocation patterns

IMPORTANT: At the end of your research, list the specific sources you would reference for this technology, including:
- Vendor documentation URLs
- Industry standards documents
- Best practice guides
- Case studies
- Professional services benchmarks

Format sources as: SOURCE: [URL] | [Title] | [Relevance]

Provide specific, actionable research findings that would inform professional services scoping.
Focus on current 2024-2025 industry standards and practices.
Include enough detail to generate at least 10 distinct services with 3 subservices each.`,

  analysis: `Analyze these research findings and create structured insights:

Research: {researchFindings}
Original Request: {input}

Create analysis covering:
- Key implementation phases with realistic timelines
- Critical success factors based on industry data
- Resource requirements with skill level specifications
- Risk mitigation strategies from real-world implementations
- Quality assurance approaches following industry standards
- Detailed service breakdown analysis
- Subservice component identification
- Hour estimation methodologies

IMPORTANT: Ensure your analysis provides enough detail to support generating:
- MINIMUM 10 distinct professional services
- Each service must have exactly 3 subservices
- Realistic hour estimates for each component

Base your analysis on current professional services benchmarks and proven methodologies.`,

  scopeLanguage: `Generate professional scope language for the following IT service:

Technology: {technology}
Phase: {phase}
Service: {serviceName}
Subservice: {subserviceName}

You are a senior IT Services Consultant and Statement of Work specialist. Your goal is to write clear, professional, and client-ready Statement of Work (SOW) descriptions that define deliverables, scope boundaries, assumptions, and client responsibilities for specific IT services tasks.

Each SOW entry should be written at the subservice level, but should reflect the context of its parent Service and the Phase in which it occurs.

Writing guidelines:
- Use precise, outcome-oriented language
- Anchor the language in the context of the Phase (e.g., Planning, Implementation, Post-Go Live)
- Reference the parent Service when needed to provide clarity or grouping
- Use active voice and professional tone
- Avoid overly technical jargon unless necessary
- Keep each section concise but comprehensive

Return a JSON object with ONLY these four sections:
{
  "serviceDescription": "Comprehensive explanation of what this subservice entails and delivers",
  "keyAssumptions": "List of assumptions made for this subservice",
  "clientResponsibilities": "What the client must provide or do for this subservice",
  "outOfScope": "What is explicitly excluded from this subservice"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.`
}

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

  // Prompt customization states
  const [parsingPrompt, setParsingPrompt] = useState(DEFAULT_PROMPTS.parsing)
  const [researchPrompt, setResearchPrompt] = useState(DEFAULT_PROMPTS.research)
  const [analysisPrompt, setAnalysisPrompt] = useState(DEFAULT_PROMPTS.analysis)
  const [scopeLanguagePrompt, setScopeLanguagePrompt] = useState(DEFAULT_PROMPTS.scopeLanguage)

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
    { id: "perplexity/llama-3.1-sonar-large-128k-online", name: "Llama-3.1-Sonar-Large", provider: "Perplexity" },
    { id: "microsoft/wizardlm-2-8x22b", name: "WizardLM-2-8x22B", provider: "Microsoft" },
    { id: "qwen/qwen-2-72b-instruct", name: "Qwen-2-72B", provider: "Alibaba" },
    { id: "deepseek/deepseek-coder", name: "DeepSeek-Coder", provider: "DeepSeek" },
  ])

  useEffect(() => {
    // Load saved settings from localStorage
    const savedOpenRouterKey = localStorage.getItem("openrouter_key") || ""
    const savedScopeStackUrl = localStorage.getItem("scopestack_url") || ""
    const savedScopeStackToken = localStorage.getItem("scopestack_token") || ""

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

    // Load saved prompts
    const savedParsingPrompt = localStorage.getItem("parsing_prompt") || DEFAULT_PROMPTS.parsing
    const savedResearchPrompt = localStorage.getItem("research_prompt") || DEFAULT_PROMPTS.research
    const savedAnalysisPrompt = localStorage.getItem("analysis_prompt") || DEFAULT_PROMPTS.analysis
    const savedScopeLanguagePrompt = localStorage.getItem("scope_language_prompt") || DEFAULT_PROMPTS.scopeLanguage

    setParsingPrompt(savedParsingPrompt)
    setResearchPrompt(savedResearchPrompt)
    setAnalysisPrompt(savedAnalysisPrompt)
    setScopeLanguagePrompt(savedScopeLanguagePrompt)
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

  const resetPromptToDefault = (promptType: "parsing" | "research" | "analysis" | "scopeLanguage") => {
    switch (promptType) {
      case "parsing":
        setParsingPrompt(DEFAULT_PROMPTS.parsing)
        break
      case "research":
        setResearchPrompt(DEFAULT_PROMPTS.research)
        break
      case "analysis":
        setAnalysisPrompt(DEFAULT_PROMPTS.analysis)
        break
      case "scopeLanguage":
        setScopeLanguagePrompt(DEFAULT_PROMPTS.scopeLanguage)
        break
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("idle")

    try {
      // Save to localStorage
      localStorage.setItem("openrouter_key", openRouterKey)
      localStorage.setItem("scopestack_url", scopeStackUrl)
      localStorage.setItem("scopestack_token", scopeStackToken)
      
      // Save model selections
      localStorage.setItem("research_model", researchModel)
      localStorage.setItem("analysis_model", analysisModel)
      localStorage.setItem("content_model", contentModel)
      localStorage.setItem("format_model", formatModel)
      
      // Save custom prompts
      localStorage.setItem("parsing_prompt", parsingPrompt)
      localStorage.setItem("research_prompt", researchPrompt)
      localStorage.setItem("analysis_prompt", analysisPrompt)
      localStorage.setItem("scope_language_prompt", scopeLanguagePrompt)

      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    // Reset model selections to defaults
    setResearchModel("anthropic/claude-3.5-sonnet")
    setAnalysisModel("openai/gpt-4-turbo")
    setContentModel("anthropic/claude-3.5-sonnet")
    setFormatModel("openai/gpt-4o")
    
    // Reset prompts to defaults
    setParsingPrompt(DEFAULT_PROMPTS.parsing)
    setResearchPrompt(DEFAULT_PROMPTS.research)
    setAnalysisPrompt(DEFAULT_PROMPTS.analysis)
    setScopeLanguagePrompt(DEFAULT_PROMPTS.scopeLanguage)
    
    // Save the defaults to localStorage
    localStorage.setItem("research_model", "anthropic/claude-3.5-sonnet")
    localStorage.setItem("analysis_model", "openai/gpt-4-turbo")
    localStorage.setItem("content_model", "anthropic/claude-3.5-sonnet")
    localStorage.setItem("format_model", "openai/gpt-4o")
    localStorage.setItem("parsing_prompt", DEFAULT_PROMPTS.parsing)
    localStorage.setItem("research_prompt", DEFAULT_PROMPTS.research)
    localStorage.setItem("analysis_prompt", DEFAULT_PROMPTS.analysis)
    localStorage.setItem("scope_language_prompt", DEFAULT_PROMPTS.scopeLanguage)
    
    setSaveStatus("success")
    setTimeout(() => setSaveStatus("idle"), 3000)
  }

  const testScopeStackConnection = async () => {
    if (!scopeStackUrl || !scopeStackToken) {
      alert("Please enter both ScopeStack URL and API token")
      return
    }

    try {
      const response = await fetch("/api/test-scopestack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scopeStackUrl,
          token: scopeStackToken,
        }),
      })

      if (response.ok) {
        alert("ScopeStack connection successful!")
      } else {
        alert("ScopeStack connection failed. Please check your credentials.")
      }
    } catch (error) {
      alert("ScopeStack connection failed. Please check your credentials.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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
            <p className="text-gray-600">Configure your AI models, prompts, and ScopeStack integration</p>
          </div>
        </div>

        <Tabs defaultValue="ai-models" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-models">AI Models</TabsTrigger>
            <TabsTrigger value="prompts">Custom Prompts</TabsTrigger>
            <TabsTrigger value="scopestack">ScopeStack Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-models" className="space-y-6">
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
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        openrouter.ai/keys
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">Models Used in Research Pipeline:</div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          GPT-4o
                        </Badge>
                        <span>Technology parsing and final formatting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Claude-3.5-Sonnet
                        </Badge>
                        <span>Research and content generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          GPT-4-Turbo
                        </Badge>
                        <span>Analysis and insights</span>
                      </div>
                    </div>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Custom Prompts Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Customize the prompts used in each research step. Use placeholders like {"{input}"},{" "}
                    {"{researchFindings}"} for dynamic content.
                  </AlertDescription>
                </Alert>

                {/* Parsing Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="parsing-prompt" className="text-base font-medium">
                      Technology Parsing Prompt
                    </Label>
                    <Button onClick={() => resetPromptToDefault("parsing")} variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Used to extract technology information from user input. Available placeholder:{" "}
                    <code>{"{input}"}</code>
                  </div>
                  <Textarea
                    id="parsing-prompt"
                    value={parsingPrompt}
                    onChange={(e) => setParsingPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Enter your custom parsing prompt..."
                  />
                </div>

                {/* Research Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="research-prompt" className="text-base font-medium">
                      Live Web Research Prompt
                    </Label>
                    <Button onClick={() => resetPromptToDefault("research")} variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Used to conduct comprehensive research. Available placeholder: <code>{"{input}"}</code>
                  </div>
                  <Textarea
                    id="research-prompt"
                    value={researchPrompt}
                    onChange={(e) => setResearchPrompt(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter your custom research prompt..."
                  />
                </div>

                {/* Analysis Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="analysis-prompt" className="text-base font-medium">
                      Analysis & Insights Prompt
                    </Label>
                    <Button onClick={() => resetPromptToDefault("analysis")} variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Used to analyze research findings. Available placeholders: <code>{"{input}"}</code>,{" "}
                    <code>{"{researchFindings}"}</code>
                  </div>
                  <Textarea
                    id="analysis-prompt"
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    placeholder="Enter your custom analysis prompt..."
                  />
                </div>

                {/* Scope Language Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scope-language-prompt" className="text-base font-medium">
                      Scope Language Prompt
                    </Label>
                    <Button onClick={() => resetPromptToDefault("scopeLanguage")} variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Used to generate professional scope language for services. Available placeholders: <code>{"{technology}"}</code>,{" "}
                    <code>{"{phase}"}</code>, <code>{"{serviceName}"}</code>, <code>{"{subserviceName}"}</code>
                  </div>
                  <Textarea
                    id="scope-language-prompt"
                    value={scopeLanguagePrompt}
                    onChange={(e) => setScopeLanguagePrompt(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    placeholder="Enter your custom scope language prompt..."
                  />
                </div>

                <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-800 mb-2">Prompt Guidelines:</div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <div>• Use clear, specific instructions for best results</div>
                    <div>• Include format requirements (JSON, structured text, etc.)</div>
                    <div>• Specify the type of output you expect</div>
                    <div>• Test prompts with different input types</div>
                    <div>• Use placeholders for dynamic content injection</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scopestack" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  ScopeStack Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    Connect to your ScopeStack instance to automatically push generated content and enable advanced
                    calculations.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scopestack-url">ScopeStack URL</Label>
                    <Input
                      id="scopestack-url"
                      type="url"
                      placeholder="https://your-instance.scopestack.com"
                      value={scopeStackUrl}
                      onChange={(e) => setScopeStackUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scopestack-token">API Token</Label>
                    <Input
                      id="scopestack-token"
                      type="password"
                      placeholder="Your ScopeStack API token"
                      value={scopeStackToken}
                      onChange={(e) => setScopeStackToken(e.target.value)}
                    />
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

                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <div className="text-sm font-medium text-green-800 mb-2">Integration Features:</div>
                  <div className="text-xs text-green-700 space-y-1">
                    <div>• Automatic content push to ScopeStack</div>
                    <div>• Question numerical values for calculations</div>
                    <div>• Subservice mapping to discovery questions</div>
                    <div>• Dynamic hour calculations based on responses</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                <Button 
                  onClick={resetToDefaults} 
                  variant="outline" 
                  className="text-gray-600 hover:text-gray-800"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
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
