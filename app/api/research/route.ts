console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY);
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import type { NextRequest } from "next/server"


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
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    try {
      const { text: structuredContent } = await generateText({
        model: openrouter("openai/gpt-4o"),
        prompt: `Create a JSON object for professional services content. Input: "${input}"
        
        REQUIREMENTS:
        - MINIMUM 10 services (not less)
        - Each service must have exactly 3 subservices
        - Question options format: {"key": "Easy description", "value": numerical_value}
        
        Return only valid JSON starting with { and ending with }. No markdown, no explanations.`,
      })

      const parsed = JSON.parse(structuredContent.trim())

      // Validate and ensure minimum requirements
      if (parsed.services && parsed.services.length >= 10) {
        return parsed
      } else {
        console.log("Generated content doesn't meet requirements, using static fallback")
      }
    } catch (fallbackError) {
      console.error("Fallback generation failed:", fallbackError)
    }
  }

  // Return the enhanced static fallback as last resort
  const techInfo =
    parsedTech && parsedTech.includes("{") ? JSON.parse(parsedTech) : { technology: "Technology Solution" }

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

  return {
    technology: techInfo.technology || "Advanced Technology Implementation",
    questions,
    calculations,
    services,
    totalHours: services.reduce((total, service) => total + service.hours, 0),
    sources: sources,
  }
}

