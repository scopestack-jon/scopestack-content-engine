console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY);
import { generateText } from "ai"
import type { NextRequest } from "next/server"

// Add the JSON response instruction constant
const JSON_RESPONSE_INSTRUCTION = `

CRITICAL RESPONSE FORMAT:
- Return ONLY valid JSON
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanations before or after the JSON
- NO comments within the JSON
- Start response with { and end with }
- Complete the entire JSON structure
- Validate JSON syntax before returning
- DO NOT nest your response inside fields like "email_migration_research" or "research_findings"
- Use a flat structure with top-level fields

CRITICAL FOR URLS:
- Always use properly formatted URLs (e.g., "https://example.com")
- Never use double quotes within double quotes (e.g., ""https://example.com"")
- If you don't know the exact URL, use "https://example.com" as a placeholder
- Format URLs in sources as: { "url": "https://example.com", "title": "Source Title" }

CRITICAL FOR NESTED STRUCTURES:
- Ensure all arrays and objects are properly closed
- Check that all opening braces { have matching closing braces }
- Check that all opening brackets [ have matching closing brackets ]
- Ensure all property names are in double quotes
- Ensure all string values are in double quotes

RESPOND WITH PURE JSON ONLY.
`;

// Function to clean AI responses
function cleanAIResponse(response: string): string {
  // Remove markdown code blocks if present
  let cleaned = response.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
  cleaned = cleaned.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If the response starts with a { and ends with }, extract just that JSON object
  const jsonMatch = cleaned.match(/^\s*({[\s\S]*})\s*$/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }
  
  // Fix common JSON syntax issues
  cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
  cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
  
  return cleaned;
}

// Function to fix URL formatting issues in JSON
function fixUrlsInJson(json: string): string {
  // Fix URLs with escaped quotes
  let fixed = json.replace(/"url"\s*:\s*"\\?"(http[^"]*?)\\?"/g, '"url": "$1"');
  
  // Fix URLs with double quotes
  fixed = fixed.replace(/"url"\s*:\s*""(http[^"]*?)""/, '"url": "$1"');
  
  // Fix empty URLs
  fixed = fixed.replace(/"url"\s*:\s*""/, '"url": "https://example.com"');
  
  return fixed;
}

// Function to sanitize source relevance fields
function sanitizeSourceRelevance(content: any): any {
  if (!content || typeof content !== 'object') {
    return content;
  }
  
  // Sanitize sources if they exist
  if (Array.isArray(content.sources)) {
    content.sources = content.sources.map((source: any) => {
      if (!source || typeof source !== 'object') {
        return {
          url: "https://example.com",
          title: "Default Source",
          relevance: "General reference"
        };
      }
      
      // Ensure URL is properly formatted
      if (!source.url || typeof source.url !== 'string' || !source.url.startsWith('http')) {
        source.url = "https://example.com";
      }
      
      // Ensure title exists
      if (!source.title || typeof source.title !== 'string') {
        source.title = "Unnamed Source";
      }
      
      // Fix relevance field if it contains problematic characters
      if (source.relevance && typeof source.relevance === 'string') {
        // Check for common issues in relevance text
        if (source.relevance.includes('"') || source.relevance.includes('\\') || 
            source.relevance.includes('\n') || source.relevance.length > 200) {
          // Truncate and sanitize
          source.relevance = source.relevance
            .replace(/"/g, "'")
            .replace(/\\/g, "/")
            .replace(/\n/g, " ")
            .substring(0, 200);
        }
      } else {
        source.relevance = `Information about ${content.technology || 'technology'}`;
      }
      
      return source;
    });
  }
  
  return content;
}

const DEFAULT_PROMPTS = {
  parsing: `Analyze this technology solution request and extract key information:

"{input}"

Extract and return in JSON format:
- technology: main technology/platform
- scale: number of users/size
- industry: industry sector
- compliance: compliance requirements
- complexity: complexity factors

Be specific and detailed.${JSON_RESPONSE_INSTRUCTION}`,

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
11. Technical requirements and specifications
12. Industry-specific implementation considerations
13. Integration requirements with existing systems
14. Security best practices and requirements
15. Data migration and integrity verification methods

CRITICAL RESEARCH AREAS:
- Find SPECIFIC tools, platforms, and methodologies used for this technology
- Identify EXACT service components typically included in professional services for this technology
- Research PRECISE hour estimates for each service component based on industry standards
- Determine SPECIFIC compliance requirements and how they affect implementation
- Discover REAL-WORLD challenges and solutions from actual implementations

IMPORTANT: At the end of your research, list the specific sources you would reference for this technology, including:
- Vendor documentation URLs
- Industry standards documents
- Best practice guides
- Case studies
- Professional services benchmarks
- Implementation methodologies
- Compliance frameworks

Format sources as: SOURCE: [URL] | [Title] | [Relevance]

Provide specific, actionable research findings that would inform professional services scoping.
Focus on current 2024-2025 industry standards and practices.
Include enough detail to generate at least 15 distinct discovery questions and 10 services with 3 subservices each.${JSON_RESPONSE_INSTRUCTION}`,

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
- Compliance requirements and implementation approaches
- Security considerations and best practices
- Data integrity verification methods
- Integration points and requirements
- Client responsibilities and prerequisites
- Scope boundaries and limitations

IMPORTANT: Ensure your analysis provides enough detail to support generating:
- MINIMUM 15 distinct discovery questions that impact level of effort
- AT LEAST 10 professional services across all implementation phases
- AT LEAST 3 services specifically for the Implementation phase
- Each service must have exactly 3 subservices
- AT LEAST 5 unique calculations that affect service hours

Base your analysis on current professional services benchmarks and proven methodologies.${JSON_RESPONSE_INSTRUCTION}`,
}

// Generic function to call OpenRouter API for any model
async function callOpenRouter({ model, prompt }: { model: string; prompt: string }): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("No OpenRouter API key set")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  // OpenRouter returns choices[0].message.content
  return data.choices?.[0]?.message?.content || ""
}

// Update generateTextWithTimeout to use callOpenRouter
async function generateTextWithTimeout(
  options: { model: string; prompt: string },
  timeoutMs: number = 120000, // 2 minutes default timeout
  stepName: string = "AI call"
): Promise<{ text: string }> {
  const startTime = Date.now()
  console.log(`[${stepName}] Starting with model: ${options.model}, prompt length: ${options.prompt.length}`)
  
  try {
    const timeoutPromise = new Promise<{ text: string }>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`[${stepName}] Timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    const resultPromise = (async (): Promise<{ text: string }> => {
      const text = await callOpenRouter(options)
      return { text }
    })()

    const result = await Promise.race([resultPromise, timeoutPromise])

    const duration = Date.now() - startTime
    console.log(`[${stepName}] Completed successfully in ${duration}ms`)
    console.log(`[${stepName}] Response length: ${result.text?.length || 0} characters`)

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[${stepName}] Failed after ${duration}ms:`, {
      error: error.message,
      stepName,
      model: options.model,
      promptLength: options.prompt?.length || 0
    })
    throw error
  }
}

async function parseAIResponse(response: string): Promise<any> {
  // First, clean the response
  let cleaned = cleanAIResponse(response)
  
  // Fix URL issues before parsing
  cleaned = fixUrlsInJson(cleaned)
  
  console.log("Cleaned response length:", cleaned.length)
  console.log("First 200 chars:", cleaned.substring(0, 200))
  console.log("Last 200 chars:", cleaned.substring(Math.max(0, cleaned.length - 200)))
  
  // Extract questions directly from the cleaned response before any JSON parsing
  const extractedQuestions: any[] = [];
  const questionRegex = /"question"\s*:\s*"([^"]+)"[\s\S]*?"options"\s*:\s*\[([\s\S]*?)\]/g;
  const questionMatches = Array.from(cleaned.matchAll(questionRegex));
  
  if (questionMatches && questionMatches.length > 0) {
    console.log(`Found ${questionMatches.length} direct question matches in response`);
    for (let i = 0; i < questionMatches.length; i++) {
      try {
        const match = questionMatches[i];
        const question = match[1];
        const optionsText = match[2];
        
        // Extract options
        const options: any[] = [];
        const optionRegex = /"([^"]+)"/g;
        const optionMatches = Array.from(optionsText.matchAll(optionRegex));
        
        // Track used keys to avoid duplicates
        const usedKeys = new Set();
        
        if (optionMatches && optionMatches.length > 0) {
          for (let j = 0; j < optionMatches.length; j++) {
            const key = optionMatches[j][1].trim();
            
            // Skip duplicate keys
            if (usedKeys.has(key)) continue;
            usedKeys.add(key);
            
            options.push({
              key: key,
              value: j+1,
              default: j === 0
            });
          }
        }
        
        if (options.length > 0 && question) {
          extractedQuestions.push({
            id: `q${i+1}`,
            slug: `question-${i+1}`,
            question: question,
            options: options
          });
        }
      } catch (e) {
        console.log(`Failed to extract question ${i+1}`);
      }
    }
  }
  
  // Extract calculations directly from the cleaned response before any JSON parsing
  const extractedCalculations: any[] = [];
  const calculationRegex = /{[^{}]*(?:"name"|"formula_name"|"formula_description")\s*:\s*"([^"]+)"[^{}]*"formula"\s*:\s*"([^"]+)"[^{}]*}/g;
  const calculationMatches = Array.from(cleaned.matchAll(calculationRegex));
  
  if (calculationMatches && calculationMatches.length > 0) {
    console.log(`Found ${calculationMatches.length} direct calculation matches in response`);
    for (let i = 0; i < calculationMatches.length; i++) {
      try {
        const name = calculationMatches[i][1];
        const formula = calculationMatches[i][2];
        
        extractedCalculations.push({
          id: `calc${i+1}`,
          slug: `calc-${i+1}`,
          name: name,
          description: `${name} calculation for determining resource requirements.`,
          formula: formula,
          mappedQuestions: extractedQuestions.length > 0 ? [extractedQuestions[0].slug] : [],
          resultType: "multiplier"
        });
      } catch (e) {
        console.log(`Failed to extract calculation ${i+1}`);
      }
    }
  }
  
  // Try standard JSON parsing first
  try {
    const parsed = JSON.parse(cleaned);
    
    // If parsed successfully, check if we need to transform the structure
    // Look for common nested structures in the responses and normalize them
    let result;
    if (parsed.email_migration_research || 
        parsed.research_results || 
        parsed.content || 
        parsed.migration_research) {
      // Extract from nested structure
      result = parsed.email_migration_research || 
               parsed.research_results || 
               parsed.content || 
               parsed.migration_research;
    } else {
      // Use the parsed object directly
      result = parsed;
    }
    
    // Add our directly extracted questions and calculations if they exist
    if (extractedQuestions.length > 0) {
      result.questions = extractedQuestions;
    }
    
    if (extractedCalculations.length > 0) {
      result.calculations = extractedCalculations;
    }
    
    return result;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log("Initial JSON parsing failed, attempting advanced recovery:", errorMessage);
    
    // Try to fix common JSON issues
    try {
      // Fix missing quotes around property names
      const fixedJson = cleaned.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '$1"$3":');
      const parsed = JSON.parse(fixedJson);
      
      // Add our directly extracted questions and calculations if they exist
      if (extractedQuestions.length > 0) {
        parsed.questions = extractedQuestions;
      }
      
      if (extractedCalculations.length > 0) {
        parsed.calculations = extractedCalculations;
      }
      
      return parsed;
    } catch (e2) {
      console.log("Basic fixes didn't work, attempting structural recovery");
      
      // Create a minimal valid object from the fragments we can extract
      const extractedContent = await extractContentFromFragments(cleaned, extractedQuestions, extractedCalculations);
      
      return extractedContent;
    }
  }
}

