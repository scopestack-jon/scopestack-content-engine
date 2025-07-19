console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY);
import { generateText } from "ai"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OptimizedAPIClient, OptimizedJSONParser } from "../../../lib/api-optimizations"
import { DynamicResearchEnhancer } from "../../../lib/dynamic-research-enhancer"
import { LiveResearchEngine } from "../../../lib/live-research-engine"

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
  
  // More aggressive JSON extraction - find any JSON object in the response
  const jsonMatch = cleaned.match(/({[\s\S]*})/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }
  
  // If still no match, try to find JSON array
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const arrayMatch = response.match(/(\[[\s\S]*\])/);
    if (arrayMatch) {
      cleaned = arrayMatch[1];
    }
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

// Initialize optimized API client and research engines
const optimizedClient = new OptimizedAPIClient()
const researchEnhancer = new DynamicResearchEnhancer()
const liveResearchEngine = new LiveResearchEngine()

// Helper function to safely extract string values from potentially complex objects
function safeStringify(value: any, fallback: string = "Technology Solution"): string {
  if (!value) return fallback;
  
  if (typeof value === 'string') return value;
  
  if (typeof value === 'object') {
    // Try common property names first
    if (value.name) return safeStringify(value.name, fallback);
    if (value.title) return safeStringify(value.title, fallback);
    if (value.text) return safeStringify(value.text, fallback);
    if (value.value) return safeStringify(value.value, fallback);
    
    // If it's an array, join the elements
    if (Array.isArray(value)) {
      return value.map(v => safeStringify(v, '')).filter(Boolean).join(', ') || fallback;
    }
    
    // Try to extract meaningful content from object
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr && jsonStr !== '{}' && jsonStr !== 'null') {
        // Remove JSON syntax and clean up
        return jsonStr
          .replace(/[{}"[\]]/g, '')
          .replace(/,/g, ', ')
          .replace(/:/g, ': ')
          .slice(0, 100) // Limit length
          .trim() || fallback;
      }
    } catch {
      // JSON.stringify failed, fall through to default
    }
  }
  
  // Convert to string as last resort
  return String(value).slice(0, 100) || fallback;
}

// Optimized function to call OpenRouter API with caching and rate limiting
async function callOpenRouter({ model, prompt, cacheKey }: { 
  model: string; 
  prompt: string; 
  cacheKey?: string 
}): Promise<string> {
  return await optimizedClient.callWithOptimizations({
    model,
    prompt,
    cacheKey,
    timeoutMs: 45000, // Reduced from 120s to 45s
    retries: 2 // Reduced from 3 to 2
  })
}

