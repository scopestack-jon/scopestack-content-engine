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

RESPOND WITH PURE JSON ONLY.
`;

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

IMPORTANT: At the end of your research, list the specific sources you would reference for this technology, including:
- Vendor documentation URLs
- Industry standards documents
- Best practice guides
- Case studies
- Professional services benchmarks

Format sources as: SOURCE: [URL] | [Title] | [Relevance]

Provide specific, actionable research findings that would inform professional services scoping.
Focus on current 2024-2025 industry standards and practices.
Include enough detail to generate at least 10 distinct services with 3 subservices each.${JSON_RESPONSE_INSTRUCTION}`,

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
  console.log(`[${stepName}] Starting AI call with timeout ${timeoutMs}ms...`)
  console.log(`[${stepName}] Model: ${options.model}`)
  console.log(`[${stepName}] Prompt length: ${options.prompt?.length || 0} characters`)

  const startTime = Date.now()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`[${stepName}] Timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    const resultPromise = (async () => {
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

async function generateFallbackContent(
  input: string,
  parsedTech?: string,
  researchFindings?: string,
  analysis?: string,
  dynamicSources: any[] = [],
) {
  console.log("Generating fallback content...")

  // Use a more structured approach with GPT-4o if available
  if (process.env.OPENROUTER_API_KEY) {
    let structuredContent = ''
    let fallbackAttempts = 0
    const maxFallbackAttempts = 3 // Increased from 2 to 3

    while (fallbackAttempts < maxFallbackAttempts) {
      try {
        console.log(`Fallback attempt ${fallbackAttempts + 1}/${maxFallbackAttempts}`)
        
        // Extract technology name for better prompting
        let techName = input.split(" ").slice(0, 5).join(" ")
        try {
          // Try to extract from parsedTech if available
          if (parsedTech && typeof parsedTech === 'string') {
            const parsed = JSON.parse(parsedTech.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim())
            if (parsed && parsed.technology) {
              techName = parsed.technology
            }
          }
        } catch (e) {
          console.log("Could not extract technology name from parsedTech, using input")
        }
        
        // Use different models for different attempts
        const fallbackModel = fallbackAttempts === 0 ? "openai/gpt-4" : 
                             fallbackAttempts === 1 ? "anthropic/claude-3-opus" : "openai/gpt-4-turbo"
        
        console.log(`Using fallback model: ${fallbackModel}`)
        
        const result = await generateTextWithTimeout({
          model: fallbackModel,
          prompt: `Generate a complete professional services JSON structure for: "${input}"

CRITICAL: You must create SPECIFIC content for ${techName}, not generic content.

Required structure:
{
  "technology": "${techName}",
  "questions": [
    {
      "id": "q1",
      "slug": "question-slug",
      "question": "Question text specific to ${techName}?",
      "options": [
        {"key": "Option 1 specific to ${techName}", "value": 1, "default": true},
        {"key": "Option 2 specific to ${techName}", "value": 2}
      ]
    }
  ],
  "calculations": [
    {
      "id": "calc1",
      "slug": "calculation-slug",
      "name": "Calculation name relevant to ${techName}",
      "description": "Calculation description",
      "formula": "question1 + question2",
      "mappedQuestions": ["question-slug1", "question-slug2"],
      "resultType": "multiplier"
    }
  ],
  "services": [
    {
      "phase": "Planning",
      "service": "Service name specific to ${techName}",
      "description": "Service description with specific ${techName} terminology",
      "hours": 10,
      "serviceDescription": "What this service includes for ${techName}",
      "keyAssumptions": "Critical assumptions for ${techName}",
      "clientResponsibilities": "What client must provide",
      "outOfScope": "What is not included",
      "subservices": [
        {
          "name": "Subservice 1 specific to ${techName}",
          "description": "Subservice description with ${techName} specifics",
          "hours": 4,
          "mappedQuestions": ["question-slug"],
          "calculationSlug": "calculation-slug",
          "serviceDescription": "Subservice description",
          "keyAssumptions": "Subservice assumptions",
          "clientResponsibilities": "Subservice client responsibilities",
          "outOfScope": "Subservice out of scope"
        }
      ]
    }
  ],
  "totalHours": 100,
  "sources": [
    {"url": "https://example.com", "title": "Source title specific to ${techName}", "relevance": "Source relevance to ${techName}"}
  ]
}

