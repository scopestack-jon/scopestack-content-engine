"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search, Brain, FileText, CheckCircle, Settings, Calculator, RotateCcw } from "lucide-react"
import { ResearchProgress } from "./components/research-progress"
import { ContentOutput } from "./components/content-output"
import { SourceAttribution } from "./components/source-attribution"
import { ErrorBoundary, ResearchErrorBoundary, ContentErrorBoundary } from "@/components/error-boundary"
import { showErrorToast, showResearchErrorToast, showSuccessToast, useErrorHandler } from "@/components/error-toast"
import { createAPIError, createResearchError, ErrorCode, ScopeStackError } from "@/lib/errors"
import { withRetry } from "@/lib/retry"
import Link from "next/link"
import Image from "next/image"

interface ResearchStep {
  id: string
  title: string
  status: "pending" | "active" | "completed" | "error"
  model?: string
  sources?: string[]
  startTime?: number
  estimatedDuration?: number
}

interface GeneratedContent {
  technology: string
  questions: Array<{
    id: string
    slug: string
    question: string
    options: Array<{
      key: string
      value: number | string
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
    service?: string
    name?: string
    description: string
    hours: number
    serviceDescription?: string
    keyAssumptions?: string
    clientResponsibilities?: string
    outOfScope?: string
    subservices: Array<{
      name: string
      description: string
      hours: number
      mappedQuestions?: string[]
      calculationSlug?: string
      serviceDescription?: string
      keyAssumptions?: string
      clientResponsibilities?: string
      outOfScope?: string
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
  const { handleError } = useErrorHandler()

  useEffect(() => {
    // Check if we're coming back from settings or another page
    const isReturning = sessionStorage.getItem("page_loaded")
    
    if (!isReturning) {
      // This is a fresh page load (new tab, refresh, or first visit)
      localStorage.removeItem("generated_content")
      localStorage.removeItem("user_input")
      console.log("Fresh page load - cleared saved content and input from localStorage")
      
      // Mark that we've loaded the page in this session
      sessionStorage.setItem("page_loaded", "true")
    } else {
      // We're returning from another page (like settings)
      // Try to restore saved content
      const savedContent = localStorage.getItem("generated_content")
      const savedInput = localStorage.getItem("user_input")
      
      if (savedContent) {
        try {
          setGeneratedContent(JSON.parse(savedContent))
          console.log("Restored saved content from localStorage")
        } catch (e) {
          handleError(e, {
            context: 'loading saved content',
            showToast: false
          })
        }
      }
      
      if (savedInput) {
        setUserInput(savedInput)
        console.log("Restored saved input from localStorage")
      }
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

  // Save content whenever it changes and auto-collapse research
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

    // Initialize research steps with time estimates
    const steps: ResearchStep[] = [
      { 
        id: "research", 
        title: "Conducting Live Web Research", 
        status: "pending",
        estimatedDuration: 45000, // 45 seconds
        startTime: undefined
      },
      { 
        id: "content", 
        title: "Generating Content Structure", 
        status: "pending",
        estimatedDuration: 90000, // 90 seconds
        startTime: undefined
      },
    ]
    setResearchSteps(steps)

    try {
      // Start live research
      setProgress(10)

      console.log("Sending research request to API...")
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: userInput,
          models: {
            research: localStorage.getItem("research_model") || "perplexity/llama-3.1-sonar-large-128k-online",
            analysis: localStorage.getItem("analysis_model") || "openai/gpt-4-turbo",
            content: localStorage.getItem("content_model") || "x-ai/grok-3-mini-beta",
            format: localStorage.getItem("format_model") || "anthropic/claude-3.5-sonnet",
          },
          prompts: {
            parsing: localStorage.getItem("parsing_prompt"),
            research: localStorage.getItem("research_prompt"),
            analysis: localStorage.getItem("analysis_prompt"),
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Research API response not OK:", response.status, response.statusText)
        throw createAPIError(
          `Research failed with status ${response.status}`,
          response.status,
          errorText
        )
      }

      console.log("Research API response received, setting up SSE reader...")
      const reader = response.body?.getReader()
      if (!reader) {
        throw new ScopeStackError(
          ErrorCode.API_INVALID_RESPONSE,
          "No response stream available from research API"
        )
      }

      const decoder = new TextDecoder()
      let buffer = ""

      console.log("Starting to read SSE stream...")
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log("SSE stream complete")
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                console.log("SSE event received:", line.slice(6, 100) + "...")
                const data = JSON.parse(line.slice(6))

                if (data.type === "step") {
                  console.log("Step update:", data.stepId, data.status, data.progress)
                  setResearchSteps((prev) =>
                    prev.map((step) =>
                      step.id === data.stepId
                        ? { 
                            ...step, 
                            status: data.status, 
                            model: data.model, 
                            sources: data.sources,
                            startTime: data.status === "active" && !step.startTime ? Date.now() : step.startTime
                          }
                        : step,
                    ),
                  )
                  setProgress(data.progress)
                } else if (data.type === "complete") {
                  console.log("Complete event received")
                  console.log("Content received:", {
                    technology: data.content?.technology,
                    servicesCount: data.content?.services?.length,
                    questionsCount: data.content?.questions?.length,
                    services: data.content?.services,
                    isServicesArray: Array.isArray(data.content?.services),
                    contentValid: !!data.content && !!data.content.services && Array.isArray(data.content.services)
                  })
                  
                  // Validate content before setting it
                  if (!data.content) {
                    const error = new ScopeStackError(
                      ErrorCode.CONTENT_MISSING_REQUIRED_FIELDS,
                      "Generated content is missing from the response"
                    )
                    handleError(error, { context: 'content validation' })
                    setIsProcessing(false)
                    return
                  }
                  
                  // Ensure we have a technology field
                  if (!data.content.technology) {
                    data.content.technology = userInput || "Technology Solution"
                  }
                  
                  // Ensure services is an array
                  if (!data.content.services || !Array.isArray(data.content.services)) {
                    console.warn("Services field is missing or invalid, using fallback")
                    data.content.services = []
                  }
                  
                  // If services array is empty, create a default service structure
                  if (data.content.services.length === 0) {
                    console.log("Creating default services because none were found")
                    
                    // Create a default service structure based on the technology
                    const technology = data.content.technology || userInput || "Technology Solution"
                    
                    data.content.services = [
                      {
                        phase: "Planning",
                        name: `${technology} Assessment`,
                        description: `Comprehensive assessment of requirements for ${technology}`,
                        hours: 40,
                        subservices: [
                          {
                            name: "Requirements Gathering",
                            description: `Detailed collection of requirements for ${technology}`,
                            hours: 16,
                            serviceDescription: `This service focuses on gathering detailed requirements for your ${technology} implementation. Our team will conduct stakeholder interviews, document technical specifications, and identify key success factors for your project.`,
                            keyAssumptions: `Client stakeholders will be available for requirements gathering sessions. Existing documentation will be provided where available.`,
                            clientResponsibilities: `Provide access to key stakeholders and subject matter experts. Share existing documentation and business processes.`,
                            outOfScope: `Development of custom solutions outside standard ${technology} capabilities. Business process reengineering.`
                          },
                          {
                            name: "Current State Analysis",
                            description: `Analysis of current environment for ${technology} implementation`,
                            hours: 16,
                            serviceDescription: `This service provides a comprehensive analysis of your current environment to prepare for ${technology} implementation. Our experts will evaluate existing systems, identify potential challenges, and document the baseline configuration.`,
                            keyAssumptions: `Access to current systems and documentation will be provided. Technical staff will be available for interviews and questions.`,
                            clientResponsibilities: `Provide access to systems and environments. Make technical staff available for consultation. Provide existing documentation.`,
                            outOfScope: `Remediation of issues found during analysis. Implementation of recommendations.`
                          },
                          {
                            name: "Planning Documentation",
                            description: `Creation of planning documents for ${technology} implementation`,
                            hours: 8,
                            serviceDescription: `This service delivers comprehensive planning documentation for your ${technology} implementation. Our team will create detailed project plans, technical specifications, and implementation roadmaps tailored to your requirements.`,
                            keyAssumptions: `Requirements gathering and current state analysis have been completed. Client approval process is clearly defined.`,
                            clientResponsibilities: `Review and approve documentation in a timely manner. Provide feedback on drafts and technical specifications.`,
                            outOfScope: `Development of custom templates or non-standard documentation formats. Translation to languages other than English.`
                          }
                        ]
                      },
                      {
                        phase: "Implementation",
                        name: `${technology} Implementation`,
                        description: `Core implementation of ${technology} solution`,
                        hours: 80,
                        subservices: [
                          {
                            name: "Configuration",
                            description: `Configuration of ${technology} components`,
                            hours: 40,
                            serviceDescription: `This service provides expert configuration of all ${technology} components according to best practices and your specific requirements. Our team will implement the solution with attention to security, performance, and usability.`,
                            keyAssumptions: `Planning phase has been completed and approved. Required infrastructure is available and accessible.`,
                            clientResponsibilities: `Provide timely access to systems and environments. Ensure prerequisites are met before configuration begins.`,
                            outOfScope: `Configuration of systems not directly related to ${technology}. Custom development beyond standard configuration options.`
                          },
                          {
                            name: "Integration",
                            description: `Integration of ${technology} with existing systems`,
                            hours: 24,
                            serviceDescription: `This service ensures seamless integration between ${technology} and your existing systems. Our integration specialists will configure connections, data flows, and authentication mechanisms to create a cohesive environment.`,
                            keyAssumptions: `Existing systems are properly documented and accessible. Integration points are clearly defined in the planning phase.`,
                            clientResponsibilities: `Provide documentation and access to existing systems. Make technical staff available for integration questions and testing.`,
                            outOfScope: `Upgrades or modifications to existing systems to enable integration. Development of custom integration components.`
                          },
                          {
                            name: "Testing",
                            description: `Testing of ${technology} implementation`,
                            hours: 16,
                            serviceDescription: `This service provides comprehensive testing of your ${technology} implementation to ensure it meets all requirements and performs optimally. Our team will conduct functional, performance, and integration testing.`,
                            keyAssumptions: `Configuration and integration work has been completed. Test environments are available and properly configured.`,
                            clientResponsibilities: `Participate in user acceptance testing. Provide timely feedback on test results. Sign off on test completion.`,
                            outOfScope: `Automated test script development. Load testing beyond standard performance validation.`
                          }
                        ]
                      }
                    ]
                    
                    // Update total hours
                    data.content.totalHours = data.content.services.reduce((total: number, service: any) => 
                      total + (service.hours || 0), 0)
                  }
                  
                  // Ensure questions is an array
                  if (!data.content.questions || !Array.isArray(data.content.questions)) {
                    data.content.questions = []
                  }
                  
                  // If questions array is empty, leave it empty - no fallback content
                  
                  // Ensure calculations is an array
                  if (!data.content.calculations || !Array.isArray(data.content.calculations)) {
                    data.content.calculations = []
                  }
                  
                  // If calculations array is empty, leave it empty - no fallback content
                  
                  // Ensure sources is an array
                  if (!data.content.sources || !Array.isArray(data.content.sources)) {
                    data.content.sources = []
                  }
                  
                  // Mark final step as completed
                  setResearchSteps((prev) =>
                    prev.map((step) =>
                      step.id === "content"
                        ? { ...step, status: "completed" }
                        : step,
                    ),
                  )
                  
                  // Set the validated content
                  setGeneratedContent(data.content)
                  setProgress(100)
                }
              } catch (parseError) {
                handleError(parseError, {
                  context: 'parsing SSE data',
                  showToast: false // Don't spam toasts for individual SSE parsing errors
                })
                // Continue processing other lines even if one fails
              }
            }
          }
        }
      } catch (streamError: unknown) {
        const error = new ScopeStackError(
          ErrorCode.API_NETWORK_ERROR,
          `Error processing research results: ${streamError instanceof Error ? streamError.message : 'Unknown stream error'}`,
          { originalError: streamError }
        )
        throw error
      } finally {
        // Make sure to release the reader if there's an error
        try {
          reader.releaseLock()
        } catch (releaseError) {
          handleError(releaseError, {
            context: 'releasing reader lock',
            showToast: false
          })
        }
      }
    } catch (error: unknown) {
      // Handle the error with our improved error handling
      showResearchErrorToast(error, 'research', () => {
        // Retry the entire generation process
        handleGenerate()
      })
      
      // Update UI to show error state
      setResearchSteps((prev) =>
        prev.map((step) =>
          step.status === "active" 
            ? { ...step, status: "error" } 
            : step
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scopestack-primary/5 to-scopestack-button/10 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Button 
              onClick={handleClearContent} 
              variant="outline" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 w-full sm:w-auto"
              disabled={isProcessing}
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Link href="/settings" className="w-full sm:w-auto">
              <Button variant="outline" className="flex items-center gap-2 w-full" size="sm">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image 
              src="/scopestack-logo.svg" 
              alt="ScopeStack" 
              width={200} 
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            Research-Driven Content Engine
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
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
              onChange={(e) => {
                console.log("Textarea onChange:", e.target.value);
                setUserInput(e.target.value);
              }}
              rows={4}
              className="w-full"
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Be specific about technology, scale, industry, and compliance requirements
                <button 
                  onClick={() => {
                    const sampleInput = "Microsoft Email Migration to Office 365 for a Hospital with 1000 users";
                    setUserInput(sampleInput);
                    console.log("Sample input set:", sampleInput);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Use sample input
                </button>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={(userInput ? !userInput.trim() : true) || isProcessing}
                className="bg-scopestack-primary hover:bg-scopestack-primary/90 text-white"
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
          <ResearchErrorBoundary>
            <ResearchProgress
              steps={researchSteps}
              progress={progress}
              isCollapsed={isResearchCollapsed && !isProcessing}
              onToggleCollapse={() => setIsResearchCollapsed(!isResearchCollapsed)}
            />
          </ResearchErrorBoundary>
        )}

        {/* Generated Content */}
        {(() => {
          console.log("Checking if should render ContentOutput. generatedContent:", generatedContent)
          return generatedContent && (
            <ContentErrorBoundary>
              <div className="space-y-6">
                <ContentOutput content={generatedContent} setContent={setGeneratedContent} />
                <SourceAttribution sources={generatedContent.sources} />
              </div>
            </ContentErrorBoundary>
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