// Optimized generateTextWithTimeout using new API client
async function generateTextWithTimeout(
  options: { model: string; prompt: string; cacheKey?: string },
  timeoutMs: number = 45000, // Reduced from 120s to 45s
  stepName: string = "AI call"
): Promise<{ text: string }> {
  const startTime = Date.now()
  console.log(`[${stepName}] Starting with model: ${options.model}, prompt length: ${options.prompt.length}`)
  
  try {
    const text = await callOpenRouter({
      model: options.model,
      prompt: options.prompt,
      cacheKey: options.cacheKey
    })

    const duration = Date.now() - startTime
    console.log(`[${stepName}] Completed successfully in ${duration}ms`)
    console.log(`[${stepName}] Response length: ${text?.length || 0} characters`)

    return { text }
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
        
        // Create a descriptive slug from the question
        const questionWords = question.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'what', 'how', 'many'].includes(word))
          .slice(0, 3);
        
        // Generate a descriptive slug based on the question content
        const slug = questionWords.length > 0 ? 
          questionWords.join('_') : 
          `question_${i+1}`;
        
        // Extract options - look for actual option text strings
        const options: any[] = [];
        
        // First try to extract complete option objects
        const optionObjectsRegex = /{([^{}]*)}/g;
        const optionObjectMatches = Array.from(optionsText.matchAll(optionObjectsRegex));
        
        if (optionObjectMatches && optionObjectMatches.length > 0) {
          // Process each option object
          for (let j = 0; j < optionObjectMatches.length; j++) {
            const optionText = optionObjectMatches[j][1];
            
            // Extract key/text/label from the option object
            const keyMatch = optionText.match(/"(?:key|text|label|name|option)"\s*:\s*"([^"]+)"/);
            if (keyMatch && keyMatch[1]) {
              const key = keyMatch[1];
              
              // Skip metadata fields
              if (!['label', 'value', 'hours', 'default', 'metadata', 'type', 'id', 'name', 'description'].includes(key.toLowerCase())) {
                options.push({
                  key: key,
                  value: j + 1, // Use sequential values
                  default: j === 0
                });
              }
            }
          }
        }
        
        // If no valid options found using object extraction, try extracting option strings directly
        if (options.length === 0) {
          // Look for strings that are likely option values
          const optionStringsRegex = /"([^"]{3,50})"/g; // Look for strings between 3-50 chars (likely options)
          const optionStringMatches = Array.from(optionsText.matchAll(optionStringsRegex));
          
          // Filter out metadata fields and collect actual option strings
          const metadataFields = new Set(['key', 'value', 'hours', 'default', 'metadata', 'type', 'id', 'name', 'description']);
          const validOptionStrings: string[] = [];
          
          for (let j = 0; j < optionStringMatches.length; j++) {
            const optionString = optionStringMatches[j][1];
            if (!metadataFields.has(optionString.toLowerCase()) && optionString.length > 2) {
              // Check if this looks like an actual option (not a property name)
              if (optionString.includes(' ') || /^\d+-\d+/.test(optionString) || optionString.length > 10) {
                validOptionStrings.push(optionString);
              }
            }
          }
          
          // Create option objects from valid strings
          for (let j = 0; j < validOptionStrings.length; j++) {
            options.push({
              key: validOptionStrings[j],
              value: j + 1, // Use sequential values
              default: j === 0
            });
          }
        }
        
        // Only add the question if we have valid options
        if (options.length > 0 && question) {
          extractedQuestions.push({
            id: `q${i+1}`,
            slug: slug,
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
  
  // Try optimized JSON parsing first
  try {
    const parsed = await OptimizedJSONParser.parseWithTimeout(cleaned, 10000);
    
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
                subservices: [] as Array<{
                  name: string;
                  description: string;
                  hours: number;
                  mappedQuestions?: string[];
                  calculationSlug?: string;
                  serviceDescription?: string;
                  keyAssumptions?: string;
                  clientResponsibilities?: string;
                  outOfScope?: string;
                }>
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
                });
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
      // Clean up existing questions to ensure proper format
      normalized.questions = parsed.questions.map((q: any, index: number) => {
        // Create a proper slug if missing
        const slug = q.slug || (q.id ? q.id.replace('question_', '') : `question-${index + 1}`);
        
        // Ensure options are properly formatted
        let options = [];
        if (Array.isArray(q.options)) {
          // Skip metadata fields that shouldn't be treated as options
          const metadataFields = new Set(['label', 'value', 'hours', 'default', 'metadata', 'type', 'id', 'name', 'description']);
          
          // First collect valid options
          const validOptions = q.options.filter((opt: any) => {
            // Skip if it's just a metadata field
            if (typeof opt === 'object' && opt !== null && typeof opt.key === 'string') {
              return !metadataFields.has(opt.key.toLowerCase());
            }
            return true;
          });
          
          // Then create properly formatted options with sequential values
          options = validOptions.map((opt: any, i: number) => {
            if (typeof opt === 'string') {
              return {
                key: opt,
                value: i + 1,
                default: i === 0
              };
            } else if (typeof opt === 'object' && opt !== null) {
              return {
                key: opt.key || opt.text || opt.label || opt.name || `Option ${i + 1}`,
                value: i + 1, // Always use sequential values for consistency
                default: !!opt.default || i === 0
              };
            } else {
              return {
                key: `Option ${i + 1}`,
                value: i + 1,
                default: i === 0
              };
            }
          });
        }
        
        return {
          id: q.id || `q${index + 1}`,
          slug: slug,
          question: q.question || `Question ${index + 1}`,
          options: options
        };
      });
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
        options: Array.isArray(q.options) ? q.options.map((opt: string | any, i: number) => {
          // Handle both string options and object options
          if (typeof opt === 'string') {
            return {
              key: opt,
              value: i + 1,
              default: i === 0
            };
          } else if (typeof opt === 'object' && opt !== null) {
            // If it's an object, try to extract key and value
            return {
              key: opt.key || opt.text || opt.label || opt.name || `Option ${i + 1}`,
              value: i + 1, // Always use sequential values for consistency
              default: !!opt.default || i === 0
            };
          } else {
            return {
              key: `Option ${i + 1}`,
              value: i + 1,
              default: i === 0
            };
          }
        }) : []
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
    
    // Collect questions from multiple sources (merge them instead of else-if)
    let allQuestions: any[] = [];
    let questionCounter = 1;
    
    // Helper function to format questions consistently
    const formatQuestion = (q: any, prefix: string) => {
      const options = Array.isArray(q.options) ? q.options.map((opt: string | any, i: number) => {
        if (typeof opt === 'string') {
          return {
            key: opt,
            value: i + 1,
            default: i === 0
          };
        } else if (typeof opt === 'object' && opt !== null) {
          return {
            key: opt.key || opt.text || opt.label || `Option ${i + 1}`,
            value: i + 1,
            default: !!opt.default || i === 0
          };
        } else {
          return {
            key: `Option ${i + 1}`,
            value: i + 1,
            default: i === 0
          };
        }
      }) : [];
      
      return {
        id: q.id || `q${questionCounter++}`,
        slug: q.slug || `${prefix}-question-${questionCounter - 1}`,
        question: q.question || `${prefix} Question ${questionCounter - 1}`,
        options: options
      };
    };
    
    // Collect scoping_questions
    if (parsed.scoping_questions && Array.isArray(parsed.scoping_questions)) {
      allQuestions = allQuestions.concat(
        parsed.scoping_questions.map((q: any) => formatQuestion(q, 'scoping'))
      );
    }
    
    // Collect technology_specific_questions
    if (parsed.technology_specific_questions && Array.isArray(parsed.technology_specific_questions)) {
      allQuestions = allQuestions.concat(
        parsed.technology_specific_questions.map((q: any) => formatQuestion(q, 'tech'))
      );
    }
    
    // If we found questions from the new sources, use them
    if (allQuestions.length > 0) {
      normalized.questions = allQuestions;
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
          // Transform services to expected format
          normalized.services = location;
          foundServices = true;
          break;
        }
      }
      
      // If no services found yet, try to extract from implementation_phases
      if (!foundServices && Array.isArray(parsed.implementation_phases)) {
        const services = parsed.implementation_phases.map((phase: any, index: number) => {
          const phaseName = phase.name || phase.phase || `Phase ${index+1}`;
          const hours = phase.hours || phase.estimated_hours || 40;
          
          // Create subservices from activities if available
          let subservices = [];
          if (Array.isArray(phase.activities)) {
            subservices = phase.activities.slice(0, 3).map((activity: string, i: number) => ({
              name: activity,
              description: `${activity} for ${phaseName}`,
              hours: Math.floor(hours / 3)
            }));
          }
          
          // Ensure exactly 3 subservices
          while (subservices.length < 3) {
            subservices.push({
              name: `Activity ${subservices.length + 1}`,
              description: `Supporting activity for ${phaseName}`,
              hours: Math.floor(hours / 3)
            });
          }
          
          return {
            phase: "Implementation",
            service: phaseName,
            description: phase.description || `${phaseName} phase activities`,
            hours,
            subservices
          };
        });
        
        if (services.length > 0) {
          normalized.services = services;
        }
      }
    }
    
    // Extract sources from various possible locations
    if (Array.isArray(parsed.sources)) {
      normalized.sources = parsed.sources;
    } else if (parsed.reference_sources) {
      normalized.sources = parsed.reference_sources.map((src: any) => ({
        url: src.url || "https://example.com",
        title: src.title || "Reference Source",
        relevance: src.relevance || "Implementation guidance"
      }));
    } else if (parsed.email_migration_research?.reference_sources) {
      normalized.sources = parsed.email_migration_research.reference_sources.map((src: any) => ({
        url: src.url || "https://example.com",
        title: src.title || "Reference Source",
        relevance: src.relevance || "Implementation guidance"
      }));
    } else if (parsed.research_findings?.reference_sources) {
      normalized.sources = parsed.research_findings.reference_sources.map((src: any) => ({
        url: src.url || "https://example.com",
        title: src.title || "Reference Source",
        relevance: src.relevance || "Implementation guidance"
      }));
    } else if (parsed.resources) {
      normalized.sources = parsed.resources.map((src: any) => ({
        url: src.url || "https://example.com",
        title: src.title || src.name || "Resource",
        relevance: src.relevance || "Implementation resource"
      }));
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
  maxAttempts: number = 2, // Reduced from 3 to 2
  cacheKey?: string
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} for ${model}`)
      
      // Add a specific instruction to return valid JSON
      const enhancedPrompt = prompt + "\n\nIMPORTANT: Return only valid JSON. Do not include markdown code blocks. Start with { and end with }. Do NOT nest your response inside fields like 'email_migration_research' or 'research_findings'."
      
      const response = await callOpenRouter({ 
        model, 
        prompt: enhancedPrompt,
        cacheKey: cacheKey ? `${cacheKey}:${attempt}` : undefined
      })
      
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

  // Ensure questions array exists and trust research-driven content
  if (!Array.isArray(content.questions)) {
    content.questions = [];
  }
  if (content.questions.length > 0) {
    console.log(`✅ Using ${content.questions.length} research-driven questions`);
  } else {
    console.warn(`⚠️ No questions generated from research`);
  }

  // Ensure calculations array exists and trust research-driven content  
  if (!Array.isArray(content.calculations)) {
    content.calculations = [];
  }
  if (content.calculations.length > 0) {
    console.log(`✅ Using ${content.calculations.length} research-driven calculations`);
  } else {
    console.warn(`⚠️ No calculations generated from research`);
  }

  // Ensure services array exists and trust research-driven content
  if (!Array.isArray(content.services)) {
    content.services = [];
  }
  if (content.services.length > 0) {
    console.log(`✅ Using ${content.services.length} research-driven services`);
  } else {
    console.warn(`⚠️ No services generated from research`);
  }

  // Calculate total hours from services
  content.totalHours = content.services.reduce((total: number, service: any) => {
    const serviceHours = typeof service.hours === 'number' ? service.hours : 0;
    return total + serviceHours;
  }, 0);

  // Ensure sources array exists
  if (!Array.isArray(content.sources)) {
    content.sources = [];
  }

  console.log('✅ Content structure validated (research-driven approach)')
  return true
}

// Duplicate function removed - using working version at line 1628

// All orphaned code from duplicate functions removed

// Function removed - no longer using fallback content

// Fallback functions removed - no longer using static content

// Corrupted function removed - using working version below

// Function removed - no longer using fallback content

// Fallback functions removed - no longer using static content

// Enhanced active research using Perplexity
async function performPerplexityResearch(userRequest: string): Promise<any> {
  console.log(`🔍 Performing Perplexity-based active research for: ${userRequest}`);
  
  const researchPrompt = `You are a research specialist conducting comprehensive research on technology implementations.