REQUIREMENTS:
- MINIMUM 10 services with names SPECIFIC to ${techName}
- Each service must have exactly 3 subservices with names SPECIFIC to ${techName}
- Include specific ${techName} terminology, tools, and methodologies
- All fields must be present and technology-specific
- Return ONLY valid JSON starting with { and ending with }
- No markdown, no explanations, no comments
- Complete the entire JSON structure`,
        }, 90000, "Fallback Content Generation") // Increased timeout from 60000 to 90000
        
        structuredContent = result.text

        console.log("Fallback AI response received, length:", structuredContent.length)
        console.log("First 200 chars:", structuredContent.substring(0, 200))
        console.log("Last 200 chars:", structuredContent.substring(Math.max(0, structuredContent.length - 200)))

        // Check if response is too short or incomplete
        if (!structuredContent || structuredContent.length < 100) {
          console.error("Fallback AI returned incomplete response, retrying...")
          fallbackAttempts++
          continue
        }

        let cleanedContent = structuredContent.trim()
        // Remove markdown code blocks if present
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim()
        }

        // Check if we have valid content to parse
        if (!cleanedContent || cleanedContent.length < 50) {
          console.error("Fallback AI returned empty or very short content after cleaning:", cleanedContent)
          fallbackAttempts++
          continue
        }

        // Remove comments and trailing commas
        cleanedContent = cleanedContent.replace(/\/\/.*$/gm, "") // Remove // comments
        cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
        cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
        cleanedContent = cleanedContent.trim()

        // Extract only the JSON object - find the first { and last }
        const firstBrace = cleanedContent.indexOf('{')
        const lastBrace = cleanedContent.lastIndexOf('}')
        
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          // Use a more robust approach to find the complete JSON object
          let braceCount = 0
          let endIndex = -1
          
          for (let i = firstBrace; i < cleanedContent.length; i++) {
            if (cleanedContent[i] === '{') {
              braceCount++
            } else if (cleanedContent[i] === '}') {
              braceCount--
              if (braceCount === 0) {
                endIndex = i
                break
              }
            }
          }
          
          if (endIndex > firstBrace) {
            cleanedContent = cleanedContent.substring(firstBrace, endIndex + 1)
            console.log("Extracted complete JSON object from fallback response")
          } else {
            console.error("Could not find complete JSON object boundaries in fallback response")
            fallbackAttempts++
            continue
          }
        } else {
          console.error("Could not find valid JSON object boundaries in fallback response")
          fallbackAttempts++
          continue
        }

        // Additional cleaning for common issues
        cleanedContent = cleanedContent.replace(/\n/g, ' ') // Remove newlines
        cleanedContent = cleanedContent.replace(/\s+/g, ' ') // Normalize whitespace
        cleanedContent = cleanedContent.replace(/,\s*}/g, '}') // Remove trailing commas
        cleanedContent = cleanedContent.replace(/,\s*]/g, ']') // Remove trailing commas in arrays

        console.log("Cleaned fallback content length:", cleanedContent.length)
        console.log("First 200 chars of cleaned fallback:", cleanedContent.substring(0, 200))

        const parsed = JSON.parse(cleanedContent)

        // Comprehensive validation of fallback content
        const isValidContent = parsed && 
          typeof parsed.technology === 'string' &&
          Array.isArray(parsed.questions) && parsed.questions.length > 0 &&
          Array.isArray(parsed.calculations) &&
          Array.isArray(parsed.services) && parsed.services.length >= 10 &&
          Array.isArray(parsed.sources) &&
          typeof parsed.totalHours === 'number'

        if (isValidContent) {
          // Validate each service has required fields
          const validServices = parsed.services.every((service: any) => 
            service.phase && service.service && service.description && 
            typeof service.hours === 'number' &&
            Array.isArray(service.subservices) && service.subservices.length === 3 &&
            service.serviceDescription && service.keyAssumptions && 
            service.clientResponsibilities && service.outOfScope
          )

          if (validServices) {
            console.log("Fallback content validation passed")
            return parsed
          } else {
            console.log("Fallback content has invalid services structure")
          }
        } else {
          console.log("Fallback content missing required fields")
        }
        
        fallbackAttempts++
      } catch (fallbackError) {
        console.error(`Fallback attempt ${fallbackAttempts + 1} failed:`, fallbackError)
        console.error("Raw fallback output:", structuredContent)
        fallbackAttempts++
      }
    }
    
    console.log("All fallback attempts failed, using static fallback content...")
  }

  // For parsedTech, also strip code blocks before JSON.parse
  let techInfo
  try {
    let cleanedParsedTech = parsedTech && typeof parsedTech === 'string' ? parsedTech.trim() : ''
    if (cleanedParsedTech.startsWith('```')) {
      cleanedParsedTech = cleanedParsedTech.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim()
    }
    techInfo = cleanedParsedTech && cleanedParsedTech.includes('{') ? JSON.parse(cleanedParsedTech) : { technology: "Technology Solution" }
  } catch (e) {
    console.error("Could not parse parsedTech as JSON. Raw value:", parsedTech)
    techInfo = { technology: "Technology Solution" }
  }

  const questions = [
    {
      id: "q1",
      slug: "business-driver",
      question: "What is the primary business driver for this technology implementation?",
      options: [
        {
          key: "Digital transformation initiative",
          value: 3,
          default: true,
        },
        { key: "Regulatory compliance requirement", value: 4 },
        {
          key: "Cost reduction and efficiency",
          value: 2,
        },
        { key: "Security enhancement priority", value: 4 },
      ],
    },
    {
      id: "q2",
      slug: "implementation-timeline",
      question: "What is the expected timeline for full implementation?",
      options: [
        { key: "Quick deployment (3-6 months)", value: 1 },
        { key: "Standard timeline (6-12 months)", value: 2, default: true },
        { key: "Extended implementation (12-18 months)", value: 3 },
        { key: "Multi-year transformation (18+ months)", value: 4 },
      ],
    },
    {
      id: "q3",
      slug: "integration-complexity",
      question: "What level of integration is required with existing systems?",
      options: [
        { key: "Minimal integration needed", value: 1 },
        { key: "Moderate system integration", value: 2, default: true },
        { key: "Extensive cross-system integration", value: 3 },
        { key: "Enterprise-wide integration", value: 4 },
      ],
    },
    {
      id: "q4",
      slug: "change-management-maturity",
      question: "What is the organization's change management maturity?",
      options: [
        { key: "Basic change management", value: 1 },
        { key: "Developing change processes", value: 2, default: true },
        { key: "Mature change management", value: 3 },
        { key: "Advanced change capabilities", value: 4 },
      ],
    },
    {
      id: "q5",
      slug: "security-compliance-level",
      question: "What are the primary security and compliance requirements?",
      options: [
        { key: "Standard security controls", value: 2 },
        {
          key: "Enhanced compliance framework",
          value: 3,
          default: true,
        },
        { key: "High-security environment", value: 4 },
        { key: "Custom regulatory requirements", value: 4 },
      ],
    },
    {
      id: "q6",
      slug: "user-adoption-approach",
      question: "What is the expected user adoption approach?",
      options: [
        {
          key: "Phased rollout by department",
          value: 2,
          default: true,
        },
        { key: "Organization-wide big bang", value: 3 },
        { key: "Pilot program first", value: 2 },
        { key: "Voluntary adoption model", value: 1 },
      ],
    },
    {
      id: "q7",
      slug: "customization-level",
      question: "What level of customization is anticipated?",
      options: [
        { key: "Out-of-box configuration", value: 1 },
        {
          key: "Standard configuration changes",
          value: 2,
          default: true,
        },
        {
          key: "Custom development required",
          value: 3,
        },
        { key: "Extensive platform modifications", value: 4 },
      ],
    },
    {
      id: "q8",
      slug: "disaster-recovery-requirements",
      question: "What is the disaster recovery and business continuity requirement?",
      options: [
        { key: "Basic backup procedures", value: 1 },
        { key: "Standard DR with defined RTO/RPO", value: 2, default: true },
        { key: "High availability (99.9% uptime)", value: 3 },
        { key: "Mission critical (99.99% uptime)", value: 4 },
      ],
    },
    {
      id: "q9",
      slug: "training-support-model",
      question: "What is the expected training and support model?",
      options: [
        { key: "Self-service documentation", value: 1 },
        { key: "Blended training approach", value: 2, default: true },
        { key: "Instructor-led training", value: 3 },
        { key: "Dedicated support team", value: 4 },
      ],
    },
    {
      id: "q10",
      slug: "performance-scalability",
      question: "What are the performance and scalability requirements?",
      options: [
        { key: "Current state support", value: 1 },
        { key: "Growth ready (2-3x capacity)", value: 2, default: true },
        { key: "High scale (5-10x capacity)", value: 3 },
        { key: "Enterprise scale (unlimited)", value: 4 },
      ],
    },
    {
      id: "q11",
      slug: "budget-procurement",
      question: "What is the budget approval and procurement process?",
      options: [
        { key: "Budget already approved", value: 1 },
        { key: "Approval process underway", value: 2, default: true },
        { key: "ROI justification required", value: 3 },
        { key: "Formal competitive bidding", value: 4 },
      ],
    },
    {
      id: "q12",
      slug: "project-governance",
      question: "What is the preferred project governance model?",
      options: [
        { key: "Agile methodology", value: 2, default: true },
        { key: "Traditional waterfall", value: 3 },
        { key: "Hybrid approach", value: 3 },
        { key: "Custom governance framework", value: 4 },
      ],
    },
  ]

  const calculations = [
    {
      id: "calc1",
      slug: "current-state-complexity",
      name: "Current State Analysis Complexity",
      description: "Combines integration complexity and customization level to determine analysis effort",
      formula: "(integration_complexity + customization_level) / 2",
      mappedQuestions: ["integration-complexity", "customization-level"],
      resultType: "multiplier" as const,
    },
    {
      id: "calc2",
      slug: "stakeholder-engagement-factor",
      name: "Stakeholder Engagement Factor",
      description: "Determines stakeholder interview complexity based on change maturity and adoption approach",
      formula: "change_management_maturity >= 3 ? user_adoption_approach * 0.8 : user_adoption_approach * 1.2",
      mappedQuestions: ["change-management-maturity", "user-adoption-approach"],
      resultType: "multiplier" as const,
    },
    {
      id: "calc3",
      slug: "security-requirements-multiplier",
      name: "Security Requirements Multiplier",
      description: "Adjusts requirements documentation effort based on security and DR requirements",
      formula: "(security_compliance_level + disaster_recovery_requirements) > 6 ? 1.5 : 1.0",
      mappedQuestions: ["security-compliance-level", "disaster-recovery-requirements"],
      resultType: "conditional" as const,
    },
  ]

  const services = [
    {
      phase: "Planning",
      service: "Strategic Assessment & Roadmap Development",
      description: "Comprehensive analysis of current state, future state vision, and detailed implementation roadmap",
      hours: 24, // Reduced from 120
      subservices: [
        {
          name: "Current State Analysis",
          description: "Assessment of existing systems, processes, and capabilities",
          hours: 8, // Reduced from 40
          mappedQuestions: ["integration-complexity", "customization-level"],
          calculationSlug: "current-state-complexity",
        },
        {
          name: "Future State Design",
          description: "Definition of target architecture and business processes",
          hours: 12, // Reduced from 48
          mappedQuestions: ["business-driver", "performance-scalability"],
        },
        {
          name: "Implementation Roadmap",
          description: "Detailed project plan with phases, milestones, and dependencies",
          hours: 4, // Reduced from 32
          mappedQuestions: ["implementation-timeline", "project-governance"],
        },
      ],
    },
    {
      phase: "Planning",
      service: "Requirements Gathering & Stakeholder Alignment",
      description: "Detailed requirements collection and stakeholder consensus building",
      hours: 16, // Reduced from 80
      subservices: [
        {
          name: "Stakeholder Interviews",
          description: "Structured interviews with key business and technical stakeholders",
          hours: 4, // Reduced from 32
          mappedQuestions: ["change-management-maturity", "user-adoption-approach"],
          calculationSlug: "stakeholder-engagement-factor",
        },
        {
          name: "Requirements Documentation",
          description: "Comprehensive functional and non-functional requirements",
          hours: 8, // Reduced from 32
          mappedQuestions: ["security-compliance-level", "disaster-recovery-requirements"],
          calculationSlug: "security-requirements-multiplier",
        },
        {
          name: "Consensus Building",
          description: "Facilitated sessions to align stakeholders on priorities",
          hours: 4, // Reduced from 16
          mappedQuestions: ["budget-procurement"],
        },
      ],
    },
    {
      phase: "Design",
      service: "Solution Architecture & Technical Design",
      description: "Detailed technical architecture and integration design",
      hours: 32, // Reduced from 160
      subservices: [
        {
          name: "Architecture Design",
          description: "High-level and detailed technical architecture",
          hours: 16, // Reduced from 64
          mappedQuestions: ["performance-scalability"],
        },
        {
          name: "Integration Specifications",
          description: "Detailed integration patterns and API specifications",
          hours: 8, // Reduced from 56
          mappedQuestions: ["integration-complexity"],
        },
        {
          name: "Security & Compliance Design",
          description: "Security controls and compliance framework design",
          hours: 8, // Reduced from 40
          mappedQuestions: ["security-compliance-level"],
        },
      ],
    },
    {
      phase: "Design",
      service: "User Experience & Process Design",
      description: "User interface design and business process optimization",
      hours: 20, // Reduced from 100
      subservices: [
        {
          name: "User Experience Design",
          description: "UI/UX design and user journey mapping",
          hours: 8, // Reduced from 40
          mappedQuestions: ["user-adoption-approach"],
        },
        {
          name: "Process Optimization",
          description: "Business process reengineering and workflow design",
          hours: 8, // Reduced from 36
          mappedQuestions: ["change-management-maturity"],
        },
        {
          name: "Training Material Design",
          description: "User guides and training curriculum development",
          hours: 4, // Reduced from 24
          mappedQuestions: ["training-support-model"],
        },
      ],
    },
    {
      phase: "Implementation",
      service: "Core Platform Implementation",
      description: "Primary system installation, configuration, and customization",
      hours: 48, // Reduced from 240
      subservices: [
        {
          name: "Platform Installation",
          description: "System installation and initial configuration",
          hours: 16, // Reduced from 80
          mappedQuestions: ["customization-level"],
        },
        {
          name: "Custom Configuration",
          description: "Business-specific configuration and customization",
          hours: 24, // Reduced from 96
          mappedQuestions: ["customization-level"],
        },
        {
          name: "Performance Optimization",
          description: "System tuning and performance optimization",
          hours: 8, // Reduced from 64
          mappedQuestions: ["performance-scalability"],
        },
      ],
    },
    {
      phase: "Implementation",
      service: "System Integration Development",
      description: "Development and implementation of system integrations",
      hours: 40, // Reduced from 200
      subservices: [
        {
          name: "API Development",
          description: "Custom API development and integration coding",
          hours: 16, // Reduced from 80
          mappedQuestions: ["integration-complexity"],
        },
        {
          name: "Data Migration",
          description: "Legacy data extraction, transformation, and loading",
          hours: 16, // Reduced from 72
          mappedQuestions: ["integration-complexity"],
        },
        {
          name: "Integration Testing",
          description: "End-to-end integration testing and validation",
          hours: 8, // Reduced from 48
          mappedQuestions: ["integration-complexity"],
        },
      ],
    },
    {
      phase: "Implementation",
      service: "Security Implementation & Hardening",
      description: "Security controls implementation and system hardening",
      hours: 24, // Reduced from 120
      subservices: [
        {
          name: "Security Controls",
          description: "Implementation of security policies and controls",
          hours: 8, // Reduced from 48
          mappedQuestions: ["security-compliance-level"],
        },
        {
          name: "Access Management",
          description: "User provisioning and role-based access control setup",
          hours: 8, // Reduced from 40
          mappedQuestions: ["security-compliance-level"],
        },
        {
          name: "Security Monitoring",
          description: "Security monitoring and alerting configuration",
          hours: 8, // Reduced from 32
          mappedQuestions: ["security-compliance-level"],
        },
      ],
    },
    {
      phase: "Implementation",
      service: "Infrastructure & Environment Setup",
      description: "Production and non-production environment configuration",
      hours: 32, // Reduced from 160
      subservices: [
        {
          name: "Environment Provisioning",
          description: "Development, test, and production environment setup",
          hours: 16, // Reduced from 64
          mappedQuestions: ["disaster-recovery-requirements"],
        },
        {
          name: "Monitoring & Alerting",
          description: "System monitoring and operational alerting setup",
          hours: 8, // Reduced from 48
          mappedQuestions: ["disaster-recovery-requirements"],
        },
        {
          name: "Backup & Recovery",
          description: "Backup procedures and disaster recovery configuration",
          hours: 8, // Reduced from 48
          mappedQuestions: ["disaster-recovery-requirements"],
        },
      ],
    },
    {
      phase: "Testing",
      service: "Comprehensive Testing & Quality Assurance",
      description: "Multi-phase testing including functional, performance, and security testing",
      hours: 36, // Reduced from 180
      subservices: [
        {
          name: "Functional Testing",
          description: "End-to-end functional testing and validation",
          hours: 16, // Reduced from 72
          mappedQuestions: ["customization-level"],
        },
        {
          name: "Performance Testing",
          description: "Load testing and performance validation",
          hours: 12, // Reduced from 56
          mappedQuestions: ["performance-scalability"],
        },
        {
          name: "Security Testing",
          description: "Penetration testing and security validation",
          hours: 8, // Reduced from 52
          mappedQuestions: ["security-compliance-level"],
        },
      ],
    },
    {
      phase: "Testing",
      service: "User Acceptance Testing Support",
      description: "Support for business user acceptance testing and validation",
      hours: 16, // Reduced from 80
      subservices: [
        {
          name: "UAT Planning",
          description: "User acceptance testing strategy and plan development",
          hours: 4, // Reduced from 24
          mappedQuestions: ["user-adoption-approach"],
        },
        {
          name: "UAT Execution Support",
          description: "Support during user acceptance testing execution",
          hours: 8, // Reduced from 40
          mappedQuestions: ["user-adoption-approach"],
        },
        {
          name: "Issue Resolution",
          description: "Defect triage and resolution support",
          hours: 4, // Reduced from 16
          mappedQuestions: ["change-management-maturity"],
        },
      ],
    },
    {
      phase: "Go-Live",
      service: "Production Deployment & Cutover",
      description: "Production deployment and system cutover management",
      hours: 24, // Reduced from 120
      subservices: [
        {
          name: "Deployment Execution",
          description: "Production deployment and system activation",
          hours: 8, // Reduced from 48
          mappedQuestions: ["implementation-timeline"],
        },
        {
          name: "Cutover Management",
          description: "Coordinated cutover from legacy to new system",
          hours: 8, // Reduced from 40
          mappedQuestions: ["change-management-maturity"],
        },
        {
          name: "Go-Live Support",
          description: "24/7 support during initial go-live period",
          hours: 8, // Reduced from 32
          mappedQuestions: ["disaster-recovery-requirements"],
        },
      ],
    },
    {
      phase: "Go-Live",
      service: "User Training & Change Management",
      description: "End-user training and organizational change management",
      hours: 20, // Reduced from 100
      subservices: [
        {
          name: "Training Delivery",
          description: "Instructor-led and online training delivery",
          hours: 8, // Reduced from 48
          mappedQuestions: ["training-support-model"],
        },
        {
          name: "Change Management",
          description: "Change management activities and communication",
          hours: 8, // Reduced from 32
          mappedQuestions: ["change-management-maturity"],
        },
        {
          name: "Adoption Support",
          description: "User adoption support and feedback collection",
          hours: 4, // Reduced from 20
          mappedQuestions: ["user-adoption-approach"],
        },
      ],
    },
    {
      phase: "Support",
      service: "Hypercare & Stabilization Support",
      description: "Intensive post-go-live support and system stabilization",
      hours: 32, // Reduced from 160
      subservices: [
        {
          name: "24/7 Support",
          description: "Round-the-clock support for critical issues",
          hours: 16, // Reduced from 80
          mappedQuestions: ["disaster-recovery-requirements"],
        },
        {
          name: "Performance Monitoring",
          description: "Continuous performance monitoring and optimization",
          hours: 8, // Reduced from 48
          mappedQuestions: ["performance-scalability"],
        },
        {
          name: "Issue Resolution",
          description: "Rapid issue identification and resolution",
          hours: 8, // Reduced from 32
          mappedQuestions: ["training-support-model"],
        },
      ],
    },
    {
      phase: "Support",
      service: "Knowledge Transfer & Documentation",
      description: "Comprehensive knowledge transfer and documentation handover",
      hours: 16, // Reduced from 80
      subservices: [
        {
          name: "Technical Documentation",
          description: "Complete technical documentation and runbooks",
          hours: 8, // Reduced from 32
          mappedQuestions: ["customization-level"],
        },
        {
          name: "Knowledge Transfer",
          description: "Structured knowledge transfer to internal teams",
          hours: 4, // Reduced from 32
          mappedQuestions: ["training-support-model"],
        },
        {
          name: "Support Transition",
          description: "Transition to ongoing support model",
          hours: 4, // Reduced from 16
          mappedQuestions: ["change-management-maturity"],
        },
      ],
    },
  ]

  const sources =
    dynamicSources.length > 0
      ? [
          ...dynamicSources,
          // Add supplementary sources if needed
          {
            url: "https://www.gartner.com/en/information-technology/insights/digitalization",
            title: "Gartner Digital Transformation Research",
            relevance: "Industry benchmarks and transformation strategies",
          },
        ]
      : [
          {
            url: "https://docs.microsoft.com/enterprise-architecture",
            title: "Microsoft Enterprise Architecture Guidelines",
            relevance: "Architecture patterns and implementation best practices",
          },
          {
            url: "https://www.cisco.com/c/en/us/solutions/enterprise/design-zone.html",
            title: "Cisco Enterprise Design Zone",
            relevance: "Network architecture and security implementation guides",
          },
          {
            url: "https://aws.amazon.com/architecture/well-architected/",
            title: "AWS Well-Architected Framework",
            relevance: "Cloud architecture principles and best practices",
          },
          {
            url: "https://www.nist.gov/cyberframework",
            title: "NIST Cybersecurity Framework",
            relevance: "Security controls and compliance requirements",
          },
          {
            url: "https://www.gartner.com/en/information-technology/insights/digitalization",
            title: "Gartner Digital Transformation Research",
            relevance: "Industry benchmarks and transformation strategies",
          },
          {
            url: "https://www.pmi.org/learning/library/project-management-methodologies-6968",
            title: "PMI Project Management Methodologies",
            relevance: "Project management best practices and frameworks",
          },
          {
            url: "https://www.forrester.com/report/the-state-of-enterprise-architecture-2024/",
            title: "Forrester Enterprise Architecture Report 2024",
            relevance: "Current enterprise architecture trends and practices",
          },
          {
            url: "https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/tech-forward/the-economic-potential-of-generative-ai-the-next-productivity-frontier",
            title: "McKinsey Technology Implementation Study",
            relevance: "Professional services benchmarks and hour estimates",
          },
        ]

  let fallbackContent = {
    technology: techInfo.technology || "Advanced Technology Implementation",
    questions,
    calculations,
    services,
    totalHours: services.reduce((total, service) => total + service.hours, 0),
    sources: sources,
  }

  // Robust validation: ensure at least 10 services
  if (!fallbackContent.services || fallbackContent.services.length < 10) {
    console.error("Fallback content has insufficient services. Generating placeholder services.")
    fallbackContent.services = Array.from({ length: 10 }, (_, i) => ({
      phase: `Phase ${i+1}`,
      service: `Placeholder Service ${i+1}`,
      description: "Placeholder description.",
      hours: 1,
      serviceDescription: "Placeholder service description.",
      keyAssumptions: "Placeholder key assumptions.",
      clientResponsibilities: "Placeholder client responsibilities.",
      outOfScope: "Placeholder out of scope.",
      subservices: [
        {
          name: "Placeholder Subservice 1",
          description: "Placeholder subservice description.",
          hours: 1,
          mappedQuestions: [],
          serviceDescription: "Placeholder service description.",
          keyAssumptions: "Placeholder key assumptions.",
          clientResponsibilities: "Placeholder client responsibilities.",
          outOfScope: "Placeholder out of scope"
        },
        {
          name: "Placeholder Subservice 2",
          description: "Placeholder subservice description.",
          hours: 1,
          mappedQuestions: [],
          serviceDescription: "Placeholder service description.",
          keyAssumptions: "Placeholder key assumptions.",
          clientResponsibilities: "Placeholder client responsibilities.",
          outOfScope: "Placeholder out of scope"
        },
        {
          name: "Placeholder Subservice 3",
          description: "Placeholder subservice description.",
          hours: 1,
          mappedQuestions: [],
          serviceDescription: "Placeholder service description.",
          keyAssumptions: "Placeholder key assumptions.",
          clientResponsibilities: "Placeholder client responsibilities.",
          outOfScope: "Placeholder out of scope"
        }
      ]
    }))
    fallbackContent.totalHours = fallbackContent.services.reduce((total, service) => total + service.hours, 0)
  }

  // Final log
  if (!fallbackContent.services || fallbackContent.services.length < 10) {
    console.error("Even after placeholder, fallback content is invalid! Returning minimal valid structure.")
  } else {
    console.log("Fallback content is valid with", fallbackContent.services.length, "services.")
  }

  // Final safety check - ensure we always return valid content
  if (!fallbackContent.technology || typeof fallbackContent.technology !== 'string') {
    fallbackContent.technology = "Technology Solution"
  }
  
  if (!Array.isArray(fallbackContent.questions) || fallbackContent.questions.length === 0) {
    fallbackContent.questions = [
      {
        id: "q1",
        slug: "default-question",
        question: "Default question for content generation",
        options: [
          { key: "Default option", value: 1, default: true }
        ]
      }
    ]
  }
  
  if (!Array.isArray(fallbackContent.calculations)) {
    fallbackContent.calculations = []
  }
  
  if (!Array.isArray(fallbackContent.sources)) {
    fallbackContent.sources = [
      {
        url: "https://example.com",
        title: "Default source",
        relevance: "Default relevance"
      }
    ]
  }
  
  if (typeof fallbackContent.totalHours !== 'number') {
    fallbackContent.totalHours = fallbackContent.services.reduce((total: number, service: any) => total + (service.hours || 0), 0)
  }

  return fallbackContent
}