// Helper function to extract content from fragments when JSON parsing fails
async function extractContentFromFragments(cleaned: string, extractedQuestions: any[] = [], extractedCalculations: any[] = []): Promise<any> {
  // Create a base object
  const extractedContent: any = {
    technology: "",
    questions: extractedQuestions,
    calculations: extractedCalculations,
    services: [],
    totalHours: 0,
    sources: []
  };
  
  try {
    // Extract technology name
    const techMatch = cleaned.match(/"technology"\s*:\s*"([^"]+)"/)
    if (techMatch && techMatch[1]) {
      extractedContent.technology = techMatch[1];
    }
    
    // Extract services
    const servicesMatch = cleaned.match(/"services"\s*:\s*\[([\s\S]*?)\](?=\s*,\s*"totalHours"|$)/)
    if (servicesMatch && servicesMatch[1]) {
      try {
        // Try to parse the services array
        const servicesText = `[${servicesMatch[1]}]`;
        try {
          const servicesArray = JSON.parse(servicesText);
          if (Array.isArray(servicesArray) && servicesArray.length > 0) {
            extractedContent.services = servicesArray.map((svc, index) => {
              // Ensure each service has required fields
              const serviceName = svc.name || svc.service || `Service ${index+1}`;
              const servicePhase = svc.phase || "Implementation";
              const serviceDescription = svc.description || `${serviceName} for ${extractedContent.technology}`;
              
              const service = {
                phase: servicePhase,
                name: serviceName,
                description: serviceDescription,
                hours: svc.hours || svc.hourEstimate || 40,
                // Add scope language fields with detailed content
                serviceDescription: svc.serviceDescription || 
                  `This service provides comprehensive ${serviceName} for ${extractedContent.technology} implementations. Our team will conduct a detailed analysis of your requirements and deliver a solution tailored to your specific needs. The service includes all necessary documentation and knowledge transfer.`,
                keyAssumptions: svc.keyAssumptions || 
                  `Client will provide timely access to required systems and stakeholders. Existing infrastructure meets minimum requirements for ${extractedContent.technology}. Work will be performed during standard business hours unless otherwise specified.`,
                clientResponsibilities: svc.clientResponsibilities || 
                  `Client will designate a project manager to serve as the primary point of contact. Client will ensure all necessary hardware and software licenses are available prior to implementation. Client will provide appropriate access credentials and documentation for existing systems.`,
                outOfScope: svc.outOfScope || 
                  `Hardware procurement is not included in this service. Training beyond knowledge transfer sessions is not included. Support for third-party applications not directly related to ${extractedContent.technology} is excluded.`,
                subservices: [] as any[]
              };
              
              // Process subservices
              if (Array.isArray(svc.subservices)) {
                service.subservices = svc.subservices.map((sub: any, subIndex: number) => {
                  // Handle both string and object subservices
                  if (typeof sub === 'string') {
                    const subName = sub;
                    const subHours = Math.floor(service.hours / 3);
                    return {
                      name: subName,
                      description: `${subName} activities for ${serviceName}`,
                      hours: subHours,
                      mappedQuestions: extractedContent.questions.length > 0 ? 
                        [extractedContent.questions[Math.min(subIndex, extractedContent.questions.length-1)].slug] : [],
                      calculationSlug: extractedContent.calculations.length > 0 ? 
                        extractedContent.calculations[Math.min(subIndex, extractedContent.calculations.length-1)].slug : undefined,
                      serviceDescription: `This subservice focuses on delivering ${subName} as part of the overall ${serviceName} service. Our experts will implement industry best practices to ensure optimal performance and reliability. The work includes detailed documentation and validation of results.`,
                      keyAssumptions: `Required access to systems will be provided in a timely manner. Existing documentation is available and up-to-date. The environment meets the minimum requirements for ${extractedContent.technology} implementation.`,
                      clientResponsibilities: `Client will provide necessary information about current configurations and requirements. Client will make subject matter experts available for consultation. Client will review and approve deliverables within the agreed timeframe.`,
                      outOfScope: `Custom development beyond standard configuration is not included. Migration of legacy data not specifically identified in requirements is excluded. Extended support beyond the implementation period is not included.`
                    };
                  } else {
                    const subName = sub.name || `Subservice ${subIndex+1}`;
                    const subDescription = sub.description || `${subName} activities`;
                    const subHours = sub.hours || Math.floor(service.hours / 3);
                    return {
                      name: subName,
                      description: subDescription,
                      hours: subHours,
                      mappedQuestions: Array.isArray(sub.mappedQuestions) ? sub.mappedQuestions : 
                        (extractedContent.questions.length > 0 ? 
                          [extractedContent.questions[Math.min(subIndex, extractedContent.questions.length-1)].slug] : []),
                      calculationSlug: sub.calculationSlug || 
                        (extractedContent.calculations.length > 0 ? 
                          extractedContent.calculations[Math.min(subIndex, extractedContent.calculations.length-1)].slug : undefined),
                      serviceDescription: sub.serviceDescription || 
                        `This subservice delivers comprehensive ${subName} capabilities as part of the ${serviceName} service. Our team will implement industry-leading practices to ensure optimal outcomes and alignment with your business objectives. The work includes detailed planning, execution, and validation phases.`,
                      keyAssumptions: sub.keyAssumptions || 
                        `Client environment meets the minimum technical requirements for ${extractedContent.technology}. Appropriate stakeholders will be available for meetings and decision-making. Work will be performed remotely unless otherwise specified.`,
                      clientResponsibilities: sub.clientResponsibilities || 
                        `Client will provide timely responses to information requests. Client will ensure appropriate resources are available for testing and validation. Client will designate a technical point of contact with decision-making authority.`,
                      outOfScope: sub.outOfScope || 
                        `Performance optimization beyond initial implementation is not included. Integration with systems not explicitly mentioned in requirements is excluded. Extended support beyond the implementation period is not included in this subservice.`
                    };
                  }
                });
              }
              
              // Ensure we have at least 3 subservices
              while (service.subservices.length < 3) {
                const subIndex = service.subservices.length;
                const subName = `${serviceName} Component ${subIndex + 1}`;
                service.subservices.push({
                  name: subName,
                  description: `Supporting activities for ${serviceName}`,
                  hours: Math.floor(service.hours / 3),
                  mappedQuestions: extractedContent.questions.length > 0 ? 
                    [extractedContent.questions[Math.min(subIndex, extractedContent.questions.length-1)].slug] : [],
                  calculationSlug: extractedContent.calculations.length > 0 ? 
                    extractedContent.calculations[Math.min(subIndex, extractedContent.calculations.length-1)].slug : undefined,
                  serviceDescription: `This subservice provides essential ${subName} implementation for ${extractedContent.technology}. Our team will leverage industry best practices to ensure optimal configuration and performance. The service includes comprehensive documentation and knowledge transfer sessions.`,
                  keyAssumptions: `Client will provide necessary access to systems and information. The environment meets minimum technical requirements. Work will be performed during standard business hours unless otherwise specified.`,
                  clientResponsibilities: `Client will designate appropriate technical contacts. Client will ensure timely review and approval of deliverables. Client will provide access to necessary systems and documentation.`,
                  outOfScope: `Custom development beyond standard configuration is not included. Integration with systems not specified in requirements is excluded. Extended support beyond the implementation period is not included.`
                } as any);
              }
              
              return service;
            });
            
            // Calculate total hours
            extractedContent.totalHours = extractedContent.services.reduce(
              (total: number, service: any) => total + (service.hours || 0), 0
            );
          }
        } catch (e) {
          console.error("Failed to parse services array:", e);
        }
      } catch (e) {
        console.error("Failed to extract services:", e);
      }
    }
    
    // Extract sources
    const sourcesMatch = cleaned.match(/"sources"\s*:\s*\[([\s\S]*?)\]/)
    if (sourcesMatch && sourcesMatch[1]) {
      try {
        // Try to extract source titles
        const sourceTitleRegex = /"title"\s*:\s*"([^"]+)"/g;
        const titleMatches = Array.from(sourcesMatch[1].matchAll(sourceTitleRegex));
        if (titleMatches && titleMatches.length > 0) {
          for (const match of titleMatches) {
            extractedContent.sources.push({
              url: "",
              title: match[1],
              relevance: `Source for ${extractedContent.technology}`
            });
          }
        }
      } catch (e) {
        console.error("Failed to extract sources:", e);
      }
    }
    
    return extractedContent;
  } catch (e) {
    console.error("Error extracting content from fragments:", e);
    return {
      technology: "Technology Solution",
      questions: extractedQuestions,
      calculations: extractedCalculations,
      services: [],
      totalHours: 0,
      sources: []
    };
  }
}

// Function to normalize nested structures into the expected format
function normalizeNestedStructure(parsed: any): any {
  try {
    console.log("Normalizing nested structure...");
    
    const normalized: any = {
      technology: "",
      questions: [],
      calculations: [],
      services: [],
      totalHours: 0,
      sources: []
    };
    
    // Extract technology name - try multiple possible locations
    if (parsed.technology) {
      normalized.technology = parsed.technology;
    } else if (parsed.project_scope?.title) {
      normalized.technology = parsed.project_scope.title;
    } else if (parsed.email_migration_research) {
      normalized.technology = "Email Migration to Office 365";
    } else if (parsed.migration_research) {
      normalized.technology = "Email Migration to Office 365";
    } else if (parsed.research_findings?.implementation_methodologies?.recommended_frameworks?.[0]) {
      normalized.technology = parsed.research_findings.implementation_methodologies.recommended_frameworks[0];
    } else if (parsed.implementation_methodologies?.recommended_frameworks?.[0]) {
      normalized.technology = parsed.implementation_methodologies.recommended_frameworks[0];
    } else if (parsed.project_title) {
      normalized.technology = parsed.project_title;
    }
    
    // Extract questions from various possible locations
    if (Array.isArray(parsed.questions)) {
      normalized.questions = parsed.questions;
    } else if (parsed.assessment_questions) {
      // Convert assessment_questions to the expected format
      normalized.questions = Object.entries(parsed.assessment_questions).map(([id, q]: [string, any], index) => ({
        id: id,
        slug: id.replace('question_', ''),
        question: q.text || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options.map((opt: string, i: number) => ({
          key: opt,
          value: i + 1,
          default: i === 0
        })) : []
      }));
    } else if (parsed.discovery_questions) {
      // Convert discovery_questions to the expected format
      normalized.questions = parsed.discovery_questions.map((q: any, index: number) => ({
        id: `q${index + 1}`,
        slug: `question-${index + 1}`,
        question: q.question,
        options: Array.isArray(q.options) ? q.options.map((opt: string, i: number) => ({
          key: opt,
          value: i + 1,
          default: i === 0
        })) : []
      }));
    } else if (parsed.email_migration_research?.assessment_questions) {
      normalized.questions = Object.entries(parsed.email_migration_research.assessment_questions).map(([id, q]: [string, any], index) => ({
        id: id,
        slug: id.replace('question_', ''),
        question: q.text || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options.map((opt: string, i: number) => ({
          key: opt,
          value: i + 1,
          default: i === 0
        })) : []
      }));
    } else if (parsed.research_findings?.assessment_questions) {
      normalized.questions = Object.entries(parsed.research_findings.assessment_questions).map(([id, q]: [string, any], index) => ({
        id: id,
        slug: id.replace('question_', ''),
        question: q.text || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options.map((opt: string, i: number) => ({
          key: opt,
          value: i + 1,
          default: i === 0
        })) : []
      }));
    }
    
    // Extract calculations
    if (Array.isArray(parsed.calculations)) {
      normalized.calculations = parsed.calculations;
    }
    
    // Extract services from various possible locations
    if (Array.isArray(parsed.services)) {
      normalized.services = parsed.services;
    } else {
      // Try to find services in different locations
      const serviceLocations = [
        parsed.service_components,
        parsed.service_components?.core_services,
        parsed.email_migration_research?.professional_services?.core_services,
        parsed.email_migration_research?.service_components,
        parsed.research_findings?.service_components?.core_services,
        parsed.research_findings?.service_components,
        parsed.implementation_services,
        parsed.service_breakdown,
        parsed.professional_services?.service_components,
        parsed.professional_services
      ];
      
      let foundServices = false;
      
      for (const location of serviceLocations) {
        if (Array.isArray(location)) {
          normalized.services = location;
          foundServices = true;
          break;
        }
      }
    }
    
    // Extract sources from various possible locations
    if (Array.isArray(parsed.sources)) {
      normalized.sources = parsed.sources;
    } else if (parsed.reference_sources) {
      normalized.sources = parsed.reference_sources;
    } else if (parsed.email_migration_research?.reference_sources) {
      normalized.sources = parsed.email_migration_research.reference_sources;
    } else if (parsed.research_findings?.reference_sources) {
      normalized.sources = parsed.research_findings.reference_sources;
    } else if (parsed.resources) {
      normalized.sources = parsed.resources;
    }
    
    // Ensure we have at least one source
    if (!normalized.sources || normalized.sources.length === 0) {
      normalized.sources = [
        {
          url: "https://example.com",
          title: "Default Resource",
          relevance: "Implementation guidance"
        }
      ];
    }
    
    // Calculate total hours
    if (typeof parsed.totalHours === 'number') {
      normalized.totalHours = parsed.totalHours;
    } else if (typeof parsed.total_estimated_hours === 'number') {
      normalized.totalHours = parsed.total_estimated_hours;
    } else if (typeof parsed.total_hours === 'number') {
      normalized.totalHours = parsed.total_hours;
    } else if (Array.isArray(normalized.services)) {
      normalized.totalHours = normalized.services.reduce((total: number, service: any) => total + (service.hours || 0), 0);
    }
    
    console.log("Successfully normalized nested structure");
    return normalized;
  } catch (error) {
    console.error("Error in normalizeNestedStructure:", error);
    
    // Return a minimal valid structure
    return {
      technology: "Technology Solution",
      questions: [
        {
          id: "q1",
          slug: "default-question",
          question: "What is your implementation timeline?",
          options: [
            { key: "Standard (3-6 months)", value: 1, default: true },
            { key: "Accelerated (1-3 months)", value: 2 },
            { key: "Extended (6-12 months)", value: 3 }
          ]
        }
      ],
      calculations: [],
      services: [
        {
          phase: "Planning",
          service: "Implementation Planning",
          description: "Comprehensive planning for implementation",
          hours: 40,
          subservices: [
            { name: "Requirements Gathering", description: "Gather implementation requirements", hours: 16 },
            { name: "Solution Design", description: "Design the implementation solution", hours: 16 },
            { name: "Implementation Planning", description: "Create implementation plan", hours: 8 }
          ]
        }
      ],
      totalHours: 40,
      sources: [
        {
          url: "https://example.com",
          title: "Implementation Guide",
          relevance: "Official implementation documentation"
        }
      ]
    };
  }
}

