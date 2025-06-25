"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search, Brain, FileText, CheckCircle, Settings, Calculator, RotateCcw } from "lucide-react"
import { ResearchProgress } from "./components/research-progress"
import { ContentOutput } from "./components/content-output"
import { SourceAttribution } from "./components/source-attribution"
import Link from "next/link"

interface ResearchStep {
  id: string
  title: string
  status: "pending" | "active" | "completed"
  model?: string
  sources?: string[]
}

interface GeneratedContent {
  technology: string
  questions: Array<{
    id: string
    slug: string
    question: string
    options: Array<{
      key: string
      value: string
      numericalValue: number
      default?: boolean
    }>
  }>
  calculations: Array<{
    id: string
    slug: string
    name: string
    description: string
    formula: string
    mappedQuestions: string[]
    resultType: "multiplier" | "additive" | "conditional"
  }>
  services: Array<{
    phase: string
    service: string
    description: string
    hours: number
    subservices: Array<{
      name: string
      description: string
      hours: number
      mappedQuestions?: string[]
      calculationSlug?: string
    }>
  }>
  totalHours: number
  sources: Array<{
    url: string
    title: string
    relevance: string
  }>
}

export default function ScopeStackContentEngine() {
  const [userInput, setUserInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([])
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [progress, setProgress] = useState(0)
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(false)

  useEffect(() => {
    // Load saved content and input from localStorage
    const savedContent = localStorage.getItem("generated_content")
    const savedInput = localStorage.getItem("user_input")

    if (savedContent) {
      try {
        setGeneratedContent(JSON.parse(savedContent))
      } catch (e) {
        console.error("Failed to parse saved content:", e)
      }
    }

    if (savedInput) {
      setUserInput(savedInput)
    }

    // Log current settings for debugging
    console.log("Current settings loaded:", {
      researchModel: localStorage.getItem("research_model") || "default",
      analysisModel: localStorage.getItem("analysis_model") || "default", 
      contentModel: localStorage.getItem("content_model") || "default",
      formatModel: localStorage.getItem("format_model") || "default",
      hasCustomPrompts: {
        parsing: !!localStorage.getItem("parsing_prompt"),
        research: !!localStorage.getItem("research_prompt"),
        analysis: !!localStorage.getItem("analysis_prompt"),
      }
    })
  }, [])

  // Save content whenever it changes
  useEffect(() => {
    if (generatedContent) {
      console.log("Generated content state updated:", generatedContent)
      localStorage.setItem("generated_content", JSON.stringify(generatedContent))
      setIsResearchCollapsed(true) // Auto-collapse when new content is generated
    }
  }, [generatedContent])

  // Save input whenever it changes
  useEffect(() => {
    if (userInput) {
      localStorage.setItem("user_input", userInput)
    }
  }, [userInput])

  const handleClearContent = () => {
    // Clear all state
    setGeneratedContent(null)
    setUserInput("")
    setResearchSteps([])
    setProgress(0)
    setIsResearchCollapsed(false)
    
    // Clear localStorage
    localStorage.removeItem("generated_content")
    localStorage.removeItem("user_input")
    
    // Provide user feedback
    console.log("Content and input cleared successfully")
  }

  const handleGenerate = async () => {
    console.log("Generate button clicked", { userInput })
    if (!userInput.trim()) return

    setIsProcessing(true)
    setProgress(0)
    setGeneratedContent(null)
    setIsResearchCollapsed(false)

    // Initialize research steps
    const steps: ResearchStep[] = [
      { id: "parse", title: "Parsing Technology Requirements", status: "active" },
      { id: "research", title: "Conducting Live Web Research", status: "pending" },
      { id: "analyze", title: "Analyzing Research Findings", status: "pending" },
      { id: "generate", title: "Generating Content Structure", status: "pending" },
      { id: "format", title: "Formatting for ScopeStack", status: "pending" },
    ]
    setResearchSteps(steps)

    try {
      // Step 1: Parse technology requirements
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: userInput,
          models: {
            research: localStorage.getItem("research_model") || "anthropic/claude-3.5-sonnet",
            analysis: localStorage.getItem("analysis_model") || "openai/gpt-4-turbo",
            content: localStorage.getItem("content_model") || "anthropic/claude-3.5-sonnet",
            format: localStorage.getItem("format_model") || "openai/gpt-4o",
          },
          prompts: {
            parsing: localStorage.getItem("parsing_prompt"),
            research: localStorage.getItem("research_prompt"),
            analysis: localStorage.getItem("analysis_prompt"),
          },
        }),
      })

      if (!response.ok) throw new Error("Research failed")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const currentStep = 0
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "step") {
                setResearchSteps((prev) =>
                  prev.map((step) =>
                    step.id === data.stepId
                      ? { ...step, status: data.status, model: data.model, sources: data.sources }
                      : step,
                  ),
                )
                setProgress(data.progress)
              } else if (data.type === "complete") {
                console.log("Received complete data:", data)
                console.log("Content received:", data.content)
                setGeneratedContent(data.content)
                setProgress(100)
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between mb-4">
            <Button 
              onClick={handleClearContent} 
              variant="outline" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">ScopeStack Research-Driven Content Engine</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Conducts fresh research every time to generate structured professional services content dynamically from
            actual research findings. No templates, no canned data.
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Describe Your Technology Solution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., Cisco ISE implementation for 500-user healthcare organization with HIPAA compliance requirements, including network segmentation and guest access management"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={4}
              className="w-full"
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Be specific about technology, scale, industry, and compliance requirements
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!userInput.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Research Progress */}
        {(isProcessing || researchSteps.length > 0) && (
          <ResearchProgress
            steps={researchSteps}
            progress={progress}
            isCollapsed={isResearchCollapsed && !isProcessing}
            onToggleCollapse={() => setIsResearchCollapsed(!isResearchCollapsed)}
          />
        )}

        {/* Generated Content */}
        {(() => {
          console.log("Checking if should render ContentOutput. generatedContent:", generatedContent)
          return generatedContent && (
            <div className="space-y-6">
              <ContentOutput content={generatedContent} />
              <SourceAttribution sources={generatedContent.sources} />
            </div>
          )
        })()}

        {/* Key Features */}
        <Card className="bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Key Differentiators</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex items-start gap-3">
                <Search className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <div className="font-medium">Fresh Research</div>
                  <div className="text-sm text-gray-600">Live web research for every request</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <div className="font-medium">Multi-Model AI via OpenRouter</div>
                  <div className="text-sm text-gray-600">Multiple AI models for enhanced research quality</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <div className="font-medium">Dynamic Content</div>
                  <div className="text-sm text-gray-600">Zero hardcoded templates</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-orange-600 mt-1" />
                <div>
                  <div className="font-medium">Smart Calculations</div>
                  <div className="text-sm text-gray-600">Ruby-based formulas for dynamic hour adjustments</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-indigo-600 mt-1" />
                <div>
                  <div className="font-medium">ScopeStack Ready</div>
                  <div className="text-sm text-gray-600">Direct integration with calculations and mappings</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