export async function POST(request: NextRequest) {
  const { input, models, prompts } = await request.json()

  // Default models if not provided
  const selectedModels = {
    research: models?.research || "anthropic/claude-3.5-sonnet",
    analysis: models?.analysis || "openai/gpt-4-turbo",
    content: models?.content || "anthropic/claude-3.5-sonnet",
    format: models?.format || "openai/gpt-4o",
  }

  // Use custom prompts or defaults
  const customPrompts = {
    parsing: prompts?.parsing || DEFAULT_PROMPTS.parsing,
    research: prompts?.research || DEFAULT_PROMPTS.research,
    analysis: prompts?.analysis || DEFAULT_PROMPTS.analysis,
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("No OpenRouter API key found, using fallback content")
    const fallbackContent = await generateFallbackContent(input)

    return new Response(
      `data: ${JSON.stringify({
        type: "complete",
        content: fallbackContent,
      })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    )
  }

  // Create OpenRouter client
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let parsedTech = ""
      let researchFindings = ""
      let analysis = ""
      let dynamicSources: any[] = []

      try {
        console.log("Starting research for input:", input.substring(0, 100) + "...")

        // Step 1: Parse technology requirements
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "parse",
              status: "active",
              progress: 10,
              model: "GPT-4o via OpenRouter",
            })}\n\n`,
          ),
        )

        try {
          console.log("Calling GPT-4o for technology parsing...")
          const parseResult = await generateText({
            model: openrouter("openai/gpt-4o"),
            prompt: customPrompts.parsing.replace("{input}", input),
          })
          parsedTech = parseResult.text
          console.log("Technology parsing completed successfully")
        } catch (parseError) {
          console.error("Technology parsing failed:", parseError)
          parsedTech = `{"technology": "Technology Solution", "error": "parsing failed"}`
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "parse",
              status: "completed",
              progress: 20,
            })}\n\n`,
          ),
        )

        // Step 2: Conduct research using selected model
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "research",
              status: "active",
              progress: 30,
              model: `${selectedModels.research} via OpenRouter`,
              sources: ["Conducting live research..."],
            })}\n\n`,
          ),
        )

        try {
          console.log(`Calling ${selectedModels.research} for research...`)
          const researchResult = await generateText({
            model: openrouter(selectedModels.research),
            prompt: customPrompts.research.replace("{input}", input),
          })
          researchFindings = researchResult.text
          console.log("Research completed successfully")

          // Extract sources from research findings
          const sourceMatches = researchFindings.match(/SOURCE: ([^|]+) \| ([^|]+) \| ([^\n]+)/g)
          if (sourceMatches) {
            dynamicSources = sourceMatches.map((match) => {
              const parts = match.replace("SOURCE: ", "").split(" | ")
              return {
                url: parts[0]?.trim() || "",
                title: parts[1]?.trim() || "",
                relevance: parts[2]?.trim() || "",
              }
            })
          }
        } catch (researchError) {
          console.error("Research failed:", researchError)
          researchFindings = "Research findings unavailable due to API error"
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "research",
              status: "completed",
              progress: 50,
              sources:
                dynamicSources.length > 0
                  ? dynamicSources.map((s) => s.title)
                  : ["Research completed with limited sources"],
            })}\n\n`,
          ),
        )

        // Step 3: Analyze findings using selected model
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "analyze",
              status: "active",
              progress: 60,
              model: `${selectedModels.analysis} via OpenRouter`,
            })}\n\n`,
          ),
        )

        try {
          console.log(`Calling ${selectedModels.analysis} for analysis...`)
          const analysisResult = await generateText({
            model: openrouter(selectedModels.analysis),
            prompt: customPrompts.analysis.replace("{researchFindings}", researchFindings).replace("{input}", input),
          })
          analysis = analysisResult.text
          console.log("Analysis completed successfully")
        } catch (analysisError) {
          console.error("Analysis failed:", analysisError)
          analysis = "Analysis unavailable due to API error"
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "analyze",
              status: "completed",
              progress: 70,
            })}\n\n`,
          ),
        )

        // Step 4: Generate content using selected model
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "generate",
              status: "active",
              progress: 80,
              model: `${selectedModels.content} via OpenRouter`,
            })}\n\n`,
          ),
        )

        let generatedContent = ""
        let contentAttempts = 0
        const maxAttempts = 3

        while (contentAttempts < maxAttempts) {
          try {
            console.log(`Calling ${selectedModels.content} for content generation (attempt ${contentAttempts + 1})...`)
            const contentResult = await generateText({
              model: openrouter(selectedModels.content),
              prompt: `Generate professional services content based on this research:
              
              Original Request: ${input}
              Research Findings: ${researchFindings}
              Analysis: ${analysis}
              Research Sources Found: ${JSON.stringify(dynamicSources)}

              Use these actual research sources in your sources array, supplemented with additional relevant sources for the technology.
              
              CRITICAL REQUIREMENTS - DO NOT COMPROMISE:
              1. EXACTLY 10 OR MORE services (never less than 10)
              2. Each service MUST have exactly 3 subservices
              3. Question options format: {"key": "Easy to understand description", "value": numerical_value}
              
              Generate exactly this structure with NO TEMPLATES - everything must be research-derived:
              
              1. MINIMUM 12 discovery questions with 3-5 select options each
                 - Each question needs a unique slug (kebab-case)
                 - Questions must be specific to the technology and use case
                 - Each option format: {"key": "Easy description", "value": numerical_value}
                 - Include technical, business, and operational questions
              
              2. CALCULATIONS for subservices with multiple mapped questions:
                 - Create calculations using Ruby ternary operators and math operations
                 - Support: +, -, *, /, (), ==, !=, >, <, >=, <=
                 - Use format: condition ? value_if_true : value_if_false
                 - Example: "(question1 + question2) > 5 ? 1.5 : 1.0"
                 - resultType: "multiplier", "additive", or "conditional"
              
              3. Services across these phases (MINIMUM 10 SERVICES TOTAL):
                 - Planning Phase (2+ services)
                 - Design Phase (2+ services) 
                 - Implementation Phase (4+ services)
                 - Testing Phase (2+ services)
                 - Go-Live Phase (2+ services)
                 - Support Phase (2+ services)
              
              4. Each service MUST have:
                 - Exactly 3 subservices with specific descriptions
                 - Conservative base hour estimates starting at 1-2 hours for simple tasks
                 - Hours should scale based on complexity (1-16 hour range typical)
                 - mappedQuestions array linking to question slugs
                 - calculationSlug for subservices with multiple questions
                 - Realistic complexity factors that multiply base hours appropriately

              HOUR ESTIMATION GUIDELINES:
              - Start with minimal base hours (1-4 hours for most subservices)
              - Simple configuration tasks: 1-2 hours
              - Standard implementation tasks: 2-8 hours  
              - Complex integration tasks: 4-16 hours
              - Let calculations multiply these base hours based on question responses
              - Total project should scale from ~100 hours (simple) to 1000+ hours (complex)
              
              5. Include 8+ realistic sources that would inform this content
              
              IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Start directly with { and end with }.
              
              JSON structure:
              {
                "technology": "string",
                "questions": [
                  {
                    "id": "string",
                    "slug": "kebab-case-slug",
                    "question": "string", 
                    "options": [
                      {"key": "Easy to understand description", "value": numerical_value, "default": boolean}
                    ]
                  }
                ],
                "calculations": [
                  {
                    "id": "string",
                    "slug": "kebab-case-slug",
                    "name": "string",
                    "description": "string",
                    "formula": "ruby ternary expression",
                    "mappedQuestions": ["slug1", "slug2"],
                    "resultType": "multiplier|additive|conditional"
                  }
                ],
                "services": [
                  {
                    "phase": "string",
                    "service": "string",
                    "description": "string",
                    "hours": number,
                    "subservices": [
                      {
                        "name": "string", 
                        "description": "string", 
                        "hours": number, 
                        "mappedQuestions": ["slug1", "slug2"],
                        "calculationSlug": "calculation-slug"
                      }
                    ]
                  }
                ],
                "totalHours": number,
                "sources": [
                  {"url": "string", "title": "string", "relevance": "string"}
                ]
              }
              
              CRITICAL VALIDATION:
              - Count your services - must be 10 or more
              - Each service must have exactly 3 subservices
              - Question options must use the format: {"key": "description", "value": number}
              - Base all hours on realistic professional services rates
              - Create calculations for any subservice with 2+ mapped questions`,
            })
            generatedContent = contentResult.text
            console.log("Content generation completed successfully")
            break
          } catch (contentError) {
            console.error(`Content generation attempt ${contentAttempts + 1} failed:`, {
              error: contentError.message,
              model: selectedModels.content,
              inputLength: input.length,
            })
            contentAttempts++

            if (contentAttempts < maxAttempts) {
              console.log("Retrying content generation with different approach...")
              continue
            }

            // Try with a different model as final fallback
            try {
              console.log("Trying GPT-4o as final fallback for content generation...")
              const fallbackResult = await generateText({
                model: openrouter("openai/gpt-4o"),
                prompt: `Generate professional services structure for: "${input}"
                
                REQUIREMENTS:
                - MINIMUM 10 services (count them!)
                - Each service has exactly 3 subservices
                - Question options: {"key": "description", "value": number}
                
                Return valid JSON with proper structure. Focus on meeting the minimum requirements.`,
              })
              generatedContent = fallbackResult.text
              console.log("Fallback content generation succeeded")
              break
            } catch (fallbackError) {
              console.error("Fallback content generation also failed:", fallbackError)
              generatedContent = ""
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "generate",
              status: "completed",
              progress: 90,
            })}\n\n`,
          ),
        )

        // Step 5: Format for ScopeStack using selected model
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "format",
              status: "active",
              progress: 95,
              model: `${selectedModels.format} via OpenRouter`,
            })}\n\n`,
          ),
        )

        // Clean and parse the generated content
        let contentObj
        try {
          if (generatedContent) {
            // Remove any markdown code blocks and extra formatting
            let cleanedContent = generatedContent.trim()

            // Remove markdown code blocks if present
            if (cleanedContent.startsWith("```json")) {
              cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "")
            } else if (cleanedContent.startsWith("```")) {
              cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "")
            }

            // Remove any leading/trailing whitespace
            cleanedContent = cleanedContent.trim()

            // Attempt to parse the JSON
            contentObj = JSON.parse(cleanedContent)

            // Strict validation for service count
            if (!contentObj.services || contentObj.services.length < 10) {
              console.error(`Insufficient services generated: ${contentObj.services?.length || 0}. Required: 10+`)
              throw new Error(`Insufficient services generated: ${contentObj.services?.length || 0}. Required: 10+`)
            }

            // Validate subservice count
            for (let i = 0; i < contentObj.services.length; i++) {
              const service = contentObj.services[i]
              if (!service.subservices || service.subservices.length !== 3) {
                console.error(`Service ${i + 1} has ${service.subservices?.length || 0} subservices. Required: 3`)
                throw new Error(`Service ${i + 1} has incorrect subservice count`)
              }
            }

            // Ensure calculations array exists
            if (!contentObj.calculations) {
              contentObj.calculations = []
            }

            // Ensure totalHours is calculated if missing
            if (!contentObj.totalHours) {
              contentObj.totalHours = contentObj.services.reduce(
                (total: number, service: any) => total + service.hours,
                0,
              )
            }

            console.log(`Successfully parsed generated content with ${contentObj.services.length} services`)
          } else {
            throw new Error("No content generated")
          }
        } catch (e) {
          console.error("Content parsing error:", e)
          console.log("Raw content length:", generatedContent.length)
          console.log("Raw content preview:", generatedContent.substring(0, 200) + "...")

          // Try alternative parsing approaches
          if (generatedContent) {
            // Try to extract JSON from within the response
            const jsonMatch = generatedContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                contentObj = JSON.parse(jsonMatch[0])

                // Still validate the extracted content
                if (!contentObj.services || contentObj.services.length < 10) {
                  throw new Error("Extracted content still insufficient")
                }

                console.log("Successfully parsed JSON from match")
              } catch (matchError) {
                console.log("JSON match parsing also failed:", matchError.message)
                // Fall back to structured content generation
                contentObj = await generateFallbackContent(
                  input,
                  parsedTech,
                  researchFindings,
                  analysis,
                  dynamicSources,
                )
              }
            } else {
              console.log("No JSON pattern found, using fallback")
              contentObj = await generateFallbackContent(input, parsedTech, researchFindings, analysis, dynamicSources)
            }
          } else {
            console.log("No content generated, using fallback")
            contentObj = await generateFallbackContent(input, parsedTech, researchFindings, analysis, dynamicSources)
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "step",
              stepId: "format",
              status: "completed",
              progress: 100,
            })}\n\n`,
          ),
        )

        // Send final content
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              content: contentObj,
            })}\n\n`,
          ),
        )

        console.log(`Research process completed successfully with ${contentObj.services.length} services`)
      } catch (error) {
        console.error("Research error details:", {
          message: error.message,
          stack: error.stack,
          input: input.substring(0, 200) + "...",
          parsedTech: parsedTech.substring(0, 100) + "...",
          researchFindings: researchFindings.substring(0, 100) + "...",
          analysis: analysis.substring(0, 100) + "...",
        })

        // Try to provide fallback content even on error
        try {
          const fallbackContent = await generateFallbackContent(
            input,
            parsedTech,
            researchFindings,
            analysis,
            dynamicSources,
          )
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                content: fallbackContent,
              })}\n\n`,
            ),
          )
        } catch (fallbackError) {
          console.error("Fallback content generation also failed:", fallbackError)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Research failed: " + error.message,
                details: "All fallback methods failed. Check server logs for more information.",
              })}\n\n`,
            ),
          )
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