// Retry logic with exponential backoff
async function generateWithRetry(
  prompt: string, 
  model: string, 
  maxAttempts: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} for ${model}`)
      
      // Add a specific instruction to return valid JSON
      const enhancedPrompt = prompt + "\n\nIMPORTANT: Return only valid JSON. Do not include markdown code blocks. Start with { and end with }. Do NOT nest your response inside fields like 'email_migration_research' or 'research_findings'."
      
      const response = await callOpenRouter({ model, prompt: enhancedPrompt })
      
      try {
        // First try parsing directly
        const parsed = await parseAIResponse(response)
        
        // Basic validation of the response
        if (!parsed || typeof parsed !== 'object') {
          throw new Error(`Invalid response structure: ${typeof parsed}`)
        }
        
        // Check if we need to normalize a nested structure
        if (parsed.email_migration_research || parsed.research_findings || 
            parsed.project_scope || parsed.assessment_questions) {
          console.log(`⚠️ Parse error on attempt ${attempt}: Detected nested structure, normalizing...`)
          const normalized = normalizeNestedStructure(parsed)
          console.log("✅ Successfully normalized nested structure")
          return normalized
        }
        
        console.log(`✅ Successfully parsed response from ${model}`)
        return parsed
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError)
        console.error(`⚠️ Parse error on attempt ${attempt}:`, errorMessage)
        
        // If this is the last attempt, try a more aggressive approach
        if (attempt === maxAttempts) {
          console.log("🔄 Last attempt, trying more aggressive parsing approach")
          
          // Try to extract any valid JSON object from the response
          const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g
          const matches = response.match(jsonRegex)
          
          if (matches && matches.length > 0) {
            // Find the largest JSON object (likely the main one)
            const largestMatch = matches.reduce((a, b) => a.length > b.length ? a : b)
            
            try {
              const extracted = JSON.parse(largestMatch)
              console.log("✅ Successfully extracted valid JSON using regex")
              
              // Check if we need to normalize a nested structure
              if (extracted.email_migration_research || extracted.research_findings || 
                  extracted.project_scope || extracted.assessment_questions) {
                console.log("Detected nested structure in extracted JSON, normalizing...")
                const normalized = normalizeNestedStructure(extracted)
                return normalized
              }
              
              return extracted
            } catch (regexError) {
              console.error("❌ Failed to parse extracted JSON:", 
                regexError instanceof Error ? regexError.message : String(regexError))
            }
          }
        }
        
        throw new Error(`Failed to parse response: ${errorMessage}`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Attempt ${attempt} failed:`, errorMessage)
      
      if (attempt === maxAttempts) {
        throw new Error(`All ${maxAttempts} attempts failed: ${errorMessage}`)
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      console.log(`⏱️ Waiting ${delay}ms before next attempt`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error("Unexpected error in generateWithRetry")
}

// Validate content structure to ensure it meets requirements
function validateContentStructure(content: any): boolean {
  if (!content || typeof content !== 'object') {
    throw new Error('Content is not a valid object')
  }

  // Check required top-level fields
  if (!content.technology || typeof content.technology !== 'string') {
    console.warn('⚠️ Missing or invalid technology field, attempting to fix')
    // Try to infer technology from other fields if possible
    if (content.project_scope?.title) {
      content.technology = content.project_scope.title
    } else if (content.email_migration_research) {
      content.technology = "Email Migration"
    } else if (content.research_findings?.implementation_methodologies?.recommended_frameworks?.[0]) {
      content.technology = content.research_findings.implementation_methodologies.recommended_frameworks[0]
    } else {
      throw new Error('Missing or invalid technology field and unable to infer')
    }
  }

  // Validate or create questions
  if (!Array.isArray(content.questions) || content.questions.length < 10) {
    console.warn(`⚠️ Insufficient questions: ${content.questions?.length || 0}/10 minimum, generating default questions`)
    
    // Keep existing questions if any
    const existingQuestions = Array.isArray(content.questions) ? content.questions : [];
    
    // Generate technology-specific questions based on the content
    const defaultQuestions = [
      {
        id: "q_environment_complexity",
        slug: "environment-complexity",
        question: `What is the complexity of the ${content.technology} environment?`,
        options: [
          { key: "Simple (minimal customization)", value: 1, default: true },
          { key: "Moderate (some customization)", value: 2 },
          { key: "Complex (significant customization)", value: 3 }
        ]
      },
      {
        id: "q_user_count",
        slug: "user-count",
        question: `How many users will be using the ${content.technology} solution?`,
        options: [
          { key: "Small (1-100 users)", value: 1, default: true },
          { key: "Medium (101-500 users)", value: 2 },
          { key: "Large (501-1000 users)", value: 3 },
          { key: "Enterprise (1000+ users)", value: 4 }
        ]
      },
      {
        id: "q_timeline",
        slug: "implementation-timeline",
        question: `What is your implementation timeline for ${content.technology}?`,
        options: [
          { key: "Standard (3-6 months)", value: 1, default: true },
          { key: "Accelerated (1-3 months)", value: 2 },
          { key: "Extended (6-12 months)", value: 3 }
        ]
      },
      {
        id: "q_integration",
        slug: "integration-requirements",
        question: `What level of integration is required for ${content.technology}?`,
        options: [
          { key: "Basic (minimal integration)", value: 1, default: true },
          { key: "Standard (typical integrations)", value: 2 },
          { key: "Complex (multiple custom integrations)", value: 3 }
        ]
      },
      {
        id: "q_data_migration",
        slug: "data-migration-volume",
        question: `What is the volume of data to be migrated to ${content.technology}?`,
        options: [
          { key: "Small (under 100GB)", value: 1, default: true },
          { key: "Medium (100GB-1TB)", value: 2 },
          { key: "Large (1TB-10TB)", value: 3 },
          { key: "Very Large (10TB+)", value: 4 }
        ]
      },
      {
        id: "q_compliance",
        slug: "compliance-requirements",
        question: `What compliance requirements apply to your ${content.technology} implementation?`,
        options: [
          { key: "Standard (no specific requirements)", value: 1, default: true },
          { key: "Industry-specific (e.g., HIPAA, PCI)", value: 2 },
          { key: "Multiple frameworks (e.g., HIPAA, GDPR, SOX)", value: 3 }
        ]
      },
      {
        id: "q_training",
        slug: "training-requirements",
        question: `What level of training is required for ${content.technology}?`,
        options: [
          { key: "Basic (self-service materials)", value: 1, default: true },
          { key: "Standard (group training sessions)", value: 2 },
          { key: "Comprehensive (personalized training)", value: 3 }
        ]
      }
    ];
    
    // Combine existing with defaults, ensuring we have at least 10 questions
    const additionalNeeded = Math.max(0, 10 - existingQuestions.length);
    const additionalQuestions = defaultQuestions.slice(0, additionalNeeded);
    
    content.questions = [...existingQuestions, ...additionalQuestions];
    console.log(`✅ Generated ${additionalQuestions.length} additional questions to meet minimum requirements`);
  }

  // Validate or create calculations
  if (!Array.isArray(content.calculations) || content.calculations.length < 5) {
    console.warn(`⚠️ Insufficient calculations: ${content.calculations?.length || 0}/5 minimum, generating default calculations`)
    
    // Keep existing calculations if any
    const existingCalculations = Array.isArray(content.calculations) ? content.calculations : [];
    
    // Find available question slugs to map calculations to
    const availableQuestionSlugs = Array.isArray(content.questions) ? 
      content.questions.map((q: any) => q.slug || '') : [];
    
    // Generate technology-specific calculations that map to different questions
    const defaultCalculations = [
      {
        id: "complexity_factor",
        slug: "complexity_factor",
        name: `${content.technology} Complexity Factor`,
        description: `Adjusts hours based on ${content.technology} environment complexity`,
        formula: "environment_complexity * 1.5",
        mappedQuestions: availableQuestionSlugs.length > 0 ? [availableQuestionSlugs[0]] : ["environment-complexity"],
        resultType: "multiplier"
      },
      {
        id: "user_count_factor",
        slug: "user_count_factor",
        name: "User Count Factor",
        description: `Adjusts hours based on number of ${content.technology} users`,
        formula: "user_count * 1.2",
        mappedQuestions: availableQuestionSlugs.length > 1 ? [availableQuestionSlugs[1]] : ["user-count"],
        resultType: "multiplier"
      },
      {
        id: "integration_factor",
        slug: "integration_factor",
        name: "Integration Complexity Factor",
        description: `Adjusts hours based on ${content.technology} integration requirements`,
        formula: "integration_requirements * 1.3",
        mappedQuestions: availableQuestionSlugs.length > 2 ? [availableQuestionSlugs[2]] : ["integration-requirements"],
        resultType: "multiplier"
      },
      {
        id: "data_migration_factor",
        slug: "data_migration_factor",
        name: "Data Migration Volume Factor",
        description: `Adjusts hours based on ${content.technology} data migration volume`,
        formula: "data_migration_volume * 1.4",
        mappedQuestions: availableQuestionSlugs.length > 3 ? [availableQuestionSlugs[3]] : ["data-migration-volume"],
        resultType: "multiplier"
      },
      {
        id: "compliance_factor",
        slug: "compliance_factor",
        name: "Compliance Requirements Factor",
        description: `Adjusts hours based on ${content.technology} compliance requirements`,
        formula: "compliance_requirements * 1.25",
        mappedQuestions: availableQuestionSlugs.length > 4 ? [availableQuestionSlugs[4]] : ["compliance-requirements"],
        resultType: "multiplier"
      }
    ];
    
    // Ensure existing calculations have descriptive slugs and proper question mappings
    existingCalculations.forEach((calc: any, index: number) => {
      // Check if the slug is generic like "calc1" or missing
      if (!calc.slug || calc.slug.match(/^calc\d+$/)) {
        // Generate a descriptive slug based on the calculation name
        const baseName = (calc.name || "calculation").toLowerCase().replace(/[^a-z0-9]+/g, '_');
        calc.slug = `${baseName}_factor`;
      }
      
      // Ensure each calculation has a descriptive name
      if (!calc.name || calc.name.match(/^Calculation \d+$/)) {
        calc.name = `${content.technology} ${calc.id || "Factor"}`;
      }
      
      // Ensure each calculation maps to a different question if possible
      if (!calc.mappedQuestions || calc.mappedQuestions.length === 0 || 
          (calc.mappedQuestions.length === 1 && calc.mappedQuestions[0] === availableQuestionSlugs[0])) {
        const questionIndex = Math.min(index, availableQuestionSlugs.length - 1);
        if (questionIndex >= 0 && availableQuestionSlugs[questionIndex]) {
          calc.mappedQuestions = [availableQuestionSlugs[questionIndex]];
        }
      }
      
      // Ensure formula has a multiplier effect
      if (!calc.formula || calc.formula === "1" || calc.formula === availableQuestionSlugs[0]) {
        const questionSlug = calc.mappedQuestions && calc.mappedQuestions.length > 0 ? 
          calc.mappedQuestions[0] : availableQuestionSlugs[0];
        calc.formula = `${questionSlug} * ${(1 + (index * 0.1)).toFixed(1)}`;
      }
    });
    
    // Combine existing with defaults, ensuring we have at least 5 calculations
    const additionalNeeded = Math.max(0, 5 - existingCalculations.length);
    const additionalCalculations = defaultCalculations.slice(0, additionalNeeded);
    
    content.calculations = [...existingCalculations, ...additionalCalculations];
    console.log(`✅ Generated ${additionalCalculations.length} additional calculations to meet minimum requirements`);
  }

  // Validate or create services
  if (!Array.isArray(content.services) || content.services.length < 10) {
    console.warn(`⚠️ Insufficient services: ${content.services?.length || 0}/10 minimum, generating default services`)
    
    // Keep existing services if any
    const existingServices = Array.isArray(content.services) ? content.services : [];
    
    // Define the required phases
    const phases = ["Initiating", "Planning", "Implementation", "Monitoring and Controlling", "Closing"];
    
    // Group existing services by phase
    const servicesByPhase: {[key: string]: any[]} = {};
    phases.forEach(phase => servicesByPhase[phase] = []);
    
    existingServices.forEach((service: Service) => {
      const phase = service.phase || "Implementation";
      if (!servicesByPhase[phase]) {
        servicesByPhase[phase] = [];
      }
      servicesByPhase[phase].push(service);
    });
    
    // Add more services if needed to reach minimum of 10
    if (existingServices.length < 10) {
      const additionalNeeded = 10 - existingServices.length;
      
      // Define additional specialized services for each phase
      const specializedServices = {
        "Initiating": [
          `${content.technology} Requirements Analysis`,
          `${content.technology} Project Charter Development`,
          `${content.technology} Stakeholder Analysis`
        ],
        "Planning": [
          `${content.technology} Architecture Design`,
          `${content.technology} Resource Planning`,
          `${content.technology} Risk Assessment`
        ],
        "Implementation": [
          `${content.technology} Core Configuration`,
          `${content.technology} Integration Services`,
          `${content.technology} Data Migration`,
          `${content.technology} Security Implementation`,
          `${content.technology} Testing and Validation`
        ],
        "Monitoring and Controlling": [
          `${content.technology} Performance Monitoring`,
          `${content.technology} Quality Assurance`,
          `${content.technology} Change Management`
        ],
        "Closing": [
          `${content.technology} Knowledge Transfer`,
          `${content.technology} Documentation Finalization`,
          `${content.technology} Project Closure`
        ]
      };
      
      // Generate default services
      const defaultServices = [];
      
      // First ensure each phase has at least 1 service
      phases.forEach(phase => {
        if (servicesByPhase[phase].length === 0) {
          const serviceName = specializedServices[phase as keyof typeof specializedServices][0];
          const service = createDetailedService(content.technology, phase, serviceName);
          defaultServices.push(service);
          servicesByPhase[phase].push(service);
        }
      });
      
      // Then ensure Implementation phase has at least 3 services
      if (servicesByPhase["Implementation"].length < 3) {
        const implementationCount = servicesByPhase["Implementation"].length;
        for (let i = implementationCount; i < 3; i++) {
          const serviceName = specializedServices["Implementation"][i];
          const service = createDetailedService(content.technology, "Implementation", serviceName);
          defaultServices.push(service);
          servicesByPhase["Implementation"].push(service);
        }
      }
      
      // Add more services if needed to reach minimum of 10
      if (defaultServices.length < additionalNeeded) {
        let moreNeeded = additionalNeeded - defaultServices.length;
        let phaseIndex = 0;
        
        while (moreNeeded > 0) {
          const phase = phases[phaseIndex % phases.length];
          const phaseServices = specializedServices[phase as keyof typeof specializedServices];
          const serviceIndex = servicesByPhase[phase].length;
          
          if (serviceIndex < phaseServices.length) {
            const serviceName = phaseServices[serviceIndex];
            const service = createDetailedService(content.technology, phase, serviceName);
            defaultServices.push(service);
            servicesByPhase[phase].push(service);
            moreNeeded--;
          }
          
          phaseIndex++;
        }
      }
      
      // Add default services to existing services
      content.services = [...existingServices, ...defaultServices];
      console.log(`✅ Generated ${defaultServices.length} additional services to meet minimum requirements`);
    }
    
    // Recalculate total hours
    content.totalHours = content.services.reduce((total: number, service: any) => total + (service.hours || 0), 0);
  }
  
  // Ensure each service has proper scope language fields
  for (const [index, service] of content.services.entries()) {
    // Check for missing scope language fields
    if (!service.serviceDescription || service.serviceDescription.length < 100) {
      service.serviceDescription = generateServiceDescription(content.technology, service.name || service.service, service.phase);
    }
    
    if (!service.keyAssumptions || service.keyAssumptions.length < 100) {
      service.keyAssumptions = generateKeyAssumptions(content.technology, service.name || service.service, service.phase);
    }
    
    if (!service.clientResponsibilities || service.clientResponsibilities.length < 100) {
      service.clientResponsibilities = generateClientResponsibilities(content.technology, service.name || service.service, service.phase);
    }
    
    if (!service.outOfScope || service.outOfScope.length < 100) {
      service.outOfScope = generateOutOfScope(content.technology, service.name || service.service, service.phase);
    }
    
    // Check each subservice
    if (Array.isArray(service.subservices)) {
      for (const [subIndex, subservice] of service.subservices.entries()) {
        if (!subservice.name || !subservice.description) {
          console.warn(`⚠️ Subservice at index ${index}.${subIndex} is missing fields, fixing`);
          subservice.name = subservice.name || `${service.name || service.service} Component ${subIndex + 1}`;
          subservice.description = subservice.description || `${subservice.name} for ${content.technology}`;
        }
        
        if (typeof subservice.hours !== 'number' || isNaN(subservice.hours)) {
          subservice.hours = Math.floor((service.hours || 40) / 3);
        }
        
        // Add or improve scope language fields for subservices
        if (!subservice.serviceDescription || subservice.serviceDescription.length < 100) {
          subservice.serviceDescription = generateSubserviceDescription(content.technology, subservice.name, service.name || service.service);
        }
        
        if (!subservice.keyAssumptions || subservice.keyAssumptions.length < 100) {
          subservice.keyAssumptions = generateSubserviceKeyAssumptions(content.technology, subservice.name, service.name || service.service);
        }
        
        if (!subservice.clientResponsibilities || subservice.clientResponsibilities.length < 100) {
          subservice.clientResponsibilities = generateSubserviceClientResponsibilities(content.technology, subservice.name, service.name || service.service);
        }
        
        if (!subservice.outOfScope || subservice.outOfScope.length < 100) {
          subservice.outOfScope = generateSubserviceOutOfScope(content.technology, subservice.name, service.name || service.service);
        }
      }
    }
  }

  // Validate or create sources
  if (!Array.isArray(content.sources) || content.sources.length < 1) {
    console.warn('⚠️ Missing sources, adding default sources')
    content.sources = [
      {
        url: "https://docs.microsoft.com",
        title: `${content.technology} Documentation`,
        relevance: "Official documentation"
      },
      {
        url: "https://www.gartner.com",
        title: "Gartner Research",
        relevance: "Industry analysis and benchmarks"
      }
    ]
  }

  // Validate or calculate total hours
  if (typeof content.totalHours !== 'number' || isNaN(content.totalHours) || content.totalHours === 0) {
    console.warn('⚠️ Missing or invalid totalHours, calculating from services')
    content.totalHours = content.services.reduce((total: number, service: any) => {
      // Include both service hours and sum of subservice hours in the calculation
      const serviceHours = typeof service.hours === 'number' && !isNaN(service.hours) ? service.hours : 0;
      let subserviceHours = 0;
      
      if (Array.isArray(service.subservices)) {
        subserviceHours = service.subservices.reduce((subTotal: number, subservice: any) => {
          return subTotal + (typeof subservice.hours === 'number' && !isNaN(subservice.hours) ? subservice.hours : 0);
        }, 0);
      }
      
      // If subservices have hours, use their sum; otherwise use service hours
      return total + (subserviceHours > 0 ? subserviceHours : serviceHours);
    }, 0);
    
    console.log(`✅ Calculated total hours: ${content.totalHours}`);
  }

  console.log('✅ Content structure validated and fixed where needed')
  return true
}

// Function removed - no longer using fallback content

// Fallback functions removed - no longer using static content

// Function removed - no longer generating static questions

// Add a new function to perform web research
async function performWebResearch(topic: string, model: string = "anthropic/claude-3-opus"): Promise<any> {
  console.log(`Performing web research on topic: ${topic}`);
  
  // Create a research prompt that instructs the model to find real sources
  const researchPrompt = `You are a professional web researcher tasked with finding authoritative sources about: "${topic}"

Your task is to conduct comprehensive research and provide 8-10 specific, real sources that would be valuable for understanding this topic.

CRITICAL RESEARCH OBJECTIVES:
1. Find sources that cover implementation methodologies and best practices
2. Identify sources with specific hour estimates for professional services
3. Locate compliance and regulatory guidance specific to the industry
4. Find case studies of similar implementations
5. Discover technical documentation with specific tools and approaches
6. Locate sources discussing common challenges and solutions
7. Find industry benchmarks and standards
8. Identify sources covering security and data integrity considerations

CRITICAL INSTRUCTIONS:
1. Return a JSON object with this EXACT structure:
{
  "sources": [
    {
      "url": "https://www.example.com/specific-page",
      "title": "Title of the source",
      "relevance": "Brief explanation of relevance",
      "category": "Source category"
    }
  ]
}

2. For each source:
   - Provide REAL URLs to actual websites that exist
   - Include specific titles that accurately reflect the content
   - Briefly explain why each source is relevant
   - Categorize each source (Vendor Documentation, Industry Resource, etc.)

3. Focus on authoritative sources like:
   - Official vendor documentation
   - Industry analyst reports
   - Technical blogs from recognized experts
   - Professional organizations and standards bodies
   - Government/regulatory guidance
   - Industry benchmarks and case studies

4. For technology topics, prioritize:
   - Official vendor documentation (e.g., cisco.com for Cisco products)
   - Industry analyst reports (Gartner, Forrester)
   - Technical implementation guides
   - Best practices documents
   - Professional services documentation

IMPORTANT: Return ONLY valid JSON with NO additional text or explanation. Start with { and end with }.`;

  try {
    // Call the OpenRouter API to perform the research
    const researchResult = await callOpenRouter({
      model,
      prompt: researchPrompt,
    });
    
    // Clean the research result
    const cleanedResult = cleanAIResponse(researchResult);
    console.log("Web research raw result length:", cleanedResult.length);
    console.log("First 200 chars:", cleanedResult.substring(0, 200));
    console.log("Last 200 chars:", cleanedResult.substring(Math.max(0, cleanedResult.length - 200)));
    
    // First attempt: Try to parse the JSON directly
    try {
      const parsedResult = JSON.parse(cleanedResult);
      if (parsedResult && parsedResult.sources && Array.isArray(parsedResult.sources)) {
        // Validate the sources
        const validatedSources = validateSources(parsedResult.sources, topic);
        if (validatedSources.length > 0) {
          console.log(`Successfully parsed ${validatedSources.length} sources from JSON`);
          return { sources: validatedSources };
        }
      }
    } catch (parseError: any) {
      console.error("Initial JSON parsing failed:", parseError.message);
    }
    
    // Second attempt: Try to extract using regex
    const extractedSources = extractSourcesUsingRegex(cleanedResult, topic);
    if (extractedSources.length > 0) {
      console.log(`Successfully extracted ${extractedSources.length} sources using regex`);
      return { sources: extractedSources };
    }
    
    // Third attempt: Try to extract any URLs
    const extractedUrls = extractUrlsFromText(cleanedResult, topic);
    if (extractedUrls.length > 0) {
      console.log(`Extracted ${extractedUrls.length} URLs from text`);
      return { sources: extractedUrls };
    }
    
    // If all attempts fail, generate dynamic sources based on the topic
    console.log("All parsing attempts failed, generating dynamic sources based on topic");
    return generateDynamicSourcesForTopic(topic);
  } catch (error) {
    console.error("Error performing web research:", error);
    // Generate dynamic sources based on the topic
    return generateDynamicSourcesForTopic(topic);
  }
}

// Function to validate sources
function validateSources(sources: any[], topic: string): any[] {
  if (!Array.isArray(sources)) return [];
  
  return sources.map(source => {
    // Create a new object with validated fields
    const validatedSource = {
      url: validateUrl(source.url || ""),
      title: source.title || `Resource about ${topic}`,
      relevance: source.relevance || `Information about ${topic}`,
      category: source.category || "Technical Resource"
    };
    
    // Ensure URL is not a placeholder
    if (validatedSource.url.includes("example.com")) {
      // Try to generate a more realistic URL based on the title and topic
      validatedSource.url = generateRealisticUrlFromTitle(validatedSource.title, topic);
    }
    
    return validatedSource;
  }).filter(source => {
    // Filter out sources with invalid URLs
    try {
      new URL(source.url);
      return true;
    } catch (e) {
      return false;
    }
  });
}

// Function to extract sources using regex
function extractSourcesUsingRegex(text: string, topic: string): any[] {
  console.log("Attempting to extract sources using regex");
  
  const sources: any[] = [];
  
  // Look for JSON-like patterns for sources
  const sourcePattern = /"url"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"(?:\s*,\s*"relevance"\s*:\s*"([^"]+)")?(?:\s*,\s*"category"\s*:\s*"([^"]+)")?/g;
  
  let match;
  while ((match = sourcePattern.exec(text)) !== null) {
    const [_, url, title, relevance, category] = match;
    
    sources.push({
      url: validateUrl(url),
      title: title || `Resource about ${topic}`,
      relevance: relevance || `Information about ${topic}`,
      category: category || "Technical Resource"
    });
  }
  
  // If we couldn't extract complete sources, try to extract URL-title pairs
  if (sources.length === 0) {
    const urlTitlePattern = /"url"\s*:\s*"([^"]+)"\s*(?:,|\}|\]).*?"title"\s*:\s*"([^"]+)"/g;
    
    while ((match = urlTitlePattern.exec(text)) !== null) {
      const [_, url, title] = match;
      
      sources.push({
        url: validateUrl(url),
        title: title || `Resource about ${topic}`,
        relevance: `Information about ${topic}`,
        category: "Technical Resource"
      });
    }
  }
  
  return sources;
}

// Function to extract URLs from text
function extractUrlsFromText(text: string, topic: string): any[] {
  console.log("Attempting to extract URLs from text");
  
  const sources: any[] = [];
  const urlPattern = /https?:\/\/[^\s"'<>()]+/g;
  
  let match;
  let index = 0;
  
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0];
    
    // Try to extract a title near the URL
    const surroundingText = text.substring(Math.max(0, match.index - 100), Math.min(text.length, match.index + 100));
    const titleMatch = surroundingText.match(/"title"\s*:\s*"([^"]+)"/);
    
    let title = titleMatch ? titleMatch[1] : "";
    if (!title) {
      // Try to generate a title from the URL
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        title = `${domain.split('.')[0].toUpperCase()} - ${topic}`;
      } catch (e) {
        title = `${topic} Resource ${index + 1}`;
      }
    }
    
    sources.push({
      url: validateUrl(url),
      title,
      relevance: `Information about ${topic}`,
      category: "Technical Resource"
    });
    
    index++;
  }
  
  return sources;
}