USER REQUEST: ${userRequest}

Analyze this request and conduct comprehensive research to find 8-10 high-quality, real sources that provide complete coverage of this implementation scenario.

Based on the request, determine the:
- Technology/solution being implemented
- Scale and scope indicators
- Industry context (if mentioned)
- Compliance or regulatory considerations
- Integration and technical requirements

Your task is to find sources that cover:

1. Official vendor documentation and guides
2. Industry best practices and implementation methodologies  
3. Technical whitepapers and case studies
4. Compliance and regulatory guidance
5. Professional services benchmarks
6. Security and architecture considerations

For each source, provide:
- Complete, working URL
- Exact title as it appears
- Brief summary of relevance
- Source credibility assessment
- Relevance score (0.0-1.0)

Return your findings in this JSON format:
{
  "sources": [
    {
      "title": "exact title",
      "url": "complete working URL",
      "summary": "what this source covers",
      "credibility": "high|medium|low", 
      "relevance": 0.85,
      "sourceType": "documentation|guide|whitepaper|case_study|blog"
    }
  ],
  "researchSummary": "brief overview of research findings",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "confidence": 0.85
}

Focus on current, authoritative sources that collectively provide comprehensive coverage. Prioritize quality over quantity.`;

  try {
    const response = await optimizedClient.callWithOptimizations({
      model: "perplexity/sonar",
      prompt: researchPrompt,
      cacheKey: `active_research:${userRequest.substring(0, 50)}`,
      timeoutMs: 60000
    });
    
    console.log("🔍 Perplexity research response received, parsing...");
    console.log("📝 Raw response length:", response.length);
    console.log("📝 First 500 chars:", response.substring(0, 500));
    console.log("📝 Last 200 chars:", response.substring(Math.max(0, response.length - 200)));
    
    const cleanedResponse = cleanAIResponse(response);
    console.log("🧹 Cleaned response length:", cleanedResponse.length);
    console.log("🧹 Cleaned first 300 chars:", cleanedResponse.substring(0, 300));
    
    try {
      const parsed = JSON.parse(cleanedResponse);
      console.log("✅ JSON parsing successful");
      console.log("📊 Parsed object keys:", Object.keys(parsed));
      console.log("📊 Sources array length:", parsed.sources?.length || 0);
      
      if (parsed.sources && Array.isArray(parsed.sources)) {
        console.log(`✅ Found ${parsed.sources.length} sources from Perplexity research`);
        console.log("🔗 Source titles:", parsed.sources.map(s => s.title).slice(0, 5));
        return {
          sources: parsed.sources.map((source: any) => ({
            ...source,
            title: source.title || 'Untitled Source',
            url: source.url || 'https://example.com',
            credibility: source.credibility || 'medium',
            relevance: source.relevance || 0.5
          })),
          totalSourcesFound: parsed.sources.length,
          researchSummary: parsed.researchSummary || "Research completed successfully",
          keyInsights: parsed.keyInsights || [],
          confidence: parsed.confidence || 0.7
        };
      }
    } catch (parseError) {
      console.error("❌ Failed to parse Perplexity research response:", parseError);
    }
    
    // Fallback if parsing fails
    return {
      sources: [],
      totalSourcesFound: 0,
      researchSummary: "Research completed but parsing failed",
      keyInsights: [],
      confidence: 0.3
    };
    
  } catch (error) {
    console.error("❌ Perplexity research failed:", error);
    return {
      sources: [],
      totalSourcesFound: 0,
      researchSummary: "Research failed",
      keyInsights: [],
      confidence: 0.1
    };
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
  description: string;
  hours: number;
  subservices: Subservice[];
}

async function generateSowContent(
  technology: string,
  services: any[],
  questions: any[],
  calculations: any[]
): Promise<any> {
  return {
    title: `${technology} Implementation Statement of Work`,
    services: services,
    questions: questions,
    calculations: calculations,
    totalHours: services.reduce((total: number, service: any) => total + (service.hours || 0), 0)
  };
}

function deepStringifyObjects(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepStringifyObjects);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepStringifyObjects(value);
    }
    return result;
  }
  
  return obj;
}

function extractTechnologyName(userRequest: string): string {
  // Simple extraction - can be enhanced with more sophisticated parsing
  return userRequest.split(' ').slice(0, 3).join(' ');
}

async function generateQuestionsFromResearch(researchData: any, userRequest: string): Promise<any[]> {
  const technology = extractTechnologyName(userRequest);
  
  try {
    // Extract key insights from research to inform question generation
    const researchContext = {
      sources: researchData.sources || [],
      summary: researchData.researchSummary || '',
      insights: researchData.keyInsights || [],
      userRequest: userRequest
    };
    
    // Create a prompt for AI to generate contextual questions based on research
    const prompt = `Based on this research about "${userRequest}", generate 5-8 specific, actionable questions that would help scope a professional services project.