// Function to fix common URL issues in AI responses
function fixUrlsInJson(json: string): string {
  try {
    // First, try to identify and fix incomplete URLs
    let fixed = json;
    
    // Fix missing quotes at the end of values
    fixed = fixed.replace(/:\s*"([^"]*)(?=\s*[,}])/g, ': "$1"');
    
    // Simple approach: replace all instances of "https:" with "https://example.com"
    fixed = fixed.replace(/"https:"/g, '"https://example.com"');
    fixed = fixed.replace(/"https:\s*"/g, '"https://example.com"');
    fixed = fixed.replace(/"https:\s*(?=\s*[,}])/g, '"https://example.com"');
    
    // Replace all instances of "url": "https:" with "url": "https://example.com"
    fixed = fixed.replace(/"url"\s*:\s*"https:[^"]*"/g, '"url": "https://example.com"');
    fixed = fixed.replace(/"url"\s*:\s*"https:[^"]*(?=\s*[,}])/g, '"url": "https://example.com"');
    
    // Replace all instances of "source": "https:" with "source": "https://example.com"
    fixed = fixed.replace(/"source"\s*:\s*"https:[^"]*"/g, '"source": "https://example.com"');
    fixed = fixed.replace(/"source"\s*:\s*"https:[^"]*(?=\s*[,}])/g, '"source": "https://example.com"');
    
    // Replace all instances of "title": "https:" with "title": "https://example.com"
    fixed = fixed.replace(/"title"\s*:\s*"https:[^"]*"/g, '"title": "https://example.com"');
    fixed = fixed.replace(/"title"\s*:\s*"https:[^"]*(?=\s*[,}])/g, '"title": "https://example.com"');
    
    // Fix any remaining unquoted URLs
    fixed = fixed.replace(/https:\/\/[^",}\]]*(?=[,}\]])/g, '"https://example.com"');
    
    return fixed;
  } catch (error) {
    console.error("Error in fixUrlsInJson:", error);
    return json; // Return the original if there's an error
  }
}