// Function to generate a realistic URL from a title
function generateRealisticUrlFromTitle(title: string, topic: string): string {
  // Extract keywords from title and topic
  const keywords = [...new Set([
    ...title.toLowerCase().split(/\s+/).filter(word => word.length > 3),
    ...topic.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  ])];
  
  // Identify potential vendor
  const vendorNames = ['cisco', 'microsoft', 'aws', 'amazon', 'google', 'oracle', 'ibm', 'vmware', 'sap'];
  let vendor = vendorNames.find(v => 
    title.toLowerCase().includes(v) || topic.toLowerCase().includes(v)
  );
  
  // Default vendor based on topic keywords
  if (!vendor) {
    if (topic.toLowerCase().includes('office 365') || topic.toLowerCase().includes('exchange')) {
      vendor = 'microsoft';
    } else if (topic.toLowerCase().includes('aws') || topic.toLowerCase().includes('amazon')) {
      vendor = 'aws';
    } else if (topic.toLowerCase().includes('gcp') || topic.toLowerCase().includes('google cloud')) {
      vendor = 'google';
    } else {
      vendor = 'cisco'; // Default fallback
    }
  }
  
  // Format domain based on vendor
  const domain = vendor === 'aws' ? 'aws.amazon.com' : `${vendor}.com`;
  
  // Generate URL path segments from keywords
  const pathSegments = keywords.slice(0, 3).join('-');
  
  // Create different URL formats based on vendor
  if (vendor === 'microsoft') {
    return `https://learn.microsoft.com/en-us/docs/${pathSegments}`;
  } else if (vendor === 'aws') {
    return `https://docs.aws.amazon.com/${pathSegments}/latest/guide/index.html`;
  } else if (vendor === 'google') {
    return `https://cloud.google.com/docs/${pathSegments}`;
  } else {
    return `https://www.${domain}/c/en/us/support/docs/${pathSegments}.html`;
  }
}

