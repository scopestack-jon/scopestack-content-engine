"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Download, Clock, Hash, Link2, Calculator, ChevronRight, ChevronDown, Layers, Users, Settings, Target, CheckCircle, AlertCircle, Info, ArrowRight, Briefcase, Calendar, DollarSign, TrendingUp, Filter, Table, Eye } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useState } from "react"

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
    "Initiating": "bg-purple-100 text-purple-800",
    "Planning": "bg-blue-100 text-blue-800",
    "Design": "bg-green-100 text-green-800",
    "Implementation": "bg-orange-100 text-orange-800",
    "Monitoring & Control": "bg-yellow-100 text-yellow-800",
    "Close Out": "bg-red-100 text-red-800",
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

  const pushToScopeStack = async () => {
    try {
      const response = await fetch("/api/push-to-scopestack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })

      if (response.ok) {
        alert("Content successfully pushed to ScopeStack!")
      } else {
        alert("Failed to push to ScopeStack. Check your settings.")
      }
    } catch (error) {
      alert("Failed to push to ScopeStack. Check your settings.")
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
  const getTechnologyName = (technology: any): string => {
    if (typeof technology === 'string') {
      return technology;
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
    <div className="space-y-6">
      {/* Enhanced Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-green-800">Generated Content</div>
                  <div className="text-base font-normal text-green-600">
                    {getTechnologyName(content.technology)}
                  </div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline" className="flex items-center gap-1 bg-white/50">
                  <Clock className="h-3 w-3" />
                  {content.totalHours || 0} total hours
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-white/50">
                  <Users className="h-3 w-3" />
                  {content.questions?.length || 0} questions
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-white/50">
                  <Layers className="h-3 w-3" />
                  {content.services?.length || 0} services
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-white/50">
                  <Calculator className="h-3 w-3" />
                  {content.calculations?.length || 0} calculations
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  setExpandedServices(new Set())
                  setExpandedQuestions(new Set())
                  setExpandedCalculations(new Set())
                }} 
                variant="outline" 
                size="sm"
                className="bg-white/70 hover:bg-white"
              >
                Collapse All
              </Button>
              <Button 
                onClick={() => {
                  setExpandedServices(new Set(content.services?.map((_, i) => i) || []))
                  setExpandedQuestions(new Set(content.questions?.map((_, i) => i) || []))
                  setExpandedCalculations(new Set(content.calculations?.map((_, i) => i) || []))
                }} 
                variant="outline" 
                size="sm"
                className="bg-white/70 hover:bg-white"
              >
                Expand All
              </Button>
              <Button onClick={exportToScopeStack} variant="outline" className="bg-white/70 hover:bg-white">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={pushToScopeStack} className="bg-green-600 hover:bg-green-700">
                <Link2 className="h-4 w-4 mr-2" />
                Push to ScopeStack
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
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
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
                  Services ({content.services?.length || 0})
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
                              {question.options && Array.isArray(question.options) && question.options.length > 0 ? (
                                <div className="grid gap-3">
                                  {question.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className={`p-4 rounded-lg border transition-colors hover:shadow-sm ${
                                        option.default 
                                          ? "bg-blue-50 border-blue-200 shadow-sm" 
                                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                          {getOptionDisplayText(option)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="text-xs">
                                            Value: {getOptionNumericalValue(option, optIndex)}
                                          </Badge>
                                          {option.default && (
                                            <Badge variant="default" className="text-xs">
                                              Default
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-gray-500 py-6">
                                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <div className="text-sm">No options available</div>
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
                                    {calculation.mappedQuestions?.length || 0} questions mapped
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

              {content.services && Array.isArray(content.services) && content.services.length > 0 ? (
                <div className="space-y-2">
                  {sortServicesByPhase(content.services).map((service, serviceIndex) => (
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
                                  {typeof service.hours === 'number' ? `${service.hours}h` : 'TBD'}
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
                                        <th className="text-center p-3 text-sm font-medium text-gray-700">Hours</th>
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
                                            <div className="flex items-center justify-center gap-2">
                                              <Badge variant="outline" size="sm">
                                                {typeof sub.hours === 'number' ? `${sub.hours}h` : 'TBD'}
                                              </Badge>
                                              {sub.calculationSlug && (
                                                <Badge variant="secondary" size="sm" className="text-xs">
                                                  Dynamic
                                                </Badge>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3 text-center">
                                            {sub.mappedQuestions && sub.mappedQuestions.length > 0 ? (
                                              <Badge variant="secondary" size="sm">
                                                {sub.mappedQuestions.length} questions
                                              </Badge>
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
    </div>
  )
}