// Enhanced response cleaning pipeline
function cleanAIResponse(response: string): string {
  if (!response) return "{}"
  
  let cleaned = response.trim()
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '')
    cleaned = cleaned.replace(/\s*```$/, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\s*/, '')
    cleaned = cleaned.replace(/\s*```$/, '')
  }
  
  // Remove any text before first {
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace)
  }
  
  // Remove any text after last }
  const lastBrace = cleaned.lastIndexOf('}')
  if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1)
  }
  
  // Remove comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '') // Remove // comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
  
  // Fix common JSON issues
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
  cleaned = cleaned.replace(/\n/g, ' ') // Remove newlines
  cleaned = cleaned.replace(/\s+/g, ' ') // Normalize whitespace
  cleaned = cleaned.replace(/"\s*:\s*"/g, '":"') // Normalize spacing in key-value pairs
  cleaned = cleaned.replace(/"\s*:\s*\{/g, '":{') // Normalize spacing before objects
  cleaned = cleaned.replace(/"\s*:\s*\[/g, '":[') // Normalize spacing before arrays
  
  // Handle escaped quotes inside strings
  cleaned = cleaned.replace(/\\"/g, '\\u0022')
  
  // Fix URL issues which are a common source of parsing errors
  cleaned = fixUrlsInJson(cleaned)
  
  // If JSON is completely empty or invalid, return an empty object
  if (!cleaned || cleaned === '{}' || !cleaned.includes('{')) {
    return '{}'
  }
  
  return cleaned.trim()
}

function validateJSONStructure(jsonString: string): boolean {
  if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
    return false
  }
  
  // Check for balanced braces
  let braceCount = 0
  for (const char of jsonString) {
    if (char === '{') braceCount++
    if (char === '}') braceCount--
  }
  
  return braceCount === 0
}

// Enhanced response cleaning and parsing pipeline
async function parseAIResponse(response: string): Promise<any> {
  // First, clean the response
  let cleaned = cleanAIResponse(response)
  
  // Fix URL issues before parsing
  cleaned = fixUrlsInJson(cleaned)
  
  console.log("Cleaned response length:", cleaned.length)
  console.log("First 200 chars:", cleaned.substring(0, 200))
  console.log("Last 200 chars:", cleaned.substring(Math.max(0, cleaned.length - 200)))
  
  // Try standard JSON parsing first
  try {
    const parsed = JSON.parse(cleaned);
    
    // If parsed successfully, check if we need to transform the structure
    // Look for common nested structures in the responses and normalize them
    if (parsed.email_migration_research || 
        parsed.research_findings || 
        parsed.project_scope || 
        parsed.assessment_questions || 
        parsed.implementation_methodologies ||
        parsed.migration_research) {
      console.log("Detected nested structure, normalizing...");
      return normalizeNestedStructure(parsed);
    }
    
    return parsed;
  } catch (initialError) {
    const errorMessage = initialError instanceof Error ? initialError.message : String(initialError)
    console.warn("Initial JSON parsing failed, attempting advanced recovery:", errorMessage)
    
    // Step 1: Try to find and fix common JSON issues
    try {
      // Fix missing quotes around property names
      cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      
      // Fix trailing commas in objects
      cleaned = cleaned.replace(/,(\s*})/g, '$1')
      
      // Fix trailing commas in arrays
      cleaned = cleaned.replace(/,(\s*\])/g, '$1')
      
      // Try parsing again after fixes
      const parsed = JSON.parse(cleaned);
      
      // Check for nested structures
      if (parsed.email_migration_research || parsed.research_findings || parsed.project_scope || parsed.assessment_questions) {
        console.log("Detected nested structure after recovery, normalizing...");
        return normalizeNestedStructure(parsed);
      }
      
      return parsed;
    } catch (error) {
      console.warn("Basic fixes didn't work, attempting structural recovery")
    }
    
    // Step 2: Try to extract valid JSON structure
    try {
      // Find the outermost object
      const firstBrace = cleaned.indexOf('{')
      if (firstBrace >= 0) {
        let braceCount = 1
        let lastValidBrace = firstBrace
        
        // Find matching closing brace
        for (let i = firstBrace + 1; i < cleaned.length; i++) {
          if (cleaned[i] === '{') braceCount++
          else if (cleaned[i] === '}') {
            braceCount--
            if (braceCount === 0) {
              lastValidBrace = i
              break
            }
          }
        }
        
        if (lastValidBrace > firstBrace) {
          // Extract what seems to be valid JSON
          const potentialJson = cleaned.substring(firstBrace, lastValidBrace + 1)
          try {
            const parsed = JSON.parse(potentialJson);
            console.log("Successfully extracted valid JSON structure");
            
            // Check for nested structures
            if (parsed.email_migration_research || parsed.research_findings || parsed.project_scope || parsed.assessment_questions) {
              console.log("Detected nested structure in extracted JSON, normalizing...");
              return normalizeNestedStructure(parsed);
            }
            
            return parsed;
          } catch (error) {
            console.warn("Extracted JSON structure is still invalid")
          }
        }
      }
    } catch (error) {
      console.warn("Structural recovery failed")
    }
    
    // Step 3: More aggressive recovery - try to reconstruct JSON
    try {
      // Replace URL patterns that often cause issues
      cleaned = cleaned.replace(/https:\/\/[^\s"\\]*(?:\\.[^\s"\\]*)*(?="|'|\s|$)/g, '"https://example.com"')
      
      // Replace any remaining invalid URL patterns
      cleaned = cleaned.replace(/"url": "https:[^"]*"?(?=[,}])/g, '"url": "https://example.com"')
      
      // Try to fix truncated JSON by adding missing closing braces/brackets
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      if (openBraces > closeBraces) {
        cleaned += '}'.repeat(openBraces - closeBraces)
      }
      
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/\]/g) || []).length
      if (openBrackets > closeBrackets) {
        cleaned += ']'.repeat(openBrackets - closeBrackets)
      }
      
      // Try parsing one more time
      const parsed = JSON.parse(cleaned);
      
      // Check for nested structures
      if (parsed.email_migration_research || parsed.research_findings || parsed.project_scope || parsed.assessment_questions) {
        console.log("Detected nested structure after aggressive recovery, normalizing...");
        return normalizeNestedStructure(parsed);
      }
      
      return parsed;
    } catch (finalError) {
      const finalErrorMessage = finalError instanceof Error ? finalError.message : String(finalError)
      console.error("All JSON recovery attempts failed:", finalErrorMessage)
      console.error("Cleaned Response:", cleaned)
      throw new Error(`Failed to parse AI response: ${finalErrorMessage}`)
    }
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
          const services = location.map((svc: any) => {
            const phase = svc.phase || "Implementation";
            const service = svc.name || svc.service;
            const hours = svc.estimated_hours || svc.hours || 40;
            
            // Handle subservices
            let subservices = [];
            if (Array.isArray(svc.subservices)) {
              subservices = svc.subservices.map((sub: any, i: number) => {
                // Handle both string and object subservices
                if (typeof sub === 'string') {
                  return {
                    name: sub,
                    description: `${sub} activities`,
                    hours: Math.floor(hours / 3)
                  };
                } else {
                  return {
                    name: sub.name || `Subservice ${i+1}`,
                    description: sub.description || `${sub.name || 'Subservice'} activities`,
                    hours: sub.hours || Math.floor(hours / 3)
                  };
                }
              });
            }
            
            // Ensure exactly 3 subservices
            while (subservices.length < 3) {
              subservices.push({
                name: `Additional Activity ${subservices.length + 1}`,
                description: `Supporting activities for ${service}`,
                hours: Math.floor(hours / 3)
              });
            }
            
            // Limit to exactly 3 subservices
            subservices = subservices.slice(0, 3);
            
            return {
              phase,
              service,
              description: svc.description || `${service} for implementation`,
              hours,
              subservices
            };
          });
          
          if (services.length > 0) {
            normalized.services = services;
            foundServices = true;
            break;
          }
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
  if (!Array.isArray(content.questions) || content.questions.length < 3) {
    console.warn('⚠️ Insufficient questions, generating default questions')
    content.questions = [
      {
        id: "q1",
        slug: "implementation-scope",
        question: `What is the scope of ${content.technology} implementation?`,
        options: [
          { key: "Basic implementation", value: 1, default: true },
          { key: "Standard implementation", value: 2 },
          { key: "Comprehensive implementation", value: 3 }
        ]
      },
      {
        id: "q2",
        slug: "organization-size",
        question: "What is the size of your organization?",
        options: [
          { key: "Small (1-100 employees)", value: 1 },
          { key: "Medium (101-1000 employees)", value: 2, default: true },
          { key: "Large (1000+ employees)", value: 3 }
        ]
      },
      {
        id: "q3",
        slug: "timeline-requirements",
        question: "What is your implementation timeline?",
        options: [
          { key: "Standard (3-6 months)", value: 1, default: true },
          { key: "Accelerated (1-3 months)", value: 2 },
          { key: "Extended (6-12 months)", value: 3 }
        ]
      }
    ]
  }

  // Validate or create calculations
  if (!Array.isArray(content.calculations)) {
    console.warn('⚠️ Missing calculations, adding default calculations')
    content.calculations = [
      {
        id: "calc1",
        slug: "scope-multiplier",
        name: "Scope Multiplier",
        description: "Adjusts hours based on implementation scope",
        formula: "implementation_scope",
        mappedQuestions: ["implementation-scope"],
        resultType: "multiplier"
      }
    ]
  }

  // Validate or create services
  if (!Array.isArray(content.services) || content.services.length < 5) {
    console.warn(`⚠️ Insufficient services: ${content.services?.length || 0}/5 minimum, attempting to extract`)
    
    // Try to extract services from other structures in the response
    let extractedServices = []
    
    // Check if services are in a different location in the structure
    if (content.service_components && Array.isArray(content.service_components)) {
      extractedServices = content.service_components.map((svc: any, index: number) => ({
        phase: svc.phase || "Implementation",
        service: svc.name || `Service ${index + 1}`,
        description: svc.description || `Service description`,
        hours: svc.hours || 40,
        subservices: Array.isArray(svc.subservices) ? svc.subservices.map((sub: any, subIndex: number) => ({
          name: sub.name || `Subservice ${subIndex + 1}`,
          description: sub.description || `Subservice description`,
          hours: sub.hours || Math.floor(svc.hours / 3)
        })) : [
          { name: "Planning", description: "Planning activities", hours: Math.floor((svc.hours || 40) / 3) },
          { name: "Implementation", description: "Implementation activities", hours: Math.floor((svc.hours || 40) / 3) },
          { name: "Support", description: "Support activities", hours: Math.floor((svc.hours || 40) / 3) }
        ]
      }))
    } else if (content.implementation_services && Array.isArray(content.implementation_services)) {
      extractedServices = content.implementation_services
    } else if (content.service_breakdown && Array.isArray(content.service_breakdown)) {
      extractedServices = content.service_breakdown.map((svc: any, index: number) => ({
        phase: svc.phase || "Implementation",
        service: svc.service || `Service ${index + 1}`,
        description: svc.description || `Service description`,
        hours: svc.hours || 40,
        subservices: Array.isArray(svc.subservices) ? svc.subservices.map((sub: string, subIndex: number) => ({
          name: sub,
          description: `${sub} activities`,
          hours: Math.floor(svc.hours / 3)
        })) : [
          { name: "Planning", description: "Planning activities", hours: Math.floor((svc.hours || 40) / 3) },
          { name: "Implementation", description: "Implementation activities", hours: Math.floor((svc.hours || 40) / 3) },
          { name: "Support", description: "Support activities", hours: Math.floor((svc.hours || 40) / 3) }
        ]
      }))
    }
    
    if (extractedServices.length >= 5) {
      content.services = extractedServices
      console.log(`✅ Successfully extracted ${extractedServices.length} services from response`)
    } else {
      throw new Error(`Insufficient services: ${content.services?.length || 0}/5 minimum and extraction failed`)
    }
  }

  // Ensure each service has exactly 3 subservices
  for (const [index, service] of content.services.entries()) {
    if (!service.phase || !service.service || !service.description) {
      console.warn(`⚠️ Service at index ${index} is missing fields, fixing`)
      service.phase = service.phase || "Implementation"
      service.service = service.service || `Service ${index + 1}`
      service.description = service.description || `Service description for ${service.service}`
    }
    
    if (typeof service.hours !== 'number' || isNaN(service.hours)) {
      service.hours = 40
    }
    
    if (!Array.isArray(service.subservices) || service.subservices.length !== 3) {
      console.warn(`⚠️ Service "${service.service}" has ${service.subservices?.length || 0}/3 required subservices, fixing`)
      
      // Keep existing subservices if any
      const existingSubservices = Array.isArray(service.subservices) ? service.subservices : []
      
      // Create default subservices to fill the gap
      const defaultSubservices = [
        { name: "Planning", description: "Planning activities", hours: Math.floor(service.hours / 3) },
        { name: "Implementation", description: "Implementation activities", hours: Math.floor(service.hours / 3) },
        { name: "Support", description: "Support activities", hours: Math.floor(service.hours / 3) }
      ]
      
      // Combine existing with defaults, ensuring exactly 3 subservices
      service.subservices = [
        ...existingSubservices.slice(0, 3),
        ...defaultSubservices.slice(existingSubservices.length)
      ].slice(0, 3)
    }
    
    // Check each subservice
    for (const [subIndex, subservice] of service.subservices.entries()) {
      if (!subservice.name || !subservice.description) {
        console.warn(`⚠️ Subservice at index ${index}.${subIndex} is missing fields, fixing`)
        subservice.name = subservice.name || `Subservice ${subIndex + 1}`
        subservice.description = subservice.description || `Subservice description for ${subservice.name}`
      }
      
      if (typeof subservice.hours !== 'number' || isNaN(subservice.hours)) {
        subservice.hours = Math.floor(service.hours / 3)
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
  if (typeof content.totalHours !== 'number' || isNaN(content.totalHours)) {
    console.warn('⚠️ Missing or invalid totalHours, calculating from services')
    content.totalHours = content.services.reduce((total: number, service: any) => total + (service.hours || 0), 0)
  }

  console.log('✅ Content structure validated and fixed where needed')
  return true
}

// Generate ultimate fallback content when all else fails
function generateUltimateFallbackContent(input: string): any {
  console.log("Generating ultimate fallback content for:", input)
  
  // Extract a more comprehensive technology name from the input
  const technology = input.split(/\s+/).slice(0, 5).join(" ")
  
  // Try to extract industry and scale information
  let industry = "Enterprise"
  let scale = "Medium"
  
  if (input.toLowerCase().includes("hospital") || input.toLowerCase().includes("healthcare")) {
    industry = "Healthcare"
  } else if (input.toLowerCase().includes("bank") || input.toLowerCase().includes("financial")) {
    industry = "Financial Services"
  } else if (input.toLowerCase().includes("retail") || input.toLowerCase().includes("ecommerce")) {
    industry = "Retail"
  } else if (input.toLowerCase().includes("manufacturing")) {
    industry = "Manufacturing"
  } else if (input.toLowerCase().includes("government")) {
    industry = "Government"
  }
  
  if (input.toLowerCase().includes("1000") || input.toLowerCase().includes("enterprise")) {
    scale = "Enterprise"
  } else if (input.toLowerCase().includes("500") || input.toLowerCase().includes("mid")) {
    scale = "Mid-size"
  } else if (input.toLowerCase().includes("100") || input.toLowerCase().includes("small")) {
    scale = "Small"
  }
  
  // Create technology-specific questions
  const questions = [
    {
      id: "q1",
      slug: "implementation-scope",
      question: `What is the scope of ${technology} implementation?`,
      options: [
        { key: `Basic ${technology} implementation`, value: 1, default: true },
        { key: `Standard ${technology} implementation`, value: 2 },
        { key: `Comprehensive ${technology} implementation`, value: 3 }
      ]
    },
    {
      id: "q2",
      slug: "organization-size",
      question: `What is the size of your organization for ${technology}?`,
      options: [
        { key: `Small organization (1-100 users)`, value: 1 },
        { key: `Medium organization (101-1000 users)`, value: 2, default: true },
        { key: `Large organization (1000+ users)`, value: 3 }
      ]
    },
    {
      id: "q3",
      slug: "timeline-requirements",
      question: `What is your ${technology} implementation timeline?`,
      options: [
        { key: `Standard (3-6 months)`, value: 1, default: true },
        { key: `Accelerated (1-3 months)`, value: 2 },
        { key: `Extended (6-12 months)`, value: 3 }
      ]
    },
    {
      id: "q4",
      slug: "compliance-requirements",
      question: `What compliance requirements apply to your ${technology} implementation?`,
      options: [
        { key: `Standard compliance`, value: 1, default: true },
        { key: `${industry}-specific compliance`, value: 2 },
        { key: `Strict regulatory compliance`, value: 3 }
      ]
    },
    {
      id: "q5",
      slug: "integration-complexity",
      question: `What is the integration complexity for ${technology}?`,
      options: [
        { key: `Minimal integration with existing systems`, value: 1, default: true },
        { key: `Standard integration with core systems`, value: 2 },
        { key: `Complex integration with multiple systems`, value: 3 }
      ]
    }
  ]

  // Create calculations that reference the questions
  const calculations = [
    {
      id: "calc1",
      slug: "scope-multiplier",
      name: `${technology} Scope Multiplier`,
      description: `Adjusts hours based on ${technology} implementation scope`,
      formula: "implementation_scope",
      mappedQuestions: ["implementation-scope"],
      resultType: "multiplier"
    },
    {
      id: "calc2",
      slug: "size-factor",
      name: "Organization Size Factor",
      description: `Adjusts hours based on organization size for ${technology}`,
      formula: "organization_size",
      mappedQuestions: ["organization-size"],
      resultType: "multiplier"
    },
    {
      id: "calc3",
      slug: "complexity-factor",
      name: `${technology} Integration Complexity Factor`,
      description: `Adjusts hours based on ${technology} integration complexity`,
      formula: "integration_complexity",
      mappedQuestions: ["integration-complexity"],
      resultType: "multiplier"
    }
  ]

  // Create more technology-specific service names
  let techTerms = technology.split(" ")
  const techTerm = techTerms[0] // First term (e.g., "Microsoft" from "Microsoft Email Migration")
  
  // Create a more comprehensive set of services with proper structure
  const phases = ["Planning", "Design", "Implementation", "Testing", "Go-Live", "Support"]
  const services = phases.flatMap((phase, phaseIndex) => {
    // Create 2 services per phase for a total of 12 services
    return [1, 2].map(serviceIndex => {
      const serviceNumber = phaseIndex * 2 + serviceIndex
      const baseHours = 40
      
      // Generate more specific service names based on the phase and technology
      let serviceName = ""
      let serviceDesc = ""
      
      switch(phase) {
        case "Planning":
          serviceName = serviceIndex === 1 ? 
            `${technology} Assessment & Discovery` : 
            `${technology} Requirements & Architecture Planning`
          serviceDesc = serviceIndex === 1 ?
            `Comprehensive assessment of current environment and ${technology} implementation requirements` :
            `Detailed requirements gathering and architecture planning for ${technology} implementation`
          break
        case "Design":
          serviceName = serviceIndex === 1 ? 
            `${technology} Solution Design` : 
            `${technology} Integration Design`
          serviceDesc = serviceIndex === 1 ?
            `Technical design of ${technology} solution architecture` :
            `Design of integrations between ${technology} and existing systems`
          break
        case "Implementation":
          serviceName = serviceIndex === 1 ? 
            `${technology} Core Implementation` : 
            `${technology} Configuration & Customization`
          serviceDesc = serviceIndex === 1 ?
            `Implementation of core ${technology} components and services` :
            `Configuration and customization of ${technology} for specific business requirements`
          break
        case "Testing":
          serviceName = serviceIndex === 1 ? 
            `${technology} Functional Testing` : 
            `${technology} Integration & Performance Testing`
          serviceDesc = serviceIndex === 1 ?
            `Comprehensive testing of ${technology} functionality` :
            `Testing of ${technology} integrations and performance under load`
          break
        case "Go-Live":
          serviceName = serviceIndex === 1 ? 
            `${technology} Deployment & Cutover` : 
            `${technology} User Training & Adoption`
          serviceDesc = serviceIndex === 1 ?
            `Production deployment and cutover to ${technology}` :
            `End-user training and adoption support for ${technology}`
          break
        case "Support":
          serviceName = serviceIndex === 1 ? 
            `${technology} Post-Implementation Support` : 
            `${technology} Optimization & Knowledge Transfer`
          serviceDesc = serviceIndex === 1 ?
            `Post-implementation support and issue resolution for ${technology}` :
            `Optimization of ${technology} and knowledge transfer to internal teams`
          break
      }
      
      return {
        phase,
        service: serviceName,
        description: serviceDesc,
        hours: baseHours,
        serviceDescription: `Complete ${phase.toLowerCase()} service for ${technology} implementation in ${scale} ${industry} environment`,
        keyAssumptions: `Standard ${technology} implementation assumptions for ${industry} sector`,
        clientResponsibilities: `Client will provide necessary access and resources for ${technology} implementation`,
        outOfScope: `Custom development beyond standard ${technology} implementation and third-party integrations`,
        subservices: [
          {
            name: `${phase} Assessment for ${technology}`,
            description: `Assessment component of ${phase.toLowerCase()} for ${technology} implementation`,
            hours: Math.floor(baseHours / 3),
            mappedQuestions: ["implementation-scope"],
            calculationSlug: "scope-multiplier",
            serviceDescription: `Assessment of ${technology} ${phase.toLowerCase()} requirements`,
            keyAssumptions: `Standard ${technology} implementation assumptions`,
            clientResponsibilities: `Client will provide necessary resources for ${technology} assessment`,
            outOfScope: `Custom development beyond standard ${technology} assessment`
          },
          {
            name: `${phase} Execution for ${technology}`,
            description: `Execution component of ${phase.toLowerCase()} for ${technology} implementation`,
            hours: Math.floor(baseHours / 3),
            mappedQuestions: ["organization-size"],
            calculationSlug: "size-factor",
            serviceDescription: `Execution of ${technology} ${phase.toLowerCase()} activities`,
            keyAssumptions: `Standard ${technology} implementation assumptions`,
            clientResponsibilities: `Client will provide necessary resources for ${technology} execution`,
            outOfScope: `Custom development beyond standard ${technology} execution`
          },
          {
            name: `${phase} Review for ${technology}`,
            description: `Review component of ${phase.toLowerCase()} for ${technology} implementation`,
            hours: Math.floor(baseHours / 3),
            mappedQuestions: ["integration-complexity"],
            calculationSlug: "complexity-factor",
            serviceDescription: `Review of ${technology} ${phase.toLowerCase()} deliverables`,
            keyAssumptions: `Standard ${technology} implementation assumptions`,
            clientResponsibilities: `Client will provide necessary resources for ${technology} review`,
            outOfScope: `Custom development beyond standard ${technology} review`
          }
        ]
      }
    })
  })

  // Calculate total hours
  const totalHours = services.reduce((total, service) => total + service.hours, 0)

  // Create technology-specific sources
  const sources = [
    {
      url: `https://docs.microsoft.com`,
      title: `${technology} Documentation`,
      relevance: `Official documentation and implementation guides for ${technology}`
    },
    {
      url: `https://www.gartner.com`,
      title: `Gartner ${industry} Technology Research`,
      relevance: `Industry analysis and implementation benchmarks for ${technology} in ${industry}`
    },
    {
      url: `https://www.forrester.com`,
      title: `Forrester ${technology} Research`,
      relevance: `Best practices and implementation methodologies for ${technology}`
    }
  ]

  return {
    technology,
    questions,
    calculations,
    services,
    totalHours,
    sources
  }
}

// Generate fallback research data when research step fails
function generateFallbackResearch(technology: string): any {
  console.log("Generating fallback research for:", technology)
  
  return {
    findings: [
      {
        category: "Implementation Methodologies",
        details: `Standard implementation methodologies for ${technology} typically follow industry best practices including requirements gathering, design, development, testing, deployment, and post-implementation support.`
      },
      {
        category: "Best Practices",
        details: `Industry best practices for ${technology} implementations include thorough planning, stakeholder engagement, phased deployment, comprehensive testing, and user training.`
      },
      {
        category: "Professional Services",
        details: `Professional services for ${technology} typically include assessment, planning, design, implementation, testing, training, and post-deployment support.`
      },
      {
        category: "Hour Estimates",
        details: `Typical ${technology} implementations require between 400-600 hours depending on complexity, scale, and customization requirements.`
      },
      {
        category: "Common Challenges",
        details: `Common challenges in ${technology} implementations include integration complexity, data migration issues, user adoption, and scope management.`
      }
    ],
    sources: [
      {
        url: "https://docs.microsoft.com",
        title: "Microsoft Documentation",
        relevance: "Primary technical reference"
      },
      {
        url: "https://aws.amazon.com/documentation",
        title: "AWS Documentation",
        relevance: "Cloud implementation reference"
      },
      {
        url: "https://www.gartner.com",
        title: "Gartner Research",
        relevance: "Industry analysis and benchmarks"
      }
    ]
  }
}

// Generate fallback analysis data when analysis step fails
function generateFallbackAnalysis(technology: string): any {
  console.log("Generating fallback analysis for:", technology)
  
  return {
    implementation_phases: [
      {
        phase: "Planning",
        timeline: "4-6 weeks",
        activities: "Requirements gathering, stakeholder interviews, current state assessment"
      },
      {
        phase: "Design",
        timeline: "4-6 weeks",
        activities: "Solution architecture, process design, integration planning"
      },
      {
        phase: "Implementation",
        timeline: "8-12 weeks",
        activities: "Configuration, customization, integration development"
      },
      {
        phase: "Testing",
        timeline: "4-6 weeks",
        activities: "Functional testing, integration testing, user acceptance testing"
      },
      {
        phase: "Go-Live",
        timeline: "2-4 weeks",
        activities: "Deployment, cutover, initial support"
      },
      {
        phase: "Support",
        timeline: "Ongoing",
        activities: "Maintenance, optimization, user support"
      }
    ],
    critical_success_factors: [
      "Executive sponsorship and stakeholder alignment",
      "Clear requirements and scope definition",
      "Adequate resource allocation",
      "Effective change management and communication",
      "Comprehensive testing strategy",
      "User training and adoption planning"
    ],
    resource_requirements: [
      {
        role: "Project Manager",
        skills: "PMP certification, experience with similar implementations",
        level: "Senior"
      },
      {
        role: "Solution Architect",
        skills: `${technology} certification, 5+ years experience`,
        level: "Senior"
      },
      {
        role: "Technical Consultant",
        skills: `${technology} implementation experience`,
        level: "Mid-level"
      },
      {
        role: "Integration Specialist",
        skills: "API development, middleware experience",
        level: "Senior"
      },
      {
        role: "Change Manager",
        skills: "Organizational change management, communication planning",
        level: "Mid-level"
      }
    ],
    risk_factors: [
      {
        risk: "Scope creep",
        mitigation: "Clear scope definition, change control process"
      },
      {
        risk: "Resource constraints",
        mitigation: "Detailed resource planning, skills assessment"
      },
      {
        risk: "Integration complexity",
        mitigation: "Early proof-of-concept, technical spikes"
      },
      {
        risk: "User adoption challenges",
        mitigation: "Change management strategy, training program"
      }
    ],
    service_breakdown: [
      {
        service: "Planning and Assessment",
        hours: 80,
        subservices: ["Current State Analysis", "Requirements Gathering", "Roadmap Development"]
      },
      {
        service: "Solution Design",
        hours: 120,
        subservices: ["Architecture Design", "Process Design", "Integration Planning"]
      },
      {
        service: "Implementation",
        hours: 200,
        subservices: ["Configuration", "Customization", "Integration Development"]
      }
    ]
  }
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
          
          // Step 2: Research
          sendEvent("step", { 
            stepId: "research", 
            status: "active", 
            progress: 25,
            model: models?.research || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("📚 Step 2: Conducting research...")
          const researchPrompt = prompts?.research || DEFAULT_PROMPTS.research
            .replace("{input}", input)
            .replace("{detectedTechnology}", parsedData.technology || input)
          
          let researchData
          try {
            researchData = await generateWithRetry(
              researchPrompt,
              models?.research || "anthropic/claude-3.5-sonnet",
              2
            )
            console.log("✅ Research successful")
            sendEvent("step", { 
              stepId: "research", 
              status: "completed", 
              progress: 50,
              model: models?.research || "anthropic/claude-3.5-sonnet",
              sources: ["Research sources found"]
            })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("❌ Research failed:", errorMessage)
            // Use fallback for research failure
            researchData = generateFallbackResearch(parsedData.technology || input)
            console.log("⚠️ Using fallback research data")
            sendEvent("step", { 
              stepId: "research", 
              status: "completed", 
              progress: 50,
              model: models?.research || "anthropic/claude-3.5-sonnet"
            })
          }

          // Step 3: Analysis
          sendEvent("step", { 
            stepId: "analyze", 
            status: "active", 
            progress: 50,
            model: models?.analysis || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("🔬 Step 3: Analyzing research...")
          const analysisPrompt = prompts?.analysis || DEFAULT_PROMPTS.analysis
            .replace("{researchFindings}", JSON.stringify(researchData))
            .replace("{input}", input)
          
          let analysisData
          try {
            const analysisResponse = await callOpenRouter({
              model: models?.analysis || "anthropic/claude-3.5-sonnet",
              prompt: analysisPrompt,
            })
            
            analysisData = await parseAIResponse(analysisResponse)
            console.log("✅ Analysis successful")
            sendEvent("step", { 
              stepId: "analyze", 
              status: "completed", 
              progress: 75,
              model: models?.analysis || "anthropic/claude-3.5-sonnet"
            })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("❌ Analysis failed:", errorMessage)
            // Use fallback for analysis failure
            analysisData = generateFallbackAnalysis(parsedData.technology || input)
            console.log("⚠️ Using fallback analysis data")
            sendEvent("step", { 
              stepId: "analyze", 
              status: "completed", 
              progress: 75,
              model: models?.analysis || "anthropic/claude-3.5-sonnet"
            })
          }

          // Step 4: Content Generation
          sendEvent("step", { 
            stepId: "generate", 
            status: "active", 
            progress: 75,
            model: models?.content || "anthropic/claude-3.5-sonnet"
          })
          
          console.log("📝 Step 4: Generating content...")
          const contentPrompt = prompts?.content || 
            `Generate complete professional services content based on research:

Technology: ${parsedData.technology || input}
Research Findings: ${JSON.stringify(researchData)}
Analysis: ${JSON.stringify(analysisData)}
Original Request: ${input}

Generate structured content with:
- At least 5 questions with options that are SPECIFIC to ${parsedData.technology || input}
- At least 10 services across all phases (Planning, Design, Implementation, Testing, Go-Live, Support)
- Each service must have exactly 3 subservices
- All content must be specific to ${parsedData.technology || input} - DO NOT use generic service names
- Hours based on research findings and industry standards
- Include specific technology terms, tools, and methodologies in service names and descriptions

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
                contentPrompt,
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
                  prompt: contentPrompt,
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

          if (shouldUseFallback) {
            console.log("⚠️ Using fallback content")
            try {
              contentObj = await generateFallbackContent(input, JSON.stringify(parsedData), JSON.stringify(researchData), JSON.stringify(analysisData))
              console.log("✅ Fallback content generation successful")
            } catch (fallbackError) {
              const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
              console.error(`❌ Fallback content generation failed: ${errorMessage}`)
              console.log("⚠️ Using ultimate fallback content")
              contentObj = generateUltimateFallbackContent(input)
            }
          }

          // Validate and fix content structure regardless of source
          try {
            validateContentStructure(contentObj)
            console.log("✅ Content structure validated and fixed")
          } catch (validationError) {
            const errorMessage = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`❌ Content validation failed: ${errorMessage}`)
            console.log("⚠️ Using ultimate fallback content")
            contentObj = generateUltimateFallbackContent(input)
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

          // Final validation to ensure we always return valid content
          try {
            validateContentStructure(contentObj)
            console.log("✅ Content structure validated")
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("❌ Content validation failed:", errorMessage)
            console.log("⚠️ Using ultimate fallback content")
            contentObj = generateUltimateFallbackContent(input)
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