Research Context:
- User Request: ${userRequest}
- Research Summary: ${researchContext.summary}
- Key Insights: ${researchContext.insights.join(', ')}
- Source Topics: ${researchContext.sources.map((s: any) => s.title).slice(0, 5).join(', ')}

Generate questions that are:
1. Specific to the technology and use case mentioned
2. Based on the actual research findings above
3. Practical for professional services scoping
4. Include multiple choice options with realistic values/hours/complexities

Return ONLY a JSON array of questions in this exact format:
[
  {
    "id": "q1",
    "slug": "descriptive_slug",
    "question": "Question text here?",
    "options": [
      {"key": "Option 1", "value": 1, "default": false},
      {"key": "Option 2", "value": 2, "default": true},
      {"key": "Option 3", "value": 3, "default": false}
    ]
  }
]`;

    // Call OpenRouter API to generate research-driven questions
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.warn('Failed to generate AI questions, using fallback');
      return getFallbackQuestions(technology);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.warn('No AI response content, using fallback');
      return getFallbackQuestions(technology);
    }

    // Parse the AI-generated questions
    let questions;
    try {
      // Extract JSON from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI questions:', parseError);
      return getFallbackQuestions(technology);
    }

    // Validate the structure
    if (Array.isArray(questions) && questions.length > 0) {
      // Ensure all questions have required fields
      const validatedQuestions = questions.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        slug: q.slug || `question_${index + 1}`,
        question: q.question || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options : [
          { key: "Yes", value: 1, default: true },
          { key: "No", value: 0, default: false }
        ]
      }));

      console.log(`✅ Generated ${validatedQuestions.length} AI-driven questions based on research`);
      return validatedQuestions.slice(0, 8); // Limit to 8 questions max
    }

  } catch (error) {
    console.warn('Error generating research-driven questions:', error);
  }

  // Fallback to basic questions if AI generation fails
  return getFallbackQuestions(technology);
}

function getFallbackQuestions(technology: string): any[] {
  return [
    {
      id: "q1",
      slug: "project_scope",
      question: `What is the primary scope of your ${technology} project?`,
      options: [
        { key: "New implementation", value: 3, default: true },
        { key: "Upgrade/migration", value: 2, default: false },
        { key: "Configuration changes", value: 1, default: false },
        { key: "Troubleshooting", value: 1, default: false }
      ]
    },
    {
      id: "q2",
      slug: "environment_size",
      question: `What is the size of your environment?`,
      options: [
        { key: "Small (1-50 users)", value: 1, default: false },
        { key: "Medium (51-500 users)", value: 2, default: true },
        { key: "Large (501-2000 users)", value: 3, default: false },
        { key: "Enterprise (2000+ users)", value: 4, default: false }
      ]
    },
    {
      id: "q3",
      slug: "timeline",
      question: `What is your target timeline?`,
      options: [
        { key: "Rush (1-2 weeks)", value: 4, default: false },
        { key: "Standard (3-8 weeks)", value: 2, default: true },
        { key: "Extended (2-6 months)", value: 1, default: false }
      ]
    }
  ];
}

async function generateServicesFromResearch(researchData: any, userRequest: string): Promise<any[]> {
  const technology = extractTechnologyName(userRequest);
  
  try {
    // Extract research context for AI generation
    const researchContext = {
      sources: researchData.sources || [],
      summary: researchData.researchSummary || '',
      insights: researchData.keyInsights || [],
      userRequest: userRequest
    };
    
    // Create a prompt for AI to generate contextual services based on research
    const prompt = `Based on this research about "${userRequest}", generate 4-6 professional services phases with specific subservices that would be needed for this project.