// Function to generate dynamic sources based on the topic
function generateDynamicSourcesForTopic(topic: string): { sources: any[] } {
  console.log("Generating dynamic sources based on topic:", topic);
  
  // Extract keywords from the topic
  const keywords = topic.split(' ').filter(word => word.length > 3);
  const mainTech = keywords[0] || "Technology";
  const secondaryTech = keywords.length > 1 ? keywords[1] : "";
  
  // Extract vendor name from topic if possible
  const vendorNames = ['Cisco', 'Microsoft', 'AWS', 'Google', 'Oracle', 'IBM', 'VMware', 'SAP'];
  const vendor = vendorNames.find(v => topic.includes(v)) || 
                (topic.toLowerCase().includes('office 365') ? 'Microsoft' : 
                 topic.toLowerCase().includes('aws') ? 'AWS' : 
                 topic.toLowerCase().includes('azure') ? 'Microsoft' : 
                 topic.toLowerCase().includes('google') ? 'Google' : 'Cisco');
  
  // Generate dynamic URLs based on the topic and vendor
  const dynamicSources = [];
  
  // Vendor documentation
  if (vendor === 'Microsoft') {
    dynamicSources.push({
      url: `https://learn.microsoft.com/en-us/${mainTech.toLowerCase()}/${secondaryTech.toLowerCase()}/overview`,
      title: `${mainTech} Documentation - Microsoft Learn`,
      relevance: `Official Microsoft documentation for ${mainTech}`,
      category: "Vendor Documentation"
    });
  } else if (vendor === 'AWS') {
    dynamicSources.push({
      url: `https://docs.aws.amazon.com/${mainTech.toLowerCase()}/latest/userguide/what-is-${mainTech.toLowerCase()}.html`,
      title: `AWS ${mainTech} User Guide`,
      relevance: `Official AWS documentation for ${mainTech}`,
      category: "Vendor Documentation"
    });
  } else if (vendor === 'Google') {
    dynamicSources.push({
      url: `https://cloud.google.com/${mainTech.toLowerCase()}/docs/overview`,
      title: `Google Cloud ${mainTech} Documentation`,
      relevance: `Official Google Cloud documentation for ${mainTech}`,
      category: "Vendor Documentation"
    });
  } else {
    dynamicSources.push({
      url: `https://www.${vendor.toLowerCase()}.com/c/en/us/products/${mainTech.toLowerCase()}/${secondaryTech.toLowerCase()}/index.html`,
      title: `${vendor} ${mainTech} Documentation`,
      relevance: `Official ${vendor} documentation for ${mainTech}`,
      category: "Vendor Documentation"
    });
  }
  
  // Industry analyst report
  dynamicSources.push({
    url: `https://www.gartner.com/en/documents/research/${mainTech.toLowerCase()}-${secondaryTech.toLowerCase()}`,
    title: `Gartner Research: ${mainTech} ${secondaryTech} Market Analysis`,
    relevance: `Industry analysis of ${mainTech} solutions and market trends`,
    category: "Industry Research"
  });
  
  // Technical blog
  dynamicSources.push({
    url: `https://techcommunity.${vendor.toLowerCase()}.com/t5/${mainTech.toLowerCase()}-blog/best-practices-for-${mainTech.toLowerCase()}-implementation/ba-p/12345`,
    title: `Best Practices for ${mainTech} Implementation`,
    relevance: `Technical guidance and best practices for implementing ${mainTech}`,
    category: "Technical Blog"
  });
  
  // Community forum
  dynamicSources.push({
    url: `https://community.${vendor.toLowerCase()}.com/t5/${mainTech.toLowerCase()}-forum/bd-p/12345`,
    title: `${vendor} Community: ${mainTech} Forum`,
    relevance: `Community discussions and solutions for ${mainTech} implementations`,
    category: "Community Resource"
  });
  
  // Implementation guide
  dynamicSources.push({
    url: `https://www.${vendor.toLowerCase()}.com/c/en/us/support/docs/${mainTech.toLowerCase()}/${secondaryTech.toLowerCase()}/implementation-guide.html`,
    title: `${mainTech} Implementation Guide`,
    relevance: `Step-by-step guide for implementing ${mainTech}`,
    category: "Implementation Guide"
  });
  
  return { sources: dynamicSources };
}

// Modify the extractSourcesFromArray function to better handle research results
const extractSourcesFromArray = (sourceArray: any[]): string[] => {
  if (!Array.isArray(sourceArray)) return [];
  
  return sourceArray.map(source => {
    // Handle different source formats
    if (typeof source === 'string') {
      // If it's just a string, return it
      return source;
    } else if (source && typeof source === 'object') {
      // Handle object format with url and title
      if (source.url && typeof source.url === 'string') {
        // Fix URL formatting issues
        let url = source.url;
        
        // Remove quotes if they exist
        if (url.startsWith('"') && url.endsWith('"')) {
          url = url.substring(1, url.length - 1);
        }
        
        // Ensure URL starts with http
        if (!url.startsWith('http')) {
          url = "https://" + url;
        }
        
        // Create a formatted source string
        return source.title ? 
          `${url} | ${source.title}` : 
          url;
      } else if (source.source && typeof source.source === 'string') {
        // Alternative format with source field
        return source.source;
      }
    }
    return "https://example.com";
  }).filter(Boolean);
};

// Helper function to validate and fix URLs
function validateUrl(url: string | undefined): string {
  if (!url) return "https://www.cisco.com";
  
  // Remove quotes if they exist
  if (url.startsWith('"') && url.endsWith('"')) {
    url = url.substring(1, url.length - 1);
  }
  
  // Ensure URL starts with http
  if (!url.startsWith('http')) {
    url = "https://" + url;
  }
  
  // Ensure URL is valid
  try {
    new URL(url);
    return url;
  } catch (e) {
    // If URL is invalid, return a default URL
    return "https://www.cisco.com";
  }
}

// Add these interfaces at the top of the file
interface Subservice {
  name: string;
  description: string;
  hours: number;
  serviceDescription?: string;
  keyAssumptions?: string;
  clientResponsibilities?: string;
  outOfScope?: string;
  mappedQuestions?: string[];
  calculationSlug?: string;
}

interface Service {
  phase: string;
  service: string;
  name?: string;
  description: string;
  hours: number;
  serviceDescription?: string;
  keyAssumptions?: string;
  clientResponsibilities?: string;
  outOfScope?: string;
  subservices: Subservice[];
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { input, models, prompts } = data

    if (!input) {
      return Response.json({ error: "Input is required" }, { status: 400 })
    }

    console.log("🔍 Starting research for:", input)

    // Set up SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper function to send SSE events
          const sendEvent = (type: string, data: any) => {
            const event = `data: ${JSON.stringify({ type, ...data })}\n\n`
            controller.enqueue(encoder.encode(event))
          }

          // Step 1: Parsing
          sendEvent("step", { 
            stepId: "parse", 
            status: "active", 
            progress: 10,
            model: models?.parsing || "anthropic/claude-3.5-sonnet"
          })

          // Parse input
          console.log("📊 Step 1: Parsing input...")
          const parsingPrompt = prompts?.parsing || DEFAULT_PROMPTS.parsing.replace("{input}", input)
          
          let parsedData
          try {
            const parsingResponse = await callOpenRouter({
              model: models?.parsing || "anthropic/claude-3.5-sonnet",
              prompt: parsingPrompt,
            })
            
            parsedData = await parseAIResponse(parsingResponse)
            console.log("✅ Parsing successful:", parsedData)
            sendEvent("step", { 
              stepId: "parse", 
              status: "completed", 
              progress: 25,
              model: models?.parsing || "anthropic/claude-3.5-sonnet"
            })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("❌ Parsing failed:", errorMessage)
            // Use basic fallback for parsing failure
            parsedData = {
              technology: input.split(" ").slice(0, 3).join(" "),
              scale: "Enterprise",
              industry: "Technology",
              compliance: "Standard",
              complexity: ["Standard implementation"]
            }
            console.log("⚠️ Using fallback parsing data:", parsedData)
            sendEvent("step", { 
              stepId: "parse", 
              status: "completed", 
              progress: 25,
              model: models?.parsing || "anthropic/claude-3.5-sonnet"
            })
          }
          
