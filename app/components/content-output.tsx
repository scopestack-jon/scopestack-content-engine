"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, Clock, Hash, Link2, Calculator } from "lucide-react"
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Content: {getTechnologyName(content.technology)}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {content.totalHours || 0} hours
            </Badge>
            <Button onClick={exportToScopeStack} variant="outline">
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
      <CardContent>
        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Discovery Questions ({content.questions?.length || 0})</TabsTrigger>
            <TabsTrigger value="calculations">Calculations ({content.calculations?.length || 0})</TabsTrigger>
            <TabsTrigger value="services">Service Structure ({content.services?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Research-generated questions with numerical values for calculations and subservice mapping
            </div>
            {content.questions && Array.isArray(content.questions) && content.questions.length > 0 ? (
              content.questions.map((question, index) => (
                <Card key={question.id || index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="font-medium">
                        {index + 1}. {question.question || "Question text not available"}
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Hash className="h-3 w-3" />
                        {question.slug || "no-slug"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {question.options && Array.isArray(question.options) && question.options.length > 0 ? (
                        question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded border ${
                              option.default ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">
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
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-2">
                          <div className="text-sm">No options available</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                <div className="text-sm">No questions generated</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calculations" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Dynamic calculations that combine question values to determine subservice hour adjustments
            </div>
            {content.calculations && Array.isArray(content.calculations) && content.calculations.length > 0 ? (
              content.calculations.map((calculation, index) => (
                <Card key={calculation.id || index} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium mb-1">
                          {getCalculationName(calculation).replace(/\[object Object\]/g, getTechnologyName(content.technology))}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getCalculationDescription(calculation)}
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

                    <div className="bg-gray-50 p-3 rounded border mb-3">
                      <div className="text-sm font-medium mb-1">Formula:</div>
                      <code className="text-sm bg-white px-2 py-1 rounded border">{getCalculationFormula(calculation)}</code>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm text-gray-500">Uses questions:</span>
                      {calculation.mappedQuestions && Array.isArray(calculation.mappedQuestions) && calculation.mappedQuestions.length > 0 ? (
                        calculation.mappedQuestions.map((questionSlug, qIndex) => (
                          <Badge key={qIndex} variant="secondary" className="text-xs">
                            {questionSlug || "unknown"}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No questions mapped</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="text-center text-gray-500">
                    <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="font-medium">No calculations generated</div>
                    <div className="text-sm">
                      Calculations are created when subservices have multiple mapped questions
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Professional services structure with question mapping and calculations for dynamic hour adjustments
            </div>
            {content.services && Array.isArray(content.services) && content.services.length > 0 ? (
              sortServicesByPhase(content.services).map((service, index) => (
                <Card key={index} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            phaseColors[getStandardizedPhaseName(getServicePhase(service)) as keyof typeof phaseColors] || "bg-gray-100 text-gray-800"
                          }
                        >
                          {getServicePhase(service)}
                        </Badge>
                        <span className="font-medium">
                          {getServiceName(service)}
                        </span>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {typeof service.hours === 'number' ? `${service.hours}h` : 'Hours not specified'}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-4">{getServiceDescription(service)}</p>

                    {/* New language fields for the service */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="font-semibold text-xs text-gray-700 mb-1">Service Description</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                          {service.serviceDescription || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-700 mb-1">Key Assumptions</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                          {service.keyAssumptions || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-700 mb-1">Client Responsibilities</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                          {service.clientResponsibilities || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-700 mb-1">Out of Scope</div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                          {service.outOfScope || "Not specified"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium text-sm">Subservices:</div>
                      {getSubservices(service).length > 0 ? (
                        getSubservices(service).map((sub: any, subIndex: number) => (
                          <div key={subIndex} className="bg-gray-50 p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{sub.name || `Subservice ${subIndex+1}`}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeof sub.hours === 'number' ? `${sub.hours}h base` : 'Hours not specified'}
                                </Badge>
                                {sub.calculationSlug && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Calculator className="h-3 w-3" />
                                    {sub.calculationSlug}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{sub.description || 'No description available'}</p>


                            {/* Scope Language */}
                            {sub.serviceDescription && (
                              <div className="space-y-4 mt-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900">Scope Language</h4>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 text-xs"
                                    onClick={() => regenerateScopeLanguage(index, subIndex)}
                                    disabled={isRegenerating}
                                  >
                                    {isRegenerating ? "Regenerating..." : "Regenerate"}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  <div>
                                    <div className="font-medium text-gray-700">Service Description</div>
                                    <div className="mt-1 text-gray-600">{sub.serviceDescription}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Key Assumptions</div>
                                    <div className="mt-1 text-gray-600">{sub.keyAssumptions}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Client Responsibilities</div>
                                    <div className="mt-1 text-gray-600">{sub.clientResponsibilities}</div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700">Out of Scope</div>
                                    <div className="mt-1 text-gray-600">{sub.outOfScope}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {sub.mappedQuestions && Array.isArray(sub.mappedQuestions) && sub.mappedQuestions.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap mb-2">
                                <span className="text-xs text-gray-500">
                                  {sub.calculationSlug ? "Calculation uses:" : "Mapped to:"}
                                </span>
                                {sub.mappedQuestions.map((questionSlug: string, qIndex: number) => (
                                  <Badge key={qIndex} variant="secondary" className="text-xs">
                                    {questionSlug || "unknown"}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 mb-2">
                                {sub.calculationSlug ? "No questions mapped to calculation" : "No questions mapped"}
                              </div>
                            )}

                            {sub.calculationSlug && (
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                Final hours = base hours × calculation result
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <div className="text-sm">No subservices defined</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="text-center text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="font-medium">No services generated</div>
                    <div className="text-sm">
                      Services will appear here after content generation
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