Research Context:
- User Request: ${userRequest}
- Research Summary: ${researchContext.summary}
- Key Insights: ${researchContext.insights.join(', ')}
- Source Topics: ${researchContext.sources.map((s: any) => s.title).slice(0, 5).join(', ')}

Generate services that are:
1. Specific to the technology and use case mentioned in the research
2. Based on actual implementation patterns found in the research
3. Realistic hour estimates for professional services
4. Include detailed subservices with specific tasks

Return ONLY a JSON array of services in this exact format:
[
  {
    "phase": "Phase Name",
    "service": "Service Name",
    "description": "Service description",
    "hours": 40,
    "subservices": [
      {
        "name": "Subservice Name", 
        "description": "Subservice description",
        "hours": 15
      }
    ]
  }
]`;

    // Call OpenRouter API to generate research-driven services
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      console.warn('Failed to generate AI services, using fallback');
      return getFallbackServices(technology);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.warn('No AI response content for services, using fallback');
      return getFallbackServices(technology);
    }

    // Parse the AI-generated services
    let services;
    try {
      // Extract JSON from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        services = JSON.parse(jsonMatch[0]);
      } else {
        services = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI services:', parseError);
      return getFallbackServices(technology);
    }

    // Validate the structure
    if (Array.isArray(services) && services.length > 0) {
      // Ensure all services have required fields
      const validatedServices = services.map((s: any, index: number) => ({
        phase: s.phase || `Phase ${index + 1}`,
        service: s.service || `${technology} Service ${index + 1}`,
        description: s.description || `Service description for ${technology}`,
        hours: typeof s.hours === 'number' ? s.hours : 40,
        subservices: Array.isArray(s.subservices) ? s.subservices.map((sub: any) => ({
          name: sub.name || 'Subservice',
          description: sub.description || 'Subservice description',
          hours: typeof sub.hours === 'number' ? sub.hours : 10
        })) : []
      }));

      console.log(`✅ Generated ${validatedServices.length} AI-driven services based on research`);
      return validatedServices.slice(0, 6); // Limit to 6 services max
    }

  } catch (error) {
    console.warn('Error generating research-driven services:', error);
  }

  // Fallback to basic services if AI generation fails
  return getFallbackServices(technology);
}

function getFallbackServices(technology: string): any[] {
  return [
    {
      phase: "Assessment",
      service: `${technology} Requirements Assessment`,
      description: `Assessment of current environment and ${technology} requirements`,
      hours: 40,
      subservices: [
        {
          name: "Current State Analysis",
          description: `Analysis of existing infrastructure and systems`,
          hours: 20
        },
        {
          name: "Requirements Gathering",
          description: `Detailed requirements collection for ${technology}`,
          hours: 20
        }
      ]
    },
    {
      phase: "Implementation",
      service: `${technology} Core Implementation`,
      description: `Core implementation and configuration of ${technology}`,
      hours: 80,
      subservices: [
        {
          name: "Installation & Configuration",
          description: `Installation and basic configuration of ${technology}`,
          hours: 40
        },
        {
          name: "Testing & Validation",
          description: `System testing and validation`,
          hours: 40
        }
      ]
    }
  ];
}

function generateCalculationsFromResearch(questions: any[]): any[] {
  // Generate calculations dynamically based on the actual questions generated
  const calculations = questions.map((question: any, index: number) => {
    // Determine the type of calculation based on question content and options
    let resultType = "multiplier";
    let description = `Adjusts project hours based on ${question.question.toLowerCase()}`;
    
    // Analyze the question to determine the best calculation type
    if (question.question.toLowerCase().includes('timeline') || 
        question.question.toLowerCase().includes('deadline') ||
        question.question.toLowerCase().includes('rush')) {
      resultType = "multiplier";
      description = `Timeline pressure factor - adjusts hours based on urgency requirements`;
    } else if (question.question.toLowerCase().includes('compliance') || 
               question.question.toLowerCase().includes('regulation') ||
               question.question.toLowerCase().includes('audit')) {
      resultType = "additive";
      description = `Compliance overhead - adds additional hours for regulatory requirements`;
    } else if (question.question.toLowerCase().includes('size') || 
               question.question.toLowerCase().includes('users') ||
               question.question.toLowerCase().includes('scale')) {
      resultType = "multiplier";
      description = `Scale factor - adjusts hours based on project size and scope`;
    } else if (question.question.toLowerCase().includes('complexity') || 
               question.question.toLowerCase().includes('rules') ||
               question.question.toLowerCase().includes('migration')) {
      resultType = "multiplier";
      description = `Complexity factor - adjusts hours based on technical complexity`;
    } else {
      resultType = "conditional";
      description = `${question.question.replace('?', '')} factor - conditional adjustment based on selection`;
    }

    return {
      id: `calc_${question.slug}`,
      slug: `${question.slug}_factor`,
      name: `${question.question.replace('?', '')} Factor`,
      description: description,
      formula: question.slug,
      mappedQuestions: [question.slug],
      resultType: resultType
    };
  });

  // Add a base complexity calculation if we don't have many questions
  if (calculations.length < 3) {
    calculations.push({
      id: "base_complexity",
      slug: "base_complexity_factor",
      name: "Base Implementation Complexity",
      description: "Standard complexity factor for implementation projects",
      formula: "1.2", // 20% base complexity multiplier
      mappedQuestions: [],
      resultType: "multiplier"
    });
  }

  console.log(`✅ Generated ${calculations.length} calculations mapped to actual questions`);
  return calculations;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userRequest = body.input || body.request;
    
    if (!userRequest) {
      return NextResponse.json({ error: 'Input or request is required' }, { status: 400 });
    }

    console.log('🔍 Starting research for:', userRequest);
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendSSE = (data: any) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.log('SSE controller closed, cannot send data:', error);
            return false; // Indicate that sending failed
          }
          return true; // Indicate success
        };
        
        try {
          // Step 1: Research phase
          if (!sendSSE({
            type: "step",
            stepId: "research",
            status: "in-progress",
            progress: 20,
            model: "perplexity/sonar"
          })) return;
          
          const researchData = await performPerplexityResearch(userRequest);
          
          // Format sources for frontend (expects "URL | Title | Quality" format)
          const formattedSources = researchData.sources.map((source: any) => 
            `${source.url} | ${source.title} | ${source.credibility.toUpperCase()}`
          );
          
          if (!sendSSE({
            type: "step", 
            stepId: "research",
            status: "completed",
            progress: 40,
            sources: formattedSources
          })) return;
          
          // Step 2: Analysis phase  
          if (!sendSSE({
            type: "step",
            stepId: "analysis", 
            status: "in-progress",
            progress: 60,
            model: "analysis"
          })) return;
          
          // Generate questions from research
          const questions = await generateQuestionsFromResearch(researchData, userRequest);
          
          if (!sendSSE({
            type: "step",
            stepId: "analysis",
            status: "completed", 
            progress: 80
          })) return;
          
          // Step 3: Content generation
          if (!sendSSE({
            type: "step",
            stepId: "content",
            status: "in-progress", 
            progress: 90,
            model: "content"
          })) return;
          
          const services = await generateServicesFromResearch(researchData, userRequest);
          const calculations = generateCalculationsFromResearch(questions);
          
          // Final completion
          if (!sendSSE({
            type: "complete",
            progress: 100,
            content: {
              technology: extractTechnologyName(userRequest),
              questions: questions,
              services: services, 
              calculations: calculations,
              sources: researchData.sources,
              totalHours: services.reduce((total: number, service: any) => total + (service.hours || 0), 0)
            }
          })) return;
          
          controller.close();
          
        } catch (error) {
          console.error('❌ Streaming error:', error);
          sendSSE({
            type: "error",
            message: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('❌ Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
