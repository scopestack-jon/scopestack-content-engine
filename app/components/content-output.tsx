"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FileText, Download, Clock, Hash, Link2, Calculator, ChevronRight, ChevronDown, Layers, Users, Settings, Target, CheckCircle, AlertCircle, Info, ArrowRight, Briefcase, Calendar, DollarSign, TrendingUp, Filter, Table, Eye, ChevronUp, MoreVertical, Maximize, Minimize, User } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScopeStackAuthModal } from "./scopestack-auth-modal"
import { getCalculationEngineV2 } from '../../lib/research/generators/calculation-engine-v2'
import { useV2Orchestration } from '../../lib/research/config/feature-flags'

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

interface ContentOutputProps {
  content: GeneratedContent
  setContent: React.Dispatch<React.SetStateAction<GeneratedContent | null>>
}

export function ContentOutput({ content, setContent }: ContentOutputProps) {
  const [activeTab, setActiveTab] = useState("services")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set()) // Collapsed by default
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())
  const [expandedCalculations, setExpandedCalculations] = useState<Set<number>>(new Set())
  const [selectedLanguageField, setSelectedLanguageField] = useState<string>("overview")
  const [questionResponses, setQuestionResponses] = useState<Map<string, any>>(new Map())
  const [modifiedServices, setModifiedServices] = useState(content?.services || [])
  const [isPushingToScopeStack, setIsPushingToScopeStack] = useState(false)
  const [pushProgress, setPushProgress] = useState<{step: string, details?: string, status?: 'loading' | 'success' | 'error'} | null>(null)
  const [scopeStackProjectUrl, setScopeStackProjectUrl] = useState<string | null>(null)
  const [scopeStackProjectName, setScopeStackProjectName] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authenticatedAccount, setAuthenticatedAccount] = useState<{
    userName: string
    accountSlug: string
    accountId: string
    email: string
    accessToken: string
    refreshToken: string
    expiresAt: number
  } | null>(null)

  const toggleServiceExpanded = (index: number) => {
    const newExpanded = new Set(expandedServices)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedServices(newExpanded)
  }

  const toggleQuestionExpanded = (index: number) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedQuestions(newExpanded)
  }

  const toggleCalculationExpanded = (index: number) => {
    const newExpanded = new Set(expandedCalculations)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCalculations(newExpanded)
  }

  // Handle question response changes
  const handleQuestionResponse = (questionId: string, value: any) => {
    const newResponses = new Map(questionResponses)
    newResponses.set(questionId, value)
    setQuestionResponses(newResponses)
    
    // Recalculate service hours based on responses
    calculateServiceImpact()
  }

  // Calculate service impact based on question responses
  const calculateServiceImpact = () => {
    if (!content?.services || !content?.questions) return
    
    const useV2 = useV2Orchestration()
    
    if (useV2) {
      // Use V2 calculation engine with explicit mapping
      console.log('🔧🔧🔧 USING V2 CALCULATION ENGINE IN UI 🔧🔧🔧')
      console.log('🔧 Using V2 calculation engine for question responses')
      console.log('📊 Question responses:', Object.fromEntries(questionResponses))
      console.log('📊 Content services count:', content.services?.length)
      console.log('📊 Content questions count:', content.questions?.length)
      try {
        const calculationEngine = getCalculationEngineV2()
        
        // Convert questionResponses Map to object for V2 engine
        const responsesObject: Record<string, any> = {}
        questionResponses.forEach((value, key) => {
          responsesObject[key] = value
        })
        
        console.log('📊 Calling V2 calculation engine with responses:', responsesObject)
        const updatedServices = calculationEngine.applyResponsesToServices(
          content.services,
          content.questions,
          responsesObject
        )
        
        console.log('✅ V2 calculation engine applied:', {
          originalServices: content.services.length,
          updatedServices: updatedServices.length,
          responses: Object.keys(responsesObject)
        })
        
        setModifiedServices(updatedServices)
      } catch (error) {
        console.error('❌ V2 calculation engine error:', error)
        // Fall back to V1 if V2 fails
        calculateServiceImpactV1()
      }
    } else {
      // Use legacy V1 calculation logic
      calculateServiceImpactV1()
    }
  }

  // Legacy V1 calculation logic (as fallback)
  const calculateServiceImpactV1 = () => {
    if (!content?.services) return
    
    let updatedServices = [...content.services]
    
    // Apply simple multipliers based on common question patterns
    questionResponses.forEach((value, questionId) => {
      const question = content.questions?.find(q => q.id === questionId || q.slug === questionId)
      if (!question) return
      
      // Check for user count questions
      if (question.question?.toLowerCase().includes('user') || question.question?.toLowerCase().includes('employee')) {
        const userCount = parseInt(value)
        if (!isNaN(userCount)) {
          let multiplier = 1.0
          if (userCount <= 100) multiplier = 0.8
          else if (userCount <= 500) multiplier = 1.0
          else if (userCount <= 2000) multiplier = 1.3
          else if (userCount <= 5000) multiplier = 1.6
          else multiplier = 2.0
          
          updatedServices = updatedServices.map(service => ({
            ...service,
            hours: Math.round(service.hours * multiplier)
          }))
        }
      }
      
      // Check for location/site questions
      if (question.question?.toLowerCase().includes('location') || question.question?.toLowerCase().includes('site')) {
        const locationCount = parseInt(value)
        if (!isNaN(locationCount)) {
          let multiplier = 1.0
          if (locationCount === 1) multiplier = 1.0
          else if (locationCount <= 3) multiplier = 1.2
          else if (locationCount <= 10) multiplier = 1.5
          else if (locationCount <= 25) multiplier = 1.8
          else multiplier = 2.2
          
          updatedServices = updatedServices.map(service => ({
            ...service,
            hours: Math.round(service.hours * multiplier)
          }))
        }
      }
      
      // Check for complexity questions
      if (question.question?.toLowerCase().includes('complex')) {
        const selectedOption = question.options?.find(opt => opt.value === value || opt.key === value)
        if (selectedOption) {
          const optionText = typeof selectedOption === 'string' ? selectedOption : (selectedOption.key || selectedOption.value || '').toString().toLowerCase()
          let multiplier = 1.0
          if (optionText.includes('simple') || optionText.includes('basic')) multiplier = 0.8
          else if (optionText.includes('moderate') || optionText.includes('standard')) multiplier = 1.0
          else if (optionText.includes('complex') || optionText.includes('enterprise')) multiplier = 1.5
          
          updatedServices = updatedServices.map(service => ({
            ...service,
            hours: Math.round(service.hours * multiplier)
          }))
        }
      }
    })
    
    setModifiedServices(updatedServices)
  }

  // Update services when responses change
  useEffect(() => {
    calculateServiceImpact()
  }, [questionResponses])

  // Clear ScopeStack project URL when content changes (new generation)
  useEffect(() => {
    setScopeStackProjectUrl(null)
    setScopeStackProjectName(null)
  }, [content?.technology, content?.services?.length])

  // Debug logging
  console.log("ContentOutput received content:", {
    technology: content?.technology,
    technologyType: typeof content?.technology,
    questionsCount: content?.questions?.length,
    servicesCount: content?.services?.length,
    servicesIsArray: Array.isArray(content?.services),
    contentValid: !!content && !!content.services && Array.isArray(content.services) && content.services.length >= 1
  })

  // Add detailed logging for questions and options
  if (content?.questions?.length > 0) {
    console.log("Questions structure:", JSON.stringify(content.questions.slice(0, 2), null, 2));
    if (content.questions[0]?.options?.length > 0) {
      console.log("Options structure for first question:", JSON.stringify(content.questions[0].options.slice(0, 2), null, 2));
    }
  }
  
  // Function to sort services by phase in the correct order
  const sortServicesByPhase = (services: any[]) => {
    if (!Array.isArray(services)) return [];
    
    // Define standard phase names and their variations
    const phaseNameMap: Record<string, string> = {
      // Standard names
      "initiating": "Initiating",
      "planning": "Planning",
      "design": "Design",
      "implementation": "Implementation",
      "monitoring & control": "Monitoring & Control",
      "monitoring and control": "Monitoring & Control",
      "close out": "Close Out",
      "closing": "Close Out",
      
      // Common variations
      "assessment": "Initiating",
      "discovery": "Initiating",
      "requirements": "Initiating",
      "analysis": "Planning",
      "preparation": "Planning",
      "architecture": "Design",
      "development": "Implementation",
      "deployment": "Implementation",
      "migration": "Implementation",
      "testing": "Implementation",
      "validation": "Monitoring & Control",
      "maintenance": "Monitoring & Control",
      "transition": "Close Out",
      "handover": "Close Out",
      "documentation": "Close Out"
    };
    
    const phaseOrder: Record<string, number> = {
      "Initiating": 1,
      "Planning": 2,
      "Design": 3,
      "Implementation": 4,
      "Monitoring & Control": 5,
      "Close Out": 6,
    };
    
    return [...services].sort((a, b) => {
      // Get phase names and normalize them
      let phaseA = a.phase || "Implementation";
      let phaseB = b.phase || "Implementation";
      
      // Convert to standard phase names if variations exist
      const normalizedPhaseA = phaseNameMap[phaseA.toLowerCase()] || phaseA;
      const normalizedPhaseB = phaseNameMap[phaseB.toLowerCase()] || phaseB;
      
      // Get the order or default to Implementation (4)
      const orderA = phaseOrder[normalizedPhaseA] || phaseOrder["Implementation"];
      const orderB = phaseOrder[normalizedPhaseB] || phaseOrder["Implementation"];
      
      return orderA - orderB;
    });
  };
  
  // Defensive check for content
  if (!content) {
    console.error("ContentOutput: content is null or undefined");
    return renderErrorCard("Content Generation Failed", "The generated content is missing. Please try again or adjust your input/model settings.");
  }
  
  if (!content.services) {
    console.error("ContentOutput: content.services is missing");
    return renderErrorCard("Content Generation Failed", "The generated content is missing services. Please try again or adjust your input/model settings.");
  }
  
  if (!Array.isArray(content.services)) {
    console.error("ContentOutput: content.services is not an array", typeof content.services);
    return renderErrorCard("Content Generation Failed", "The generated content has an invalid service structure. Please try again or adjust your input/model settings.");
  }
  
  if (content.services.length === 0) {
    console.error("ContentOutput: content.services is empty array");
    return renderErrorCard("Content Generation Failed", "The generated content has no services. Please try again or adjust your input/model settings.");
  }
  
  // Check if services have the required structure
  let invalidServices: Array<{
    index: number;
    service: any;
    reasons: {
      isObject: boolean;
      hasPhase: boolean;
      hasName: boolean;
      hasService: boolean;
      hasValidDescription: boolean;
      hasValidHours: boolean;
    };
  }> = [];
  
  const validServices = content.services.every((service, index) => {
    const isValid = service && 
      typeof service === 'object' && 
      ((typeof service.phase === 'string') || (typeof service.name === 'string') || (typeof service.service === 'string')) && 
      (typeof service.description === 'string' || typeof service.description === 'undefined') && 
      (typeof service.hours === 'number' || typeof service.hours === 'undefined');
    
    if (!isValid) {
      invalidServices.push({
        index,
        service,
        reasons: {
          isObject: typeof service === 'object',
          hasPhase: typeof service.phase === 'string',
          hasName: typeof service.name === 'string',
          hasService: typeof service.service === 'string',
          hasValidDescription: typeof service.description === 'string' || typeof service.description === 'undefined',
          hasValidHours: typeof service.hours === 'number' || typeof service.hours === 'undefined'
        }
      });
    }
    
    return isValid;
  });
  
  if (!validServices) {
    console.error("ContentOutput: services have invalid structure", content.services);
    console.error("Invalid services details:", invalidServices);
    return renderErrorCard("Content Generation Failed", "The generated content has invalid service structure. Please try again or adjust your input/model settings.");
  }

  const phaseColors = {
    "Initiating": "bg-scopestack-primary/10 text-scopestack-primary",
    "Planning": "bg-scopestack-button/20 text-scopestack-primary",
    "Design": "bg-scopestack-yellow/20 text-scopestack-primary",
    "Implementation": "bg-scopestack-orange/20 text-scopestack-primary", 
    "Monitoring & Control": "bg-scopestack-button/10 text-scopestack-primary",
    "Close Out": "bg-scopestack-primary/20 text-scopestack-primary",
  }

  // Helper function to render error cards
  function renderErrorCard(title: string, message: string) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="font-bold text-lg mb-2">{title}</div>
            <div className="text-sm">{message}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const exportToScopeStack = () => {
    const scopeStackFormat = {
      technology: typeof content.technology === 'string' ? content.technology : "Unknown Technology",
      totalHours: content.totalHours || 0,
      questions: content.questions || [],
      calculations: content.calculations || [],
      services: content.services || [],
      generatedAt: new Date().toISOString(),
      sources: content.sources || [],
    }

    const blob = new Blob([JSON.stringify(scopeStackFormat, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scopestack-${(typeof content.technology === 'string' ? content.technology : "unknown").toLowerCase().replace(/\s+/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle the initial push button click - show auth modal
  const handlePushToScopeStack = () => {
    setShowAuthModal(true)
  }

  // Handle authentication success and perform the actual push
  const pushToScopeStack = async (accountInfo: {
    userName: string
    accountSlug: string
    accountId: string
    email: string
    apiKey: string
  }) => {
    setAuthenticatedAccount(accountInfo)
    
    // Get other settings from localStorage with proper defaults
    const scopeStackApiUrl = localStorage.getItem('scopestack_api_url') || 'https://api.scopestack.io'
    const scopeStackWorkflow = localStorage.getItem('scopestack_workflow') || 'project-with-services'
    const useDirectServices = localStorage.getItem('scopestack_use_direct_services') !== 'false' // Default to true
    const skipSurvey = localStorage.getItem('scopestack_skip_survey') !== 'false' // Default to true  
    const skipDocument = localStorage.getItem('scopestack_skip_document') === 'true'
    
    setIsPushingToScopeStack(true)
    setPushProgress({ 
      step: `Pushing to ${accountInfo.accountSlug}...`, 
      details: `Connected as ${accountInfo.userName}`, 
      status: 'loading' 
    })
    
    setPushProgress({ step: "Initializing...", details: "Preparing request payload", status: 'loading' })
    
    try {
      const requestBody = {
        content,
        useDirectServices,
        skipSurvey,
        skipDocument,
        workflow: scopeStackWorkflow,
        scopeStackApiKey: accountInfo.accessToken,
        scopeStackAccountSlug: accountInfo.accountSlug,
        scopeStackApiUrl: scopeStackApiUrl || undefined,
      }

      console.log('Pushing to ScopeStack with options:', {
        workflow: scopeStackWorkflow,
        useDirectServices,
        skipSurvey,
        skipDocument,
        accountSlug: accountInfo.accountSlug,
        userName: accountInfo.userName,
        hasApiKey: !!accountInfo.accessToken,
        apiKeyLength: accountInfo.accessToken.length
      })

      setPushProgress({ step: "Connecting to ScopeStack...", details: "Sending request to API", status: 'loading' })

      const response = await fetch("/api/push-to-scopestack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      setPushProgress({ step: "Processing response...", details: "Parsing server response", status: 'loading' })
      const result = await response.json()
      console.log('ScopeStack response:', { status: response.status, result })

      if (response.ok) {
        // Store project details for persistent display
        if (result.project?.url) {
          setScopeStackProjectUrl(result.project.url)
          setScopeStackProjectName(result.project.name || content.technology + ' Project')
        }
        
        // Clear progress after a brief success display
        setPushProgress({ step: "Complete!", details: "Project ready in ScopeStack", status: 'success' })
        setTimeout(() => setPushProgress(null), 2000)
        
        // Single comprehensive success toast
        const projectName = result.project?.name || content.technology + ' Project'
        const serviceCount = result.services?.length || 0
        
        toast({
          title: `✅ Project created successfully!`,
          description: `${serviceCount} services pushed to ScopeStack`,
          duration: 4000,
        })
        
        // Only show warnings if they exist
        if (result.warnings?.length > 0) {
          setTimeout(() => {
            toast({
              title: "⚠️ Warnings",
              description: result.warnings[0],
              variant: "default",
              duration: 6000,
            })
          }, 1500)
        }
      } else {
        setPushProgress({ step: "Failed", details: result.error || "Unknown error", status: 'error' })
        console.error('ScopeStack error:', result)
        
        const errorMessage = result.details || result.error || "Failed to push to ScopeStack"
        
        // Check if it's an authentication error
        if (result.statusCode === 401 || result.statusCode === 403 || 
            (errorMessage && (errorMessage.toLowerCase().includes('unauthorized') || 
                            errorMessage.toLowerCase().includes('authentication') ||
                            errorMessage.toLowerCase().includes('api key')))) {
          toast({
            title: "Authentication Failed",
            description: "API key is invalid or expired. Redirecting to Settings...",
            variant: "destructive",
            duration: 3000,
          })
          
          setTimeout(() => {
            window.location.href = '/settings'
          }, 2000)
        } else {
          toast({
            title: "\u274c Push Failed",
            description: errorMessage,
            variant: "destructive",
            duration: 7000,
          })
        }
        
        // Show additional error details if available
        if (result.stack || result.statusCode) {
          setTimeout(() => {
            toast({
              title: "Error Details",
              description: `Status: ${result.statusCode || 'Unknown'} | Check console for full details`,
              variant: "destructive"
            })
          }, 1500)
        }
      }
    } catch (error) {
      setPushProgress({ step: "Connection Failed", details: "Network or server error", status: 'error' })
      console.error('ScopeStack push error:', error)
      toast({
        title: "\u274c Network Error", 
        description: "Failed to connect to the server. Please check your connection.",
        variant: "destructive",
        duration: 7000,
      })
    } finally {
      setTimeout(() => {
        setIsPushingToScopeStack(false)
        // Keep success/error status visible for longer
        if (pushProgress?.status === 'success' || pushProgress?.status === 'error') {
          setTimeout(() => setPushProgress(null), 3000)
        } else {
          setPushProgress(null)
        }
      }, 2000)
    }
  }

  const getCalculationTypeColor = (type: string) => {
    switch (type) {
      case "multiplier":
        return "bg-orange-100 text-orange-800"
      case "additive":
        return "bg-blue-100 text-blue-800"
      case "conditional":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Helper function to get service name
  const getServiceName = (service: any) => {
    // First check if service.service is a string
    if (typeof service.service === 'string') {
      return service.service.replace(/\[object Object\]/g, getTechnologyName(content.technology));
    }
    
    // Then check if service.name is a string
    if (typeof service.name === 'string') {
      return service.name.replace(/\[object Object\]/g, getTechnologyName(content.technology));
    }
    
    // Handle case where service.service might be an object
    if (service.service && typeof service.service === 'object') {
      if (service.service.name) {
        return service.service.name.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      if (service.service.value) {
        return service.service.value.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      if (service.service.text) {
        return service.service.text.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      // Try to stringify the object
      try {
        const serviceStr = JSON.stringify(service.service);
        if (serviceStr !== '{}') {
          return serviceStr.replace(/[{}"]/g, '').replace(/,/g, ', ').replace(/\[object Object\]/g, getTechnologyName(content.technology));
        }
      } catch (e) {
        // Last resort
        return `Service for ${getTechnologyName(content.technology)}`;
      }
    }
    
    // Handle case where service.name might be an object
    if (service.name && typeof service.name === 'object') {
      if (service.name.name) {
        return service.name.name.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      if (service.name.value) {
        return service.name.value.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      if (service.name.text) {
        return service.name.text.replace(/\[object Object\]/g, getTechnologyName(content.technology));
      }
      // Try to stringify the object
      try {
        const nameStr = JSON.stringify(service.name);
        if (nameStr !== '{}') {
          return nameStr.replace(/[{}"]/g, '').replace(/,/g, ', ').replace(/\[object Object\]/g, getTechnologyName(content.technology));
        }
      } catch (e) {
        // Last resort
        return `Service for ${getTechnologyName(content.technology)}`;
      }
    }
    
    return `Service for ${getTechnologyName(content.technology)}`;
  };

  // Helper function to get service phase
  const getServicePhase = (service: any) => {
    if (typeof service.phase === 'string') return service.phase;
    // Handle case where phase might be an object that was stringified incorrectly
    if (service.phase && typeof service.phase === 'object') {
      return service.phase.name || "General";
    }
    return "General";
  }
  
  // Helper function to safely get calculation name
  const getCalculationName = (calculation: any) => {
    if (typeof calculation.name === 'string') {
      return calculation.name;
    }
    
    if (calculation.name && typeof calculation.name === 'object') {
      if (calculation.name.text) {
        return calculation.name.text;
      } else if (calculation.name.value) {
        return calculation.name.value;
      } else {
        try {
          const nameStr = JSON.stringify(calculation.name);
          if (nameStr !== '{}') {
            return nameStr.replace(/[{}"]/g, '').replace(/,/g, ', ');
          }
        } catch (e) {
          // Last resort
          return `Calculation ${calculation.id || calculation.slug || ''}`;
        }
      }
    }
    
    return `Calculation ${calculation.id || calculation.slug || ''}`;
  };

  // Helper function to safely get calculation description
  const getCalculationDescription = (calculation: any) => {
    if (typeof calculation.description === 'string') {
      return calculation.description.replace(/\[object Object\]/g, getTechnologyName(content.technology));
    }
    
    if (calculation.description && typeof calculation.description === 'object') {
      if (calculation.description.text) {
        return calculation.description.text;
      } else if (calculation.description.value) {
        return calculation.description.value;
      } else {
        try {
          const descStr = JSON.stringify(calculation.description);
          if (descStr !== '{}') {
            return descStr.replace(/[{}"]/g, '').replace(/,/g, ', ').replace(/\[object Object\]/g, getTechnologyName(content.technology));
          }
        } catch (e) {
          // Last resort
          return `Calculation for ${getTechnologyName(content.technology)}`;
        }
      }
    }
    
    return `Calculation for ${getTechnologyName(content.technology)}`;
  };

  // Helper function to safely get calculation formula
  const getCalculationFormula = (calculation: any) => {
    if (typeof calculation.formula === 'string') {
      return calculation.formula.replace(/\[object Object\]/g, getTechnologyName(content.technology));
    }
    
    if (calculation.formula && typeof calculation.formula === 'object') {
      if (calculation.formula.text) {
        return calculation.formula.text;
      } else if (calculation.formula.value) {
        return calculation.formula.value;
      } else if (calculation.formula.expression) {
        return calculation.formula.expression;
      } else {
        try {
          const formulaStr = JSON.stringify(calculation.formula);
          if (formulaStr !== '{}') {
            return formulaStr.replace(/[{}"]/g, '').replace(/,/g, ', ').replace(/\[object Object\]/g, getTechnologyName(content.technology));
          }
        } catch (e) {
          // Last resort
          return calculation.mappedQuestions && calculation.mappedQuestions.length > 0 ? 
            calculation.mappedQuestions[0] : 'question_value';
        }
      }
    }
    
    return calculation.mappedQuestions && calculation.mappedQuestions.length > 0 ? 
      calculation.mappedQuestions[0] : 'question_value';
  };

  // Helper function to safely access subservices
  const getSubservices = (service: any) => {
    if (!service.subservices) return [];
    if (!Array.isArray(service.subservices)) return [];
    
    // Filter out invalid subservices
    return service.subservices.filter((sub: any) => 
      sub && 
      typeof sub === 'object' && 
      (typeof sub.name === 'string' || typeof sub.name === 'undefined') && 
      (typeof sub.description === 'string' || typeof sub.description === 'undefined') && 
      (typeof sub.hours === 'number' || typeof sub.hours === 'undefined')
    );
  }

  // Helper function to get option display text with improved handling
  const getOptionDisplayText = (option: any): string => {
    // If option is a simple string, use it
    if (typeof option === 'string') {
      return option;
    }
    
    if (!option || typeof option !== 'object') {
      return "Option";
    }

    // Check for key field - this is the preferred display text
    if (typeof option.key === 'string' && option.key.trim() !== '') {
      return option.key;
    }
    
    // Check for value field when it's a string (not when it's a number)
    if (typeof option.value === 'string' && option.value.trim() !== '') {
      return option.value;
    }
    
    // Check for label field
    if (typeof option.label === 'string' && option.label.trim() !== '') {
      return option.label;
    }
    
    // Check for text field
    if (typeof option.text === 'string' && option.text.trim() !== '') {
      return option.text;
    }
    
    // Check for display field
    if (typeof option.display === 'string' && option.display.trim() !== '') {
      return option.display;
    }
    
    // If we have a numeric value, convert it to string
    if (typeof option.value === 'number') {
      return String(option.value);
    }
    
    // Fallback - if none of the above work, stringify the option for debugging
    try {
      const optionStr = JSON.stringify(option);
      if (optionStr.length < 30) {
        return optionStr;
      }
    } catch (e) {}
    
    return "Option";
  }

  // Helper function to get option numerical value with improved handling
  const getOptionNumericalValue = (option: any, index: number): number => {
    // If option has a numericalValue, use it
    if (typeof option.numericalValue === 'number') {
      return option.numericalValue;
    }
    
    // If option has a number value, use it
    if (typeof option.value === 'number') {
      return option.value;
    }
    
    // Try to parse value field as a number if it might be one
    if (typeof option.value === 'string') {
      const parsedValue = parseFloat(option.value);
      if (!isNaN(parsedValue)) {
        return parsedValue;
      }
    }
    
    // Check for a 'numberValue' or 'number' field
    if (typeof option.numberValue === 'number') {
      return option.numberValue;
    }
    
    if (typeof option.number === 'number') {
      return option.number;
    }
    
    // Default to index + 1 as fallback
    return index + 1;
  }

  // Function to regenerate scope language for a subservice
  const regenerateScopeLanguage = async (serviceIndex: number, subserviceIndex: number) => {
    if (!content) return;
    
    const service = content.services[serviceIndex];
    const subservice = service.subservices[subserviceIndex];
    
    setIsRegenerating(true);
    
    try {
      // Default prompt template
      const defaultPrompt = `Generate professional scope language for the following IT service:

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

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just the JSON object. Do NOT include markdown code blocks (no \`\`\`json or \`\`\`). Start with { and end with }.`;

      // Get custom prompt from localStorage if available
      let promptTemplate = defaultPrompt;
      const storedPrompt = typeof window !== 'undefined' ? localStorage.getItem("scope_language_prompt") : null;
      if (storedPrompt && typeof storedPrompt === 'string') {
        promptTemplate = storedPrompt;
      }
      
      // Replace placeholders with actual values
      const prompt = promptTemplate
        .replace(/{technology}/g, content.technology || '')
        .replace(/{phase}/g, service.phase || '')
        .replace(/{serviceName}/g, service.service || service.name || '')
        .replace(/{subserviceName}/g, subservice.name || '');
      
      console.log(`Regenerating scope language for ${subservice.name}`);
      
      // Call the API to generate scope language
      const response = await fetch("/api/test-openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "x-ai/grok-3-mini-beta"
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to regenerate scope language: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result && result.text) {
        try {
          // Clean the response text
          const cleaned = result.text.replace(/```json|```/g, "").trim();
          console.log("Received scope language response:", cleaned.substring(0, 100) + "...");
          
          let newScopeLanguage;
          try {
            // Try to parse the JSON
            newScopeLanguage = JSON.parse(cleaned);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            
            // Try to extract a JSON object using regex
            const jsonMatch = cleaned.match(/{[\s\S]*}/);
            if (jsonMatch) {
              try {
                newScopeLanguage = JSON.parse(jsonMatch[0]);
              } catch (e) {
                throw new Error("Could not parse JSON from response");
              }
            } else {
              throw new Error("No valid JSON found in response");
            }
          }
          
          // Validate the required fields exist
          if (!newScopeLanguage.serviceDescription || 
              !newScopeLanguage.keyAssumptions || 
              !newScopeLanguage.clientResponsibilities || 
              !newScopeLanguage.outOfScope) {
            throw new Error("Response is missing required fields");
          }
          
          // Update the content with the new scope language
          const updatedServices = [...content.services];
          updatedServices[serviceIndex].subservices[subserviceIndex] = {
            ...subservice,
            serviceDescription: newScopeLanguage.serviceDescription,
            keyAssumptions: newScopeLanguage.keyAssumptions,
            clientResponsibilities: newScopeLanguage.clientResponsibilities,
            outOfScope: newScopeLanguage.outOfScope
          };
          
          setContent({
            ...content,
            services: updatedServices
          });
          
          toast({
            title: "Scope language regenerated",
            description: `Updated scope language for ${subservice.name}`,
          });
        } catch (parseError) {
          console.error("Failed to parse scope language:", parseError);
          toast({
            title: "Error",
            description: `Failed to parse the regenerated scope language: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Invalid response from API");
      }
    } catch (error) {
      console.error("Error regenerating scope language:", error);
      toast({
        title: "Error",
        description: `Failed to regenerate scope language: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Helper function to get standardized phase name
  const getStandardizedPhaseName = (phase: string): string => {
    if (!phase) return "Implementation";
    
    const phaseNameMap: Record<string, string> = {
      // Standard names
      "initiating": "Initiating",
      "planning": "Planning",
      "design": "Design",
      "implementation": "Implementation",
      "monitoring & control": "Monitoring & Control",
      "monitoring and control": "Monitoring & Control",
      "close out": "Close Out",
      "closing": "Close Out",
      
      // Common variations
      "assessment": "Initiating",
      "discovery": "Initiating",
      "requirements": "Initiating",
      "analysis": "Planning",
      "preparation": "Planning",
      "architecture": "Design",
      "development": "Implementation",
      "deployment": "Implementation",
      "migration": "Implementation",
      "testing": "Implementation",
      "validation": "Monitoring & Control",
      "maintenance": "Monitoring & Control",
      "transition": "Close Out",
      "handover": "Close Out",
      "documentation": "Close Out"
    };
    
    return phaseNameMap[phase.toLowerCase()] || phase;
  };

  // Helper function to safely get technology name
  // Helper function to clean technology names (same logic as backend)
  const generateCleanTechnologyName = (technology: string): string => {
    const cleanTech = technology.trim()
    
    // Handle generic or unclear inputs first
    if (/^(help|scope|scoping|project)\b/i.test(cleanTech) || 
        /^(help\s+(me\s+)?(scope|scoping))/i.test(cleanTech) ||
        cleanTech.length < 10) {
      return 'Technology Solution'
    }
    
    // Common patterns to identify technology types
    const techPatterns = [
      // Network/Security
      { pattern: /cisco\s+ise/i, name: 'Cisco ISE Network Access Control' },
      { pattern: /palo\s+alto/i, name: 'Palo Alto Security' },
      { pattern: /fortinet|fortigate/i, name: 'Fortinet Security' },
      { pattern: /checkpoint/i, name: 'Check Point Security' },
      { pattern: /meraki/i, name: 'Cisco Meraki Network' },
      
      // Cloud platforms
      { pattern: /aws|amazon\s+web/i, name: 'AWS Cloud' },
      { pattern: /azure|microsoft\s+cloud/i, name: 'Microsoft Azure' },
      { pattern: /gcp|google\s+cloud/i, name: 'Google Cloud' },
      { pattern: /office\s*365|o365/i, name: 'Microsoft 365' },
      
      // Communication/Collaboration
      { pattern: /teams/i, name: 'Microsoft Teams' },
      { pattern: /zoom/i, name: 'Zoom Platform' },
      { pattern: /webex/i, name: 'Cisco Webex' },
      { pattern: /slack/i, name: 'Slack Workspace' },
      
      // Infrastructure
      { pattern: /vmware/i, name: 'VMware Virtualization' },
      { pattern: /hyper-?v/i, name: 'Hyper-V Virtualization' },
      { pattern: /citrix/i, name: 'Citrix' },
      { pattern: /active\s+directory|ad/i, name: 'Active Directory' },
      
      // Audio/Visual
      { pattern: /av\s+|audio.*video|lighting.*sound|concert.*environment/i, name: 'Audio Visual System' },
      
      // Email/Migration
      { pattern: /email.*migration|migration.*email/i, name: 'Email Migration' },
      { pattern: /exchange/i, name: 'Microsoft Exchange' },
      
      // ERP/Business Applications
      { pattern: /salesforce/i, name: 'Salesforce' },
      { pattern: /sap/i, name: 'SAP' },
      { pattern: /oracle/i, name: 'Oracle' },
      
      // Backup/Storage
      { pattern: /backup/i, name: 'Backup Solution' },
      { pattern: /storage/i, name: 'Storage Solution' },
    ]
    
    // Try to match patterns
    for (const { pattern, name } of techPatterns) {
      if (pattern.test(cleanTech)) {
        return name
      }
    }
    
    // Fallback: Create a name from the first few meaningful words
    const words = cleanTech.split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !/^(a|an|the|for|with|and|or|but|in|on|at|to|by|from|help|me|scope|scoping|out)$/i.test(word)
      )
      .slice(0, 4)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    
    if (words.length >= 2) {
      return words.join(' ')
    } else if (words.length === 1) {
      return `${words[0]} Technology`
    }
    
    return 'Technology Solution'
  }

  const getTechnologyName = (technology: any): string => {
    if (typeof technology === 'string') {
      return generateCleanTechnologyName(technology);
    }
    
    if (technology && typeof technology === 'object') {
      // Try to extract a meaningful name from technology object
      if (technology.platform) {
        return technology.platform;
      } else if (technology.primary) {
        return technology.primary;
      } else if (technology.name) {
        return technology.name;
      } else if (technology.type) {
        return technology.type;
      } else if (technology.product) {
        return technology.product;
      } else if (technology.components && Array.isArray(technology.components) && technology.components.length > 0) {
        // If we have components array, use the first component
        return technology.components[0];
      }
      
      // If we have source and destination, create a migration string
      if (technology.source && technology.destination) {
        return `${technology.destination} Migration from ${technology.source}`;
      }
      
      // Try to stringify the object in a clean way
      try {
        const techStr = JSON.stringify(technology);
        if (techStr !== '{}') {
          return techStr.replace(/[{}"]/g, '').replace(/,/g, ', ');
        }
      } catch (e) {
        // Last resort
        return "Technology Solution";
      }
    }
    
    return "Technology Solution";
  };

  // Helper function to safely get service description
  const getServiceDescription = (service: any): string => {
    if (typeof service.description === 'string') {
      return service.description.replace(/\[object Object\]/g, getTechnologyName(content.technology));
    }
    
    if (service.description && typeof service.description === 'object') {
      if (service.description.text) {
        return service.description.text;
      } else if (service.description.value) {
        return service.description.value;
      } else {
        return `Service for ${getTechnologyName(content.technology)}`;
      }
    }
    
    return 'No description available';
  };

  return (
    <div className="space-y-6 relative">
      {/* Floating Push Status Notification - Only show during loading */}
      {pushProgress && pushProgress.status === 'loading' && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2 border-scopestack-primary bg-white">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="h-5 w-5 border-2 border-scopestack-primary/30 border-t-scopestack-primary rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">
                    Pushing to ScopeStack
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {pushProgress.step}
                  </div>
                  {pushProgress.details && (
                    <div className="text-xs text-gray-500 mt-1">
                      {pushProgress.details}
                    </div>
                  )}
                  <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-scopestack-primary rounded-full animate-pulse" style={{width: '60%'}} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Enhanced Header */}
      <Card className="bg-scopestack-primary border-scopestack-primary">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-scopestack-button rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">Generated Content</div>
                  <div className="text-base font-normal text-scopestack-yellow">
                    {getTechnologyName(content.technology)}
                  </div>
                </div>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="flex items-center gap-1 bg-white/20 text-white border-white/30 text-xs">
                  <Clock className="h-3 w-3" />
                  {content.totalHours || 0} base hours
                </Badge>
                {questionResponses.size > 0 && (
                  <Badge variant="default" className="flex items-center gap-1 bg-scopestack-button text-white text-xs">
                    <Calculator className="h-3 w-3" />
                    {(() => {
                      // Calculate actual total hours from all services and subservices
                      let calculatedTotal = 0;
                      if (content.services && Array.isArray(content.services)) {
                        content.services.forEach(service => {
                          const subservices = getSubservices(service);
                          if (subservices && subservices.length > 0) {
                            // Sum up all subservice hours
                            subservices.forEach(sub => {
                              const quantity = sub.quantity || 1;
                              const baseHours = sub.baseHours || sub.hours || 0;
                              calculatedTotal += Math.round((quantity * baseHours) * 100) / 100;
                            });
                          } else {
                            // No subservices, use service hours
                            const quantity = service.quantity || 1;
                            const baseHours = service.baseHours || service.hours || 0;
                            calculatedTotal += Math.round((quantity * baseHours) * 100) / 100;
                          }
                        });
                      }
                      return Math.round(calculatedTotal) || content.totalHours || 0;
                    })()} adjusted hours
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1 bg-white/20 text-white border-white/30 text-xs">
                  <Users className="h-3 w-3" />
                  {content.questions?.length || 0} questions
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-white/20 text-white border-white/30 text-xs">
                  <Layers className="h-3 w-3" />
                  {content.services?.length || 0} services
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-white/20 text-white border-white/30 text-xs">
                  <Calculator className="h-3 w-3" />
                  {content.calculations?.length || 0} calculations
                </Badge>
                {/* ScopeStack Project Link */}
                {scopeStackProjectUrl && (
                  <Button
                    onClick={() => window.open(scopeStackProjectUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-green-500/20 text-white border-green-400/30 hover:bg-green-500/30 text-xs px-2 py-1 h-6"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">View in ScopeStack</span>
                    <span className="sm:hidden">View Project</span>
                  </Button>
                )}
              </div>
              {/* ScopeStack Project Details */}
              {scopeStackProjectUrl && (
                <div className="text-xs text-white/80 flex items-center gap-2">
                  <span>✅ Project pushed to ScopeStack</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Actions Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    setExpandedServices(new Set(modifiedServices?.map((_, i) => i) || []))
                    setExpandedQuestions(new Set(content.questions?.map((_, i) => i) || []))
                    setExpandedCalculations(new Set(content.calculations?.map((_, i) => i) || []))
                  }}>
                    <Maximize className="h-4 w-4 mr-2" />
                    Expand All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setExpandedServices(new Set())
                    setExpandedQuestions(new Set())
                    setExpandedCalculations(new Set())
                  }}>
                    <Minimize className="h-4 w-4 mr-2" />
                    Collapse All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {scopeStackProjectUrl && (
                    <DropdownMenuItem onClick={() => window.open(scopeStackProjectUrl, '_blank')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      View in ScopeStack
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={exportToScopeStack}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Link */}
              <Button 
                onClick={() => window.open('/settings', '_blank')}
                variant="outline" 
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              {/* View in ScopeStack Button */}
              {scopeStackProjectUrl && (
                <Button 
                  onClick={() => window.open(scopeStackProjectUrl, '_blank')}
                  variant="outline" 
                  size="sm"
                  className="bg-green-500/20 hover:bg-green-500/30 text-white border-green-400/30 flex-shrink-0"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">View in ScopeStack</span>
                  <span className="sm:hidden">View</span>
                </Button>
              )}

              {/* Account Indicator */}
              {authenticatedAccount && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <User className="h-3 w-3" />
                  <span>Connected: {authenticatedAccount.accountSlug}</span>
                </div>
              )}

              {/* Primary Push Button */}
              <Button 
                onClick={handlePushToScopeStack} 
                className="bg-scopestack-button hover:bg-scopestack-button/90 text-white flex-shrink-0 relative"
                disabled={isPushingToScopeStack}
                size="sm"
              >
                {isPushingToScopeStack ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    <span className="hidden sm:inline">Pushing...</span>
                    <span className="sm:hidden">Push</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Push to ScopeStack</span>
                    <span className="sm:hidden">Push</span>
                  </>
                )}
              </Button>
            </div>
            
          </div>
        </CardHeader>
      </Card>


      {/* Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="questions" className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-3 bg-scopestack-primary/10">
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Questions ({content.questions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="calculations" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculations ({content.calculations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Services ({modifiedServices?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="questions" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Discovery Questions</h3>
                  <p className="text-sm text-gray-600">Research-generated questions with numerical values for calculations</p>
                </div>
              </div>
              
              {content.questions && Array.isArray(content.questions) && content.questions.length > 0 ? (
                <div className="space-y-3">
                  {content.questions.map((question, index) => (
                    <Collapsible 
                      key={question.id || index}
                      open={expandedQuestions.has(index)}
                      onOpenChange={() => toggleQuestionExpanded(index)}
                    >
                      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <CollapsibleTrigger className="w-full">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {expandedQuestions.has(index) ? 
                                    <ChevronDown className="h-4 w-4 text-blue-600" /> : 
                                    <ChevronRight className="h-4 w-4 text-blue-600" />
                                  }
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900">
                                    {index + 1}. {question.question || "Question text not available"}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {question.options?.length || 0} options available
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Hash className="h-3 w-3" />
                                  {question.slug || "no-slug"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <div className="border-t pt-4">
                              {/* Determine if this is a numerical input question */}
                              {(!question.options || question.options.length === 0 || 
                                question.question?.toLowerCase().includes('how many') || 
                                question.question?.toLowerCase().includes('number of') ||
                                question.question?.toLowerCase().includes('quantity') ||
                                question.question?.toLowerCase().includes('count')) ? (
                                /* Numerical input for questions without options or quantity questions */
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`question-${question.id || index}`}>
                                      Enter a number:
                                    </Label>
                                    <Input
                                      id={`question-${question.id || index}`}
                                      type="number"
                                      min="1"
                                      placeholder="Enter value"
                                      value={questionResponses.get(question.id || question.slug || `q-${index}`) || ''}
                                      onChange={(e) => handleQuestionResponse(
                                        question.id || question.slug || `q-${index}`,
                                        e.target.value
                                      )}
                                      className="max-w-xs"
                                    />
                                    {/* Show helper text for common patterns */}
                                    {(question.question?.toLowerCase().includes('user') || 
                                      question.question?.toLowerCase().includes('employee')) && (
                                      <p className="text-xs text-muted-foreground">
                                        Impact: 1-100 (0.8x), 101-500 (1.0x), 501-2000 (1.3x), 2001-5000 (1.6x), 5000+ (2.0x)
                                      </p>
                                    )}
                                    {(question.question?.toLowerCase().includes('location') || 
                                      question.question?.toLowerCase().includes('site')) && (
                                      <p className="text-xs text-muted-foreground">
                                        Impact: 1 site (1.0x), 2-3 (1.2x), 4-10 (1.5x), 11-25 (1.8x), 25+ (2.2x)
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Show current response */}
                                  {questionResponses.has(question.id || question.slug || `q-${index}`) && (
                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                      <span className="text-sm text-green-700">
                                        Selected: {questionResponses.get(question.id || question.slug || `q-${index}`)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Multiple choice options with radio buttons */
                                <div className="space-y-4">
                                  <RadioGroup
                                      value={questionResponses.get(question.id || question.slug || `q-${index}`) || ''}
                                      onValueChange={(value) => handleQuestionResponse(
                                        question.id || question.slug || `q-${index}`,
                                        value
                                      )}
                                    >
                                      <div className="space-y-2">
                                        {question.options.map((option, optIndex) => {
                                          const optionValue = getOptionNumericalValue(option, optIndex).toString()
                                          const optionLabel = getOptionDisplayText(option)
                                          
                                          return (
                                            <div
                                              key={optIndex}
                                              className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                                                questionResponses.get(question.id || question.slug || `q-${index}`) === optionValue
                                                  ? "bg-blue-50 border-blue-300"
                                                  : "hover:bg-gray-50"
                                              }`}
                                            >
                                              <RadioGroupItem 
                                                value={optionValue} 
                                                id={`option-${question.id}-${optIndex}`}
                                              />
                                              <Label 
                                                htmlFor={`option-${question.id}-${optIndex}`}
                                                className="flex-1 cursor-pointer"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="font-medium">
                                                    {optionLabel}
                                                  </span>
                                                  <Badge variant="secondary" className="text-xs ml-2">
                                                    Value: {optionValue}
                                                  </Badge>
                                                </div>
                                              </Label>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </RadioGroup>
                                  
                                  {/* Show current response */}
                                  {questionResponses.has(question.id || question.slug || `q-${index}`) && (
                                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                                      <span className="text-sm text-green-700">
                                        Selected: {questionResponses.get(question.id || question.slug || `q-${index}`)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <Card className="border-l-4 border-l-gray-300">
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="font-medium text-lg mb-2">No Questions Generated</div>
                      <div className="text-sm">Questions will appear here after content generation</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calculations" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dynamic Calculations</h3>
                  <p className="text-sm text-gray-600">Question-driven formulas that adjust service hours</p>
                </div>
              </div>
              
              {content.calculations && Array.isArray(content.calculations) && content.calculations.length > 0 ? (
                <div className="space-y-3">
                  {content.calculations.map((calculation, index) => (
                    <Collapsible 
                      key={calculation.id || index}
                      open={expandedCalculations.has(index)}
                      onOpenChange={() => toggleCalculationExpanded(index)}
                    >
                      <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                        <CollapsibleTrigger className="w-full">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {expandedCalculations.has(index) ? 
                                    <ChevronDown className="h-4 w-4 text-orange-600" /> : 
                                    <ChevronRight className="h-4 w-4 text-orange-600" />
                                  }
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900">
                                    {getCalculationName(calculation).replace(/\[object Object\]/g, getTechnologyName(content.technology))}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {calculation.mappedServices && calculation.mappedServices.length > 0 ? 
                                      `Affects ${calculation.mappedServices.length} service${calculation.mappedServices.length === 1 ? '' : 's'}` : 
                                      calculation.mappedQuestions && calculation.mappedQuestions.length > 0 ?
                                      `${calculation.mappedQuestions.length} question${calculation.mappedQuestions.length === 1 ? '' : 's'} mapped` :
                                      'No mappings'
                                    }
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Hash className="h-3 w-3" />
                                  {calculation.slug || "no-slug"}
                                </Badge>
                                <Badge className={`text-xs ${getCalculationTypeColor(calculation.resultType || "")}`}>
                                  {calculation.resultType || "unknown"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <div className="border-t pt-4 space-y-4">
                              <div className="text-sm text-gray-600">
                                {getCalculationDescription(calculation)}
                              </div>

                              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calculator className="h-4 w-4 text-orange-600" />
                                  <div className="text-sm font-semibold text-orange-800">Formula</div>
                                </div>
                                <code className="text-sm bg-white px-3 py-2 rounded border block font-mono">
                                  {getCalculationFormula(calculation)}
                                </code>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">Mapped Questions:</div>
                                {calculation.mappedQuestions && Array.isArray(calculation.mappedQuestions) && calculation.mappedQuestions.length > 0 ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {calculation.mappedQuestions.map((questionSlug, qIndex) => (
                                      <Badge key={qIndex} variant="secondary" className="text-xs">
                                        {questionSlug || "unknown"}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400 py-2">No questions mapped</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <Card className="border-l-4 border-l-gray-300">
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="font-medium text-lg mb-2">No Calculations Generated</div>
                      <div className="text-sm">
                        Calculations are created when subservices have multiple mapped questions
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="services" className="p-6">
            <div className="space-y-6">
              {/* Header with Language Field Filter */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Services & Components</h3>
                  <p className="text-sm text-gray-600">Click services to expand details</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-600" />
                    <Select value={selectedLanguageField} onValueChange={setSelectedLanguageField}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Overview</SelectItem>
                        <SelectItem value="serviceDescription">Service Description</SelectItem>
                        <SelectItem value="keyAssumptions">Key Assumptions</SelectItem>
                        <SelectItem value="clientResponsibilities">Client Responsibilities</SelectItem>
                        <SelectItem value="outOfScope">Out of Scope</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {modifiedServices && Array.isArray(modifiedServices) && modifiedServices.length > 0 ? (
                <div className="space-y-2">
                  {sortServicesByPhase(modifiedServices).map((service, serviceIndex) => (
                    <Collapsible 
                      key={serviceIndex}
                      open={expandedServices.has(serviceIndex)}
                      onOpenChange={() => toggleServiceExpanded(serviceIndex)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <Card className="border hover:shadow-sm transition-shadow hover:bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {expandedServices.has(serviceIndex) ? 
                                  <ChevronDown className="h-4 w-4 text-gray-600" /> : 
                                  <ChevronRight className="h-4 w-4 text-gray-600" />
                                }
                              </div>
                              <Badge
                                className={
                                  phaseColors[getStandardizedPhaseName(getServicePhase(service)) as keyof typeof phaseColors] || "bg-gray-100 text-gray-800"
                                }
                                size="sm"
                              >
                                {getServicePhase(service)}
                              </Badge>
                              <span className="font-medium text-gray-900 flex-1 text-left">
                                {getServiceName(service)}
                              </span>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{getSubservices(service).length} components</span>
                                <Badge variant="outline" size="sm">
                                  {(() => {
                                    // Calculate total hours for service including all subservices
                                    const serviceQuantity = service.quantity || 1;
                                    const serviceBaseHours = service.baseHours || service.hours || 0;
                                    let serviceTotalHours = Math.round((serviceQuantity * serviceBaseHours) * 100) / 100;
                                    
                                    // Add subservice hours
                                    const subservices = getSubservices(service);
                                    if (subservices && subservices.length > 0) {
                                      serviceTotalHours = subservices.reduce((total, sub) => {
                                        const subQuantity = sub.quantity || 1;
                                        const subBaseHours = sub.baseHours || sub.hours || 0;
                                        return total + Math.round((subQuantity * subBaseHours) * 100) / 100;
                                      }, 0);
                                      serviceTotalHours = Math.round(serviceTotalHours * 100) / 100;
                                    }
                                    
                                    return serviceTotalHours > 0 ? `${serviceTotalHours}h` : 'TBD';
                                  })()}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="ml-6 mt-2">
                          {selectedLanguageField === "overview" ? (
                            // Overview mode - show table of subservices
                            <Card className="bg-gray-50 border-gray-200">
                              <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-gray-100 border-b">
                                      <tr>
                                        <th className="text-left p-3 text-sm font-medium text-gray-700">Component</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-700">Description</th>
                                        <th className="text-center p-3 text-sm font-medium text-gray-700">Qty</th>
                                        <th className="text-center p-3 text-sm font-medium text-gray-700">Unit Hours</th>
                                        <th className="text-center p-3 text-sm font-medium text-gray-700">Mapping</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {getSubservices(service).map((sub: any, subIndex: number) => (
                                        <tr key={subIndex} className="border-b border-gray-200 hover:bg-white">
                                          <td className="p-3">
                                            <div className="font-medium text-gray-900 text-sm">
                                              {sub.name || `Component ${subIndex + 1}`}
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <div className="text-sm text-gray-600 max-w-md">
                                              {sub.description || 'No description available'}
                                            </div>
                                          </td>
                                          <td className="p-3 text-center">
                                            <div className="flex items-center justify-center">
                                              <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-800">
                                                {typeof sub.quantity === 'number' ? sub.quantity : 1}
                                              </Badge>
                                            </div>
                                          </td>
                                          <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                              <Badge variant="outline" size="sm">
                                                {(() => {
                                                  // Show unit hours (AI estimate per unit)
                                                  const baseHours = sub.baseHours || sub.hours || 0;
                                                  
                                                  // Debug logging for unit hours display
                                                  if (sub.name && (sub.quantity > 1 || !sub.quantity)) {
                                                    console.log(`📊 ${sub.name}:`, {
                                                      quantity: sub.quantity,
                                                      unitHours: baseHours,
                                                      totalEstimate: (sub.quantity || 1) * baseHours,
                                                      hasCalculationRules: !!sub.calculationRules,
                                                      hasQuantityDriver: !!sub.quantityDriver
                                                    });
                                                  }
                                                  
                                                  return baseHours > 0 ? `${baseHours}h` : 'TBD';
                                                })()}
                                              </Badge>
                                              {sub.baseHours && sub.quantity && sub.quantity !== 1 && (
                                                <Badge variant="secondary" size="sm" className="text-xs" title={`${sub.quantity} × ${sub.baseHours}h`}>
                                                  {sub.quantity} × {sub.baseHours}h
                                                </Badge>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3 text-center">
                                            {sub.mappedQuestions && sub.mappedQuestions.length > 0 ? (
                                              <div className="flex flex-col gap-1 items-center">
                                                {sub.mappedQuestions.slice(0, 2).map((calcId, idx) => (
                                                  <Badge key={idx} variant="secondary" size="sm" className="text-xs max-w-[100px] truncate" title={calcId}>
                                                    {calcId}
                                                  </Badge>
                                                ))}
                                                {sub.mappedQuestions.length > 2 && (
                                                  <span className="text-xs text-gray-500">+{sub.mappedQuestions.length - 2} more</span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-gray-400">None</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            // Language field mode - show specific field content
                            <Card className="bg-gray-50 border-gray-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base capitalize">{selectedLanguageField.replace(/([A-Z])/g, ' $1')}</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-4">
                                  {/* Show service-level language field first if it exists */}
                                  {service[selectedLanguageField] && (
                                    <div className="border-l-4 border-green-200 bg-green-50 p-4 rounded-r mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-green-700">S</span>
                                        </div>
                                        <span className="font-medium text-gray-900 text-sm">
                                          {getServiceName(service)} - Service Level
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        {service[selectedLanguageField]}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Then show subservice-level fields */}
                                  {getSubservices(service).map((sub: any, subIndex: number) => (
                                    <div key={subIndex} className="border-l-4 border-blue-200 bg-white p-4 rounded-r">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-blue-700">{subIndex + 1}</span>
                                        </div>
                                        <span className="font-medium text-gray-900 text-sm">
                                          {sub.name || `Component ${subIndex + 1}`}
                                        </span>
                                        {sub.serviceDescription && selectedLanguageField !== "overview" && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 px-2 text-xs ml-auto"
                                            onClick={() => regenerateScopeLanguage(serviceIndex, subIndex)}
                                            disabled={isRegenerating}
                                          >
                                            {isRegenerating ? "..." : "Regenerate"}
                                          </Button>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        {sub[selectedLanguageField] || `No ${selectedLanguageField.replace(/([A-Z])/g, ' $1').toLowerCase()} specified`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <Card className="border-gray-300">
                  <CardContent className="p-8 text-center">
                    <Table className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <div className="font-medium text-gray-900 mb-2">No Services Generated</div>
                    <div className="text-sm text-gray-500">Services will appear here after content generation</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
      
      {/* Authentication Modal */}
      <ScopeStackAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={pushToScopeStack}
      />
    </div>
  )
}