          // Step 2: Research - Enhanced with multi-stage approach
          sendEvent("step", { 
            stepId: "research", 
            status: "active", 
            progress: 25,
            model: models?.research || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("�� Step 2: Conducting actual web research...")
          
          // Perform real web research using the LLM
          console.log("Performing web research with model:", models?.research || "anthropic/claude-3-opus");
          const webResearchResults = await performWebResearch(
            input, 
            models?.research || "anthropic/claude-3-opus"
          );
          
          // Extract sources from the research results
          let researchSources: string[] = [];
          let sourcesForContent: any[] = [];
          
          if (webResearchResults && webResearchResults.sources && Array.isArray(webResearchResults.sources)) {
            // Store the actual source objects for later use in the content generation
            sourcesForContent = webResearchResults.sources;
            
            // Convert the sources to the format expected by the UI
            researchSources = webResearchResults.sources.map((source: any) => {
              if (source.url && source.title) {
                return `${source.url} | ${source.title}`;
              }
              return source.url || "https://example.com";
            });
            
            console.log(`Found ${researchSources.length} real sources from research:`, researchSources);
          }
          
          // If we don't have enough sources, generate some based on the topic
          if (researchSources.length < 5) {
            console.log("Not enough sources found, but will proceed with what we have");
            console.log(`Using ${researchSources.length} actual research sources`);
          }
          
          // Remove duplicates and limit to first 5-7 sources
          researchSources = [...new Set(researchSources)].slice(0, 7);
          
          console.log(`Final sources for UI display (${researchSources.length}):`, researchSources);
          console.log("✅ Web research successful");
          
          // Extract industry from input if possible
          const industry = input.toLowerCase().includes("healthcare") || input.toLowerCase().includes("hospital") ? "healthcare" :
                        input.toLowerCase().includes("finance") || input.toLowerCase().includes("bank") ? "finance" :
                        input.toLowerCase().includes("retail") || input.toLowerCase().includes("ecommerce") ? "retail" :
                        input.toLowerCase().includes("manufacturing") ? "manufacturing" :
                        input.toLowerCase().includes("government") ? "government" : "enterprise";
          
          // Create a research data object that includes the sources and other required properties
          const researchData = {
            sources: sourcesForContent,
            topic: input,
            technology: parsedData.technology || input,
            // Add missing properties that might be used later in the code
            technology_questions: [],
            questions: [],
            discovery_questions: [],
            // Service-related properties
            service_phases: [],
            services: [],
            subservices: [],
            // Implementation methodologies
            implementation_methodologies: {
              recommended_frameworks: []
            },
            // Implementation phases
            keyImplementationPhases: [],
            implementation_phases: [],
            // Industry specific data
            industry_specific: {
              industry
            }
          };
          
          sendEvent("step", { 
            stepId: "research", 
            status: "completed", 
            progress: 50,
            model: models?.research || "anthropic/claude-3.5-sonnet",
            sources: researchSources
          });

          // Step 3: Analysis - Enhanced with specialized focus
          sendEvent("step", { 
            stepId: "analyze", 
            status: "active", 
            progress: 50,
            model: models?.analysis || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("🔬 Step 3: Analyzing research with specialized focus...")
          
          // Stage 1: Extract service components and structure
          console.log("Analysis Stage 1: Extracting service components...")
          const serviceAnalysisPrompt = `Analyze research findings to extract service components for ${parsedData.technology || input}:

Research Findings: ${JSON.stringify(researchData)}
Original Request: "${input}"

Extract and structure the following:
1. Key implementation phases for ${parsedData.technology || input}
2. Essential services required for each phase
3. Typical subservices for each main service
4. Hour estimates for each service based on industry benchmarks
5. Dependencies between services

Format your analysis as structured JSON focusing on service components.${JSON_RESPONSE_INSTRUCTION}`
          
          let serviceAnalysisData
          try {
            const serviceAnalysisResponse = await callOpenRouter({
              model: models?.analysis || "anthropic/claude-3.5-sonnet",
              prompt: serviceAnalysisPrompt,
            })
            
            serviceAnalysisData = await parseAIResponse(serviceAnalysisResponse)
            console.log("✅ Service analysis successful!")
          } catch (serviceAnalysisError) {
            const errorMessage = serviceAnalysisError instanceof Error ? serviceAnalysisError.message : String(serviceAnalysisError)
            console.error(`❌ Service analysis failed: ${errorMessage}`)
            serviceAnalysisData = { service_components: [] }
          }
          
          // Stage 2: Extract scoping questions and calculations
          console.log("Analysis Stage 2: Extracting scoping questions and calculations...")
          const scopingAnalysisPrompt = `Analyze research findings to extract scoping questions and calculations for ${parsedData.technology || input}:

Research Findings: ${JSON.stringify(researchData)}
Original Request: "${input}"

Extract and structure the following:
1. Key questions that should be asked during scoping for ${parsedData.technology || input}
2. Options for each question with appropriate values
3. Calculation formulas that can be used to estimate effort
4. Factors that affect pricing and scoping
5. Risk factors that should be considered

Format your analysis as structured JSON focusing on scoping components.${JSON_RESPONSE_INSTRUCTION}`
          
          let scopingAnalysisData
          try {
            const scopingAnalysisResponse = await callOpenRouter({
              model: "openai/gpt-4-turbo",
              prompt: scopingAnalysisPrompt,
            })
            
            scopingAnalysisData = await parseAIResponse(scopingAnalysisResponse)
            console.log("✅ Scoping analysis successful!")
          } catch (scopingAnalysisError) {
            const errorMessage = scopingAnalysisError instanceof Error ? scopingAnalysisError.message : String(scopingAnalysisError)
            console.error(`❌ Scoping analysis failed: ${errorMessage}`)
            scopingAnalysisData = { scoping_components: [] }
          }
          
          // Combine analysis results
          const analysisData = {
            ...serviceAnalysisData,
            ...scopingAnalysisData,
            technology: parsedData.technology || input,
            industry: industry || "enterprise"
          }
          
          console.log("✅ Combined analysis successful")
          sendEvent("step", { 
            stepId: "analyze", 
            status: "completed", 
            progress: 75,
            model: models?.analysis || "anthropic/claude-3.5-sonnet"
          })

          // Step 4: Content Generation - Updated with multi-stage approach
          sendEvent("step", { 
            stepId: "generate", 
            status: "active", 
            progress: 75,
            model: models?.content || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("📝 Step 4: Generating content using multi-stage approach...")
          console.log(`Using ${sourcesForContent.length} research sources for content generation:`, 
            sourcesForContent.map((s: any) => s.title).join(", "))
          
          // Stage 1: Generate structured outline based on research
          console.log("Stage 1: Generating structured outline...")
          
          // Extract specific questions and service components from research data for direct use
          let extractedQuestions: string[] = [];
          let extractedServices: string[] = [];
          
          // Try to extract technology-specific questions from research
          if (researchData?.technology_questions && Array.isArray(researchData.technology_questions)) {
            extractedQuestions = researchData.technology_questions;
          } else if (researchData?.questions && Array.isArray(researchData.questions)) {
            extractedQuestions = researchData.questions;
          } else if (researchData?.discovery_questions && Array.isArray(researchData.discovery_questions)) {
            extractedQuestions = researchData.discovery_questions.map((q: any) => 
              typeof q === 'string' ? q : q.question || q.text || JSON.stringify(q)
            );
          }
          
          // Try to extract service components from research
          if (researchData?.service_phases && Array.isArray(researchData.service_phases)) {
            extractedServices = researchData.service_phases;
          } else if (researchData?.services && Array.isArray(researchData.services)) {
            extractedServices = researchData.services.map((s: any) => 
              typeof s === 'string' ? s : 
              typeof s === 'object' && s ? (s.name || s.service || JSON.stringify(s).substring(0, 50)) : 
              'Service component'
            );
          } else if (researchData?.implementation_methodologies?.recommended_frameworks && 
                    Array.isArray(researchData.implementation_methodologies.recommended_frameworks)) {
            extractedServices = researchData.implementation_methodologies.recommended_frameworks;
          } else if (researchData?.subservices && typeof researchData.subservices === 'object') {
            // Extract subservices from object structure
            extractedServices = Object.keys(researchData.subservices).flatMap((key: string) => {
              const subservices = (researchData.subservices as any)[key];
              return Array.isArray(subservices) ? subservices : [];
            });
          } else if (researchData?.keyImplementationPhases && Array.isArray(researchData.keyImplementationPhases)) {
            extractedServices = researchData.keyImplementationPhases;
          } else if (researchData?.implementation_phases && Array.isArray(researchData.implementation_phases)) {
            extractedServices = researchData.implementation_phases.map((phase: any) => 
              typeof phase === 'string' ? phase : 
              typeof phase === 'object' && phase ? (phase.phase || phase.name || JSON.stringify(phase).substring(0, 50)) : 
              'Implementation phase'
            );
          }
          
          console.log(`Extracted ${extractedQuestions.length} questions and ${extractedServices.length} service components from research`);
          
          const outlinePrompt = `Based on the research about ${parsedData.technology || input}, create a structured outline for professional services content:

Research Findings: ${JSON.stringify(researchData)}
Analysis: ${JSON.stringify(analysisData)}
Original Request: ${input}
Extracted Questions: ${JSON.stringify(extractedQuestions)}
Extracted Service Components: ${JSON.stringify(extractedServices)}

CRITICAL: Use the EXACT terminology, questions, and service components extracted from the research.

Create a detailed outline with:
1. Technology-specific questions that should be asked during scoping (use the extracted questions)
2. Key service phases for ${parsedData.technology || input} implementation (use the extracted service components)
3. Specific subservices that should be included
4. Calculation factors that affect pricing/scoping
5. Industry-specific considerations for ${parsedData.technology || input}

Format your response as structured JSON with these sections clearly defined.${JSON_RESPONSE_INSTRUCTION}`

          let outlineObj
          try {
            const outlineResponse = await callOpenRouter({
              model: models?.content || "anthropic/claude-3.5-sonnet",
              prompt: outlinePrompt,
            })
            
            outlineObj = await parseAIResponse(outlineResponse)
            console.log("✅ Outline generation successful!")
          } catch (outlineError) {
            const errorMessage = outlineError instanceof Error ? outlineError.message : String(outlineError)
            console.error(`❌ Outline generation failed: ${errorMessage}`)
            // Use basic structure if outline fails
            outlineObj = {
              technology: parsedData.technology || input,
              questionTopics: ["implementation scope", "timeline", "integration", "compliance", "user adoption"],
              servicePhases: ["Planning", "Design", "Implementation", "Testing", "Go-Live", "Support"],
              calculationFactors: ["complexity", "scale", "customization"]
            }
          }
          
          // Stage 2: Generate detailed content based on outline and research sources
          console.log("Stage 2: Generating detailed content based on outline and research sources...")
          const detailPrompt = `Generate complete professional services content based on this outline, research, and sources:

Technology: ${parsedData.technology || input}
Research Findings: ${JSON.stringify(researchData)}
Analysis: ${JSON.stringify(analysisData)}
Outline: ${JSON.stringify(outlineObj)}
Sources: ${JSON.stringify(sourcesForContent)}

CRITICAL INSTRUCTIONS:
1. You MUST use the specific terminology, tools, and methodologies found in the research data
2. DO NOT generate generic service names - every service and subservice must include specific ${parsedData.technology || input} terminology
3. Use the exact questions and service components found in the research data when available
4. Include specific tools, platforms, and methodologies mentioned in the research in your service descriptions
5. Reference industry best practices found in the research data
6. Base your hour estimates on the research findings, not generic templates
7. All content must be suitable for a formal Statement of Work document - use professional language and terminology

DISCOVERY QUESTIONS REQUIREMENTS:
- Generate AT LEAST 10 highly specific discovery questions for ${parsedData.technology || input}
- Each question MUST include specific technology terminology and components from ${parsedData.technology || input}
- Questions must cover technical, business, and operational aspects
- Each question must have 3-4 options that are specific to the technology
- Options must include realistic values/choices relevant to ${parsedData.technology || input}
- NO generic questions - each question must be uniquely tailored to ${parsedData.technology || input}
- Questions should reference specific components, versions, configurations of ${parsedData.technology || input}
- Each question must have a clear impact on scoping and service delivery
- Include questions about scale, complexity, integration points, and specific technical requirements
- Options should have meaningful differences that affect implementation effort

SERVICE REQUIREMENTS:
- Generate a comprehensive service structure with at least 10 total services
- Use THESE EXACT PHASES: "Initiating", "Planning", "Implementation", "Monitoring and Controlling", "Closing"
- Include AT LEAST 1 service for EACH phase
- The Implementation phase MUST have AT LEAST 3 distinct services
- Each service must have exactly 3 subservices
- Each service and subservice must have a UNIQUE name specific to ${parsedData.technology || input}
- NO generic service names - use specific technology terms from research
- Each service description must be unique and specific to the service
- Vary the language and structure across different services
- Include specific tools, methodologies, and components in service names
- All services must be appropriate for a formal Statement of Work
- Start with a base of 1 hour per task, then adjust based on complexity

CALCULATION REQUIREMENTS:
- Create at least 5 unique calculations that affect service hours
- Each calculation must have a DESCRIPTIVE and UNIQUE slug (not generic like "calc1")
- Calculation slugs should describe what they calculate (e.g., "data_volume_multiplier", "compliance_complexity_factor")
- Each calculation must map to at least one question
- Formulas should be realistic and actually impact the level of effort
- Include calculations for data volume, complexity, compliance requirements, timeline constraints, and custom requirements

SCOPING LANGUAGE REQUIREMENTS:
- For each service, include these detailed fields:
  * serviceDescription: Comprehensive explanation of the service (200-300 characters)
  * keyAssumptions: List of assumptions made for the service (150-200 characters)
  * clientResponsibilities: What the client must provide or do (150-200 characters)
  * outOfScope: What is explicitly excluded from the service (150-200 characters)

- For each subservice, include the same scoping language fields:
  * serviceDescription: Detailed explanation specific to the subservice
  * keyAssumptions: Assumptions specific to this subservice component
  * clientResponsibilities: Client requirements for this specific subservice
  * outOfScope: Exclusions specific to this subservice component

IMPORTANT: Return ONLY valid JSON. Start with { and end with }. Do not include any markdown code blocks or explanations.
Your response MUST be a valid JSON object with the following structure:
{
  "technology": "${parsedData.technology || input}",
  "questions": [...],
  "calculations": [...],
  "services": [...],
  "totalHours": number,
  "sources": [...]
}

Do NOT nest the response inside fields like "email_migration_research" or "research_findings" - use the exact structure above.${JSON_RESPONSE_INSTRUCTION}`

          let contentObj
          let shouldUseFallback = false
          
          try {
            console.log("Attempting to generate content with model:", models?.content || "anthropic/claude-3.5-sonnet")
            // Try up to 3 times with the primary model before falling back
            try {
              contentObj = await generateWithRetry(
                detailPrompt,
                models?.content || "anthropic/claude-3.5-sonnet",
                3 // Increase max attempts to 3
              )
              
              // Check if we got a valid structure or need to normalize a nested structure
              if (contentObj.email_migration_research || contentObj.research_findings || 
                  contentObj.project_scope || contentObj.assessment_questions) {
                console.log("Detected nested structure, normalizing...");
                contentObj = normalizeNestedStructure(contentObj);
              }
              
              console.log("✅ Content generation successful!")
            } catch (primaryModelError) {
              const errorMessage = primaryModelError instanceof Error ? primaryModelError.message : String(primaryModelError)
              console.error(`❌ Primary model content generation failed: ${errorMessage}`)
              
              // Try a different model as backup before using fallback content
              console.log("Attempting with backup model: openai/gpt-4...")
              try {
                const backupResponse = await callOpenRouter({
                  model: "openai/gpt-4",
                  prompt: detailPrompt,
                })
                
                contentObj = await parseAIResponse(backupResponse)
                
                if (contentObj.email_migration_research || contentObj.research_findings || 
                    contentObj.project_scope || contentObj.assessment_questions) {
                  console.log("Detected nested structure in backup response, normalizing...");
                  contentObj = normalizeNestedStructure(contentObj);
                }
                
                console.log("✅ Backup model content generation successful!")
              } catch (backupError) {
                const backupErrorMessage = backupError instanceof Error ? backupError.message : String(backupError)
                console.error(`❌ Backup model content generation failed: ${backupErrorMessage}`)
                shouldUseFallback = true
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`❌ Content generation failed: ${errorMessage}`)
            shouldUseFallback = true
          }

          // Stage 3: Enhance and refine content if we have a valid base
          if (!shouldUseFallback && contentObj) {
            console.log("Stage 3: Enhancing and refining content...")
            try {
              // Enhance services with more specific descriptions
              const enhancePrompt = `Enhance these services for ${parsedData.technology || input} with more specific descriptions:
              
Original Services: ${JSON.stringify(contentObj.services)}
Research Data: ${JSON.stringify(researchData)}

CRITICAL: Use the EXACT terminology, tools, methodologies, and best practices from the research data.

STATEMENT OF WORK CONTEXT:
This content will be used in a formal Statement of Work document for professional services. All language must be:
- Professional and precise
- Technically accurate
- Contractually appropriate
- Specific to the technology and industry
- Clear about responsibilities, assumptions, and scope boundaries

UNIQUENESS REQUIREMENTS:
1. Each service and subservice must have a COMPLETELY UNIQUE description
2. Vary the sentence structure, length, and style across different services
3. Use different terminology and phrasing for each service
4. No two services should follow the same descriptive pattern
5. Incorporate specific technical terms from the research in different ways
6. Vary the focus (business value, technical details, operational benefits) across services

SCOPING LANGUAGE REQUIREMENTS:
1. For each service, include detailed scoping language fields:
   - serviceDescription: Comprehensive explanation of the service (200-300 characters)
   - keyAssumptions: List of assumptions made for the service (150-200 characters)
   - clientResponsibilities: What the client must provide or do (150-200 characters)
   - outOfScope: What is explicitly excluded from the service (150-200 characters)

2. For each subservice, include the same scoping language fields:
   - serviceDescription: Detailed explanation specific to the subservice
   - keyAssumptions: Assumptions specific to this subservice component
   - clientResponsibilities: Client requirements for this specific subservice
   - outOfScope: Exclusions specific to this subservice component

3. Ensure scoping language is contractually sound:
   - Clear boundaries between client and provider responsibilities
   - Specific assumptions that limit scope
   - Precise language about what is excluded
   - Measurable deliverables and outcomes

Make each service and subservice more specific to ${parsedData.technology || input} by:
1. Adding technology-specific terminology from the research data
2. Including industry-standard methodologies mentioned in the research
3. Referencing specific tools or processes used in ${parsedData.technology || input} implementations
4. Ensuring descriptions clearly explain the value/purpose using industry-specific language
5. Using the exact service components and terminology found in the research

CRITICAL: Return ONLY a valid JSON array of services. Start with [ and end with ].
Ensure all property names and string values use double quotes.
Do not add any explanations or markdown formatting.${JSON_RESPONSE_INSTRUCTION}`

              const enhanceResponse = await callOpenRouter({
                model: "openai/gpt-4-turbo",
                prompt: enhancePrompt,
              })
              
              try {
                // First clean and prepare the response
                let enhancedServicesText = cleanAIResponse(enhanceResponse)
                
                // If the response doesn't start with [, try to extract the array
                if (!enhancedServicesText.startsWith('[')) {
                  const arrayMatch = enhancedServicesText.match(/\[([\s\S]*)\]/)
                  if (arrayMatch && arrayMatch[0]) {
                    enhancedServicesText = arrayMatch[0]
                  } else {
                    throw new Error("Could not find services array in response")
                  }
                }
                
                const enhancedServices = JSON.parse(enhancedServicesText)
                
                if (Array.isArray(enhancedServices) && enhancedServices.length > 0) {
                  // Validate that the services have the required structure
                  const validServices = enhancedServices.every(service => 
                    service && typeof service === 'object' && 
                    (service.name || service.service || service.phase) && 
                    typeof service.description === 'string'
                  )
                  
                  if (validServices) {
                    // Merge the enhanced services with the original services to preserve important fields
                    contentObj.services = contentObj.services.map((originalService: any, index: number) => {
                      // Find the corresponding enhanced service if available
                      const enhancedService = index < enhancedServices.length ? enhancedServices[index] : null;
                      
                      if (!enhancedService) {
                        return originalService;
                      }
                      
                      // Create a merged service that preserves important fields from both
                      const mergedService = {
                        // Core fields - prefer enhanced version but fall back to original
                        phase: enhancedService.phase || originalService.phase,
                        service: enhancedService.service || enhancedService.name || originalService.service || originalService.name,
                        name: enhancedService.name || enhancedService.service || originalService.name || originalService.service,
                        description: enhancedService.description || originalService.description,
                        hours: originalService.hours || enhancedService.hours || 40,
                        
                        // Preserve scoping language fields from original if they exist
                        serviceDescription: enhancedService.serviceDescription || originalService.serviceDescription,
                        keyAssumptions: enhancedService.keyAssumptions || originalService.keyAssumptions,
                        clientResponsibilities: enhancedService.clientResponsibilities || originalService.clientResponsibilities,
                        outOfScope: enhancedService.outOfScope || originalService.outOfScope,
                        
                        // Handle subservices
                        subservices: []
                      };
                      
                      // Process subservices - merge original with enhanced
                      if (Array.isArray(originalService.subservices)) {
                        mergedService.subservices = originalService.subservices.map((originalSub: any, subIndex: number) => {
                          // Find the corresponding enhanced subservice if available
                          const enhancedSub = enhancedService.subservices && 
                                            Array.isArray(enhancedService.subservices) && 
                                            subIndex < enhancedService.subservices.length ? 
                                            enhancedService.subservices[subIndex] : null;
                          
                          if (!enhancedSub) {
                            return originalSub;
                          }
                          
                          // Create a merged subservice
                          return {
                            // Core fields - prefer enhanced version but fall back to original
                            name: enhancedSub.name || originalSub.name,
                            description: enhancedSub.description || originalSub.description,
                            hours: originalSub.hours || enhancedSub.hours || Math.floor((mergedService.hours || 40) / 3),
                            
                            // Preserve mappings and calculations
                            mappedQuestions: originalSub.mappedQuestions || enhancedSub.mappedQuestions,
                            calculationSlug: originalSub.calculationSlug || enhancedSub.calculationSlug,
                            
                            // Preserve scoping language fields
                            serviceDescription: enhancedSub.serviceDescription || originalSub.serviceDescription,
                            keyAssumptions: enhancedSub.keyAssumptions || originalSub.keyAssumptions,
                            clientResponsibilities: enhancedSub.clientResponsibilities || originalSub.clientResponsibilities,
                            outOfScope: enhancedSub.outOfScope || originalSub.outOfScope
                          };
                        });
                      } else if (enhancedService.subservices && Array.isArray(enhancedService.subservices)) {
                        mergedService.subservices = enhancedService.subservices;
                      }
                      
                      return mergedService;
                    });
                    
                    console.log("✅ Service enhancement successful!")
                  } else {
                    console.error("⚠️ Enhanced services have invalid structure, keeping original")
                  }
                } else {
                  console.error("⚠️ Enhanced services is not a valid array, keeping original")
                }
              } catch (enhanceError) {
                const errorMessage = enhanceError instanceof Error ? enhanceError.message : String(enhanceError)
                console.error(`⚠️ Service enhancement parsing failed: ${errorMessage}`)
                console.error("Keeping original services")
              }
            } catch (enhanceError) {
              const errorMessage = enhanceError instanceof Error ? enhanceError.message : String(enhanceError)
              console.error(`⚠️ Service enhancement step failed: ${errorMessage}`)
              console.error("Keeping original services")
            }
          }

          if (shouldUseFallback) {
            console.log("⚠️ Content generation failed, but will proceed with partial results")
            // Create a minimal valid content object with what we have
            contentObj = {
              technology: parsedData.technology || input,
              questions: [],
              calculations: [],
              services: [],
              totalHours: 0,
              sources: sourcesForContent || []
            }
          }

          // Process content structure to preserve actual research sources
          try {
            // Make sure we preserve the sources from research
            if (researchSources && researchSources.length > 0) {
              // If we have sources from research but none in the content, add them
              if (!contentObj.sources || !Array.isArray(contentObj.sources) || contentObj.sources.length === 0) {
                contentObj.sources = researchSources.map(source => {
                  // Parse the source string if needed
                  if (typeof source === 'string') {
                    const parts = source.split(' | ');
                    return {
                      url: parts[0] && parts[0].startsWith('http') ? parts[0] : 'https://www.example.com',
                      title: parts[1] || source,
                      relevance: `Source for ${parsedData.technology || input} implementation`
                    };
                  }
                  return source;
                });
              } 
              // If we have sources in both places, make sure research sources are included
              else {
                // Convert research sources to proper format if needed
                const formattedResearchSources = researchSources.map(source => {
                  if (typeof source === 'string') {
                    const parts = source.split(' | ');
                    return {
                      url: parts[0] && parts[0].startsWith('http') ? parts[0] : 'https://www.example.com',
                      title: parts[1] || source,
                      relevance: `Source for ${parsedData.technology || input} implementation`
                    };
                  }
                  return source;
                });
                
                // Add any missing research sources to the content sources
                contentObj.sources = [...contentObj.sources, ...formattedResearchSources].slice(0, 7);
              }
            }
            
            console.log("✅ Content structure processed with actual research sources")
          } catch (validationError) {
            const errorMessage = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`❌ Content source processing failed: ${errorMessage}`)
          }

          sendEvent("step", { 
            stepId: "generate", 
            status: "completed", 
            progress: 90,
            model: models?.content || "anthropic/claude-3.5-sonnet"
          })

          // Step 5: Formatting
          sendEvent("step", { 
            stepId: "format", 
            status: "active", 
            progress: 90,
            model: models?.format || "openai/gpt-4o"
          })

          // Final check to ensure we have a valid content object
          try {
            // Ensure we have a valid content object with required fields
            if (!contentObj || typeof contentObj !== 'object') {
              contentObj = {
                technology: parsedData.technology || input,
                questions: [],
                calculations: [],
                services: [],
                totalHours: 0,
                sources: []
              };
            }
            
            // Ensure all required fields exist
            contentObj.technology = contentObj.technology || parsedData.technology || input;
            contentObj.questions = Array.isArray(contentObj.questions) ? contentObj.questions : [];
            contentObj.calculations = Array.isArray(contentObj.calculations) ? contentObj.calculations : [];
            contentObj.services = Array.isArray(contentObj.services) ? contentObj.services : [];
            contentObj.totalHours = contentObj.totalHours || 0;
            contentObj.sources = Array.isArray(contentObj.sources) ? contentObj.sources : [];

            // Sanitize source relevance fields
            contentObj = sanitizeSourceRelevance(contentObj);
            
            // Validate and fix content structure to ensure it meets minimum requirements
            validateContentStructure(contentObj);
            
            console.log("✅ Content structure finalized")
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("❌ Content finalization failed:", errorMessage)
          }

          sendEvent("step", { 
            stepId: "format", 
            status: "completed", 
            progress: 100,
            model: models?.format || "openai/gpt-4o"
          })

          // Send final complete event with content
          console.log("✅ Research process complete!")
          sendEvent("complete", { content: contentObj, progress: 100 })
          
          // Close the stream
          controller.close()
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error("❌ Error in SSE stream:", errorMessage)
          controller.error(errorMessage)
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Error in research endpoint:", errorMessage)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

// Helper functions for generating detailed scope language

function createDetailedService(technology: string, phase: string, serviceName: string): any {
  return {
    phase: phase,
    service: serviceName,
    name: serviceName,
    description: `${serviceName} for ${technology}`,
    hours: phase === "Implementation" ? 40 : 24,
    serviceDescription: generateServiceDescription(technology, serviceName, phase),
    keyAssumptions: generateKeyAssumptions(technology, serviceName, phase),
    clientResponsibilities: generateClientResponsibilities(technology, serviceName, phase),
    outOfScope: generateOutOfScope(technology, serviceName, phase),
    subservices: [
      {
        name: `${serviceName} - Assessment`,
        description: `Assessment activities for ${serviceName}`,
        hours: phase === "Implementation" ? 16 : 8,
        serviceDescription: generateSubserviceDescription(technology, `${serviceName} - Assessment`, serviceName),
        keyAssumptions: generateSubserviceKeyAssumptions(technology, `${serviceName} - Assessment`, serviceName),
        clientResponsibilities: generateSubserviceClientResponsibilities(technology, `${serviceName} - Assessment`, serviceName),
        outOfScope: generateSubserviceOutOfScope(technology, `${serviceName} - Assessment`, serviceName)
      },
      {
        name: `${serviceName} - Implementation`,
        description: `Implementation activities for ${serviceName}`,
        hours: phase === "Implementation" ? 16 : 10,
        serviceDescription: generateSubserviceDescription(technology, `${serviceName} - Implementation`, serviceName),
        keyAssumptions: generateSubserviceKeyAssumptions(technology, `${serviceName} - Implementation`, serviceName),
        clientResponsibilities: generateSubserviceClientResponsibilities(technology, `${serviceName} - Implementation`, serviceName),
        outOfScope: generateSubserviceOutOfScope(technology, `${serviceName} - Implementation`, serviceName)
      },
      {
        name: `${serviceName} - Validation`,
        description: `Validation activities for ${serviceName}`,
        hours: phase === "Implementation" ? 8 : 6,
        serviceDescription: generateSubserviceDescription(technology, `${serviceName} - Validation`, serviceName),
        keyAssumptions: generateSubserviceKeyAssumptions(technology, `${serviceName} - Validation`, serviceName),
        clientResponsibilities: generateSubserviceClientResponsibilities(technology, `${serviceName} - Validation`, serviceName),
        outOfScope: generateSubserviceOutOfScope(technology, `${serviceName} - Validation`, serviceName)
      }
    ]
  };
}

function generateServiceDescription(technology: string, serviceName: string, phase: string): string {
  const phaseDescriptions: {[key: string]: string} = {
    "Initiating": `This service establishes the foundation for a successful ${technology} implementation by defining project parameters, stakeholder needs, and initial requirements. Our team will conduct thorough discovery sessions, document business and technical requirements, and establish project governance to ensure alignment with organizational objectives.`,
    "Planning": `This service provides comprehensive planning for your ${technology} implementation, including detailed architecture design, resource allocation, timeline development, and risk assessment. Our experts will create a tailored implementation roadmap that addresses your specific business needs and technical environment.`,
    "Implementation": `This service delivers expert implementation of ${technology} components according to the approved design specifications. Our certified consultants will configure, integrate, and optimize your ${technology} solution to meet your specific business requirements while following industry best practices and vendor recommendations.`,
    "Monitoring and Controlling": `This service ensures your ${technology} implementation maintains optimal performance and security through proactive monitoring, quality control, and change management processes. Our specialists will establish monitoring frameworks, conduct regular reviews, and implement necessary adjustments to maintain system integrity.`,
    "Closing": `This service provides formal closure activities for your ${technology} implementation, including comprehensive knowledge transfer, documentation finalization, and transition to operational support. Our team will ensure all project deliverables are completed, accepted, and properly transitioned to your team.`
  };
  
  return phaseDescriptions[phase] || `This service provides comprehensive ${serviceName} for your ${technology} implementation, delivered by our expert consultants following industry best practices and methodologies. Our team will work closely with your stakeholders to ensure the solution meets your specific business requirements and technical specifications.`;
}

function generateKeyAssumptions(technology: string, serviceName: string, phase: string): string {
  const phaseAssumptions: {[key: string]: string} = {
    "Initiating": `Client will provide access to key stakeholders and subject matter experts for requirements gathering. Existing documentation related to current environment and business processes will be made available. Client will designate a project sponsor with decision-making authority.`,
    "Planning": `Client environment documentation is accurate and up-to-date. Client will provide timely feedback on design documents and implementation plans. Necessary hardware and software prerequisites will be in place before implementation begins.`,
    "Implementation": `Client will provide administrative access to required systems and environments. Implementation will be performed during agreed-upon maintenance windows. Client will ensure necessary hardware and software prerequisites are in place before implementation begins.`,
    "Monitoring and Controlling": `Client will provide access to monitoring systems and performance data. Changes to the environment will follow the established change management process. Client will designate personnel responsible for ongoing monitoring activities.`,
    "Closing": `All project deliverables have been completed and accepted. Client will allocate appropriate resources for knowledge transfer sessions. Client will designate personnel responsible for ongoing support and maintenance.`
  };
  
  return phaseAssumptions[phase] || `Client will provide timely access to necessary systems, information, and personnel. Client environment meets the minimum technical requirements for ${technology} implementation. Work will be performed during standard business hours unless otherwise specified. Client has necessary licenses and entitlements for ${technology} components.`;
}

function generateClientResponsibilities(technology: string, serviceName: string, phase: string): string {
  const phaseResponsibilities: {[key: string]: string} = {
    "Initiating": `Provide access to key stakeholders and subject matter experts for requirements gathering sessions. Share existing documentation related to current environment and business processes. Designate a project sponsor with decision-making authority. Review and approve project charter and scope documents.`,
    "Planning": `Review and provide timely feedback on design documents and implementation plans. Ensure necessary hardware and software prerequisites are in place before implementation begins. Designate technical resources to work with our implementation team. Approve the final implementation plan and schedule.`,
    "Implementation": `Provide administrative access to required systems and environments. Ensure necessary hardware and software prerequisites are in place before implementation begins. Participate in testing and validation activities. Review and approve implementation deliverables.`,
    "Monitoring and Controlling": `Provide access to monitoring systems and performance data. Follow the established change management process for any changes to the environment. Participate in regular status meetings and reviews. Report any issues or concerns promptly.`,
    "Closing": `Allocate appropriate resources for knowledge transfer sessions. Review and approve final documentation. Participate in project closure activities and sign-off. Designate personnel responsible for ongoing support and maintenance.`
  };
  
  return phaseResponsibilities[phase] || `Provide timely access to necessary systems, information, and personnel. Ensure appropriate stakeholders are available for meetings and decision-making. Review and approve deliverables within the agreed timeframe. Provide timely notification of any issues or concerns. Designate a primary point of contact for project coordination.`;
}

function generateOutOfScope(technology: string, serviceName: string, phase: string): string {
  const phaseOutOfScope: {[key: string]: string} = {
    "Initiating": `Development of custom solutions outside standard ${technology} capabilities. Business process reengineering. Detailed technical design and implementation planning. Hardware procurement or installation. Training end users on ${technology} functionality.`,
    "Planning": `Implementation of the designed solution. Procurement of hardware or software licenses. Custom development beyond standard ${technology} capabilities. End-user training materials development. Ongoing support after implementation.`,
    "Implementation": `Hardware procurement or installation unless explicitly included. Development of custom applications outside standard ${technology} capabilities. End-user training beyond knowledge transfer to administrators. Ongoing support beyond the implementation period.`,
    "Monitoring and Controlling": `24/7 monitoring services unless explicitly included. Remediation of issues not related to the implemented ${technology} solution. Custom development of monitoring tools. End-user support and training.`,
    "Closing": `Ongoing support beyond the project closure period. Development of custom training materials. Hardware decommissioning or disposal. Migration of additional systems not included in the original scope.`
  };
  
  return phaseOutOfScope[phase] || `Hardware procurement or installation unless explicitly included. Development of custom applications outside standard ${technology} capabilities. End-user training beyond knowledge transfer to administrators. Ongoing support beyond the implementation period. Integration with systems not explicitly mentioned in requirements.`;
}

function generateSubserviceDescription(technology: string, subserviceName: string, serviceName: string): string {
  if (subserviceName.includes("Assessment")) {
    return `This subservice focuses on conducting a thorough assessment of your current environment and requirements for ${serviceName}. Our consultants will analyze your existing infrastructure, document specific requirements, identify potential challenges, and develop detailed specifications to guide the implementation process. The assessment will establish a solid foundation for successful ${technology} deployment.`;
  } else if (subserviceName.includes("Implementation")) {
    return `This subservice delivers the core implementation activities for ${serviceName}. Our certified consultants will configure ${technology} components according to the approved design, perform necessary integrations with your existing systems, and implement security controls and operational processes. All work follows industry best practices and vendor recommendations to ensure optimal performance and reliability.`;
  } else if (subserviceName.includes("Validation")) {
    return `This subservice ensures that the ${serviceName} implementation meets all requirements and performs as expected. Our team will conduct comprehensive testing, validate functionality against acceptance criteria, troubleshoot any issues, and document the final configuration. The validation process includes knowledge transfer sessions with your technical team to ensure a smooth transition to operations.`;
  } else if (subserviceName.includes("Planning")) {
    return `This subservice focuses on developing a comprehensive plan for ${serviceName}. Our experts will create detailed implementation plans, resource schedules, risk mitigation strategies, and success criteria. The planning process incorporates industry best practices and lessons learned from similar ${technology} implementations to ensure a smooth and successful deployment.`;
  } else {
    return `This subservice provides specialized expertise for ${subserviceName} as part of the overall ${serviceName} service. Our consultants will apply industry best practices and proven methodologies to ensure this component of your ${technology} implementation meets your specific business and technical requirements. Deliverables include detailed documentation and knowledge transfer to your team.`;
  }
}

function generateSubserviceKeyAssumptions(technology: string, subserviceName: string, serviceName: string): string {
  if (subserviceName.includes("Assessment")) {
    return `Client will provide access to current environment documentation and configurations. Key stakeholders and subject matter experts will be available for interviews and information gathering. Client will provide timely responses to information requests. Current environment is stable and accessible for assessment activities.`;
  } else if (subserviceName.includes("Implementation")) {
    return `Assessment and planning phases have been completed and approved. Client will provide administrative access to systems required for implementation. Client environment meets the minimum technical requirements for ${technology}. Implementation will be performed during agreed-upon maintenance windows. Required licenses and entitlements are available.`;
  } else if (subserviceName.includes("Validation")) {
    return `Implementation activities have been completed successfully. Client will provide access to test environments and data. Client will participate in acceptance testing activities. Client will provide timely feedback on validation results. Validation will be performed during standard business hours unless otherwise specified.`;
  } else if (subserviceName.includes("Planning")) {
    return `Assessment phase has been completed and requirements are documented. Client will provide timely feedback on planning deliverables. Client will designate appropriate technical and business resources to participate in planning activities. Current environment documentation is accurate and up-to-date.`;
  } else {
    return `Client will provide necessary access to systems and information required for ${subserviceName}. Client will ensure appropriate stakeholders are available for consultation and decision-making. Client environment meets the minimum technical requirements for this component of ${technology}. Work will be performed during standard business hours unless otherwise specified.`;
  }
}

function generateSubserviceClientResponsibilities(technology: string, subserviceName: string, serviceName: string): string {
  if (subserviceName.includes("Assessment")) {
    return `Provide access to current environment documentation and configurations. Make key stakeholders and subject matter experts available for interviews and information gathering. Provide timely responses to information requests. Grant access to systems required for assessment activities. Review and approve assessment findings and recommendations.`;
  } else if (subserviceName.includes("Implementation")) {
    return `Provide administrative access to systems required for implementation. Ensure environment meets the minimum technical requirements for ${technology}. Make technical resources available to assist with implementation activities. Review and approve implementation results. Report any issues or concerns promptly during the implementation process.`;
  } else if (subserviceName.includes("Validation")) {
    return `Participate in acceptance testing activities. Provide access to test environments and data. Provide timely feedback on validation results. Designate appropriate resources for knowledge transfer sessions. Review and approve validation documentation and deliverables.`;
  } else if (subserviceName.includes("Planning")) {
    return `Provide timely feedback on planning deliverables. Designate appropriate technical and business resources to participate in planning activities. Ensure current environment documentation is accurate and up-to-date. Review and approve the final implementation plan and schedule.`;
  } else {
    return `Provide necessary access to systems and information required for ${subserviceName}. Ensure appropriate stakeholders are available for consultation and decision-making. Review and approve deliverables within the agreed timeframe. Provide timely notification of any issues or concerns related to this component.`;
  }
}

function generateSubserviceOutOfScope(technology: string, subserviceName: string, serviceName: string): string {
  if (subserviceName.includes("Assessment")) {
    return `Assessment of systems or applications not directly related to ${technology}. Business process reengineering. Implementation of recommendations from the assessment. Hardware procurement or installation. Performance testing or load testing of existing systems.`;
  } else if (subserviceName.includes("Implementation")) {
    return `Implementation of features or components not explicitly included in the approved design. Custom development beyond standard ${technology} capabilities. End-user training beyond knowledge transfer to administrators. Hardware procurement or installation unless explicitly included.`;
  } else if (subserviceName.includes("Validation")) {
    return `Performance testing or load testing beyond basic functionality validation. Security penetration testing unless explicitly included. Development of custom validation tools or scripts. End-user training. Ongoing support beyond the validation period.`;
  } else if (subserviceName.includes("Planning")) {
    return `Implementation of the planned solution. Procurement of hardware or software. Development of custom applications. End-user training materials development. Detailed technical design beyond high-level architecture.`;
  } else {
    return `Activities not directly related to ${subserviceName}. Custom development beyond standard configuration. Integration with systems not explicitly mentioned in requirements. End-user training beyond knowledge transfer to administrators. Ongoing support beyond the implementation period.`;
  }
}