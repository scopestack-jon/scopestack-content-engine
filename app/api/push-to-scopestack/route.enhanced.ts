import type { NextRequest } from "next/server"
import { ScopeStackApiService, ScopeStackService } from "@/lib/scopestack-api-service"
import type { GeneratedContent, Service, Question, ResearchSource } from "@/lib/research/types/interfaces"
import { withRetry, RetryableError, NonRetryableError } from "@/lib/scopestack-retry-wrapper"

interface PushToScopeStackRequest {
  content: GeneratedContent
  clientName?: string
  projectName?: string
  questionnaireTags?: string[]
  skipSurvey?: boolean
  skipDocument?: boolean
}

interface PushToScopeStackResponse {
  success: boolean
  project?: {
    id: string
    name: string
    status: string
    url: string
    executiveSummary?: string
    pricing?: {
      revenue?: number
      cost?: number
      margin?: number
    }
  }
  client?: {
    id: string
    name: string
  }
  survey?: {
    id: string
    name: string
    status: string
  } | null
  document?: {
    id: string
    url?: string
    status: string
  } | null
  metadata?: {
    technology: string
    totalHours: number
    serviceCount: number
    questionCount: number
    sourceCount: number
    generatedAt: string
  }
  error?: string
  details?: string
  warnings?: string[]
}

function validateContent(content: GeneratedContent): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!content.technology || typeof content.technology !== 'string') {
    errors.push('Technology field is required and must be a string')
  }

  if (!content.services || !Array.isArray(content.services) || content.services.length === 0) {
    errors.push('Services array is required and must contain at least one service')
  } else {
    content.services.forEach((service, index) => {
      if (!service.name) errors.push(`Service at index ${index} is missing a name`)
      if (!service.description) errors.push(`Service at index ${index} is missing a description`)
      if (typeof service.hours !== 'number' || service.hours <= 0) {
        errors.push(`Service at index ${index} has invalid hours value`)
      }
    })
  }

  if (!content.questions || !Array.isArray(content.questions)) {
    errors.push('Questions array is required')
  }

  if (!content.sources || !Array.isArray(content.sources)) {
    errors.push('Sources array is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function transformServicesToScopeStack(services: Service[]): ScopeStackService[] {
  return services.map((service, index) => ({
    name: service.name,
    description: service.description,
    hours: service.hours,
    phase: service.phase,
    position: index + 1,
    serviceDescription: service.serviceDescription || service.description,
    keyAssumptions: service.keyAssumptions || '',
    clientResponsibilities: service.clientResponsibilities || '',
    outOfScope: service.outOfScope || '',
  }))
}

function transformQuestionsToSurveyResponses(questions: Question[]): Record<string, any> {
  const responses: Record<string, any> = {}
  
  questions.forEach((question) => {
    const slug = question.slug || question.id || question.text.toLowerCase().replace(/\s+/g, '_').substring(0, 50)
    
    if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
      responses[slug] = question.options[0]
    } else if (question.type === 'number') {
      responses[slug] = 1
    } else if (question.type === 'boolean') {
      responses[slug] = true
    } else {
      responses[slug] = question.text.substring(0, 255) // Limit text length
    }
  })
  
  return responses
}

function generateExecutiveSummary(
  technology: string,
  services: Service[],
  sources: ResearchSource[],
  clientName?: string
): string {
  const clientNameStr = clientName || 'the client'
  
  // Build service summary
  const serviceCount = services.length
  const totalHours = services.reduce((sum, service) => sum + service.hours, 0)
  const phases = [...new Set(services.map(s => s.phase).filter(Boolean))]
  
  // Extract key insights from sources
  const highCredibilitySources = sources.filter(s => s.credibility === 'high').slice(0, 3)
  
  let summary = `This project proposes a comprehensive ${technology} implementation for ${clientNameStr}, designed to deliver enterprise-grade capabilities and measurable business value. `
  
  summary += `The engagement encompasses ${serviceCount} key services across ${phases.length || 1} ${phases.length === 1 ? 'phase' : 'phases'}, with an estimated effort of ${totalHours} hours. `
  
  // Add key services
  const topServices = services.slice(0, 3)
  if (topServices.length > 0) {
    summary += `Core deliverables include ${topServices.map(s => s.name).join(', ')}, ensuring a robust and scalable solution. `
  }
  
  // Add credibility statement if we have high-quality sources
  if (highCredibilitySources.length > 0) {
    summary += `Our approach is informed by industry best practices and proven methodologies, ensuring alignment with current standards and future scalability requirements. `
  }
  
  summary += `The proposed solution will enable ${clientNameStr} to optimize operations, enhance security posture, and achieve strategic objectives through modern ${technology} capabilities.`
  
  return summary
}

export async function POST(request: NextRequest): Promise<Response> {
  const warnings: string[] = []
  
  try {
    // Parse request body
    let requestData: PushToScopeStackRequest
    try {
      requestData = await request.json()
    } catch (error) {
      return Response.json({ 
        success: false,
        error: "Invalid JSON in request body",
        details: error instanceof Error ? error.message : 'Unknown parse error'
      } as PushToScopeStackResponse, { status: 400 })
    }

    const { content, clientName, projectName, questionnaireTags, skipSurvey, skipDocument } = requestData

    // Validate content
    const validation = validateContent(content)
    if (!validation.isValid) {
      return Response.json({ 
        success: false,
        error: "Invalid content structure",
        details: validation.errors.join('; ')
      } as PushToScopeStackResponse, { status: 400 })
    }

    // Get ScopeStack configuration from environment
    const scopeStackToken = process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN
    const scopeStackUrl = process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL
    const scopeStackAccountSlug = process.env.SCOPESTACK_ACCOUNT_SLUG || process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG

    if (!scopeStackToken) {
      return Response.json({ 
        success: false,
        error: "ScopeStack API token not configured",
        details: "Please set SCOPESTACK_API_TOKEN environment variable"
      } as PushToScopeStackResponse, { status: 400 })
    }

    // Initialize ScopeStack API service with retry wrapper
    const scopeStackApi = new ScopeStackApiService({
      apiToken: scopeStackToken,
      baseUrl: scopeStackUrl,
      accountSlug: scopeStackAccountSlug,
    })

    // Step 1: Get current user and account details with retry
    console.log('Step 1: Authenticating with ScopeStack...')
    const user = await withRetry(
      () => scopeStackApi.getCurrentUser(),
      {
        maxAttempts: 3,
        delayMs: 1000,
        onRetry: (attempt, error) => {
          console.log(`Retry attempt ${attempt} for authentication: ${error.message}`)
          warnings.push(`Authentication retry attempt ${attempt}`)
        }
      }
    )
    
    // Step 2: Find or create client
    console.log('Step 2: Finding or creating client...')
    const finalClientName = clientName || content.technology + ' Implementation Client'
    let clients: any[] = []
    
    try {
      clients = await withRetry(
        () => scopeStackApi.searchClients(finalClientName),
        { maxAttempts: 2, delayMs: 500 }
      )
    } catch (error) {
      console.warn('Client search failed, will create new client:', error)
      warnings.push('Client search failed, creating new client')
    }
    
    let client
    if (clients.length > 0) {
      client = clients[0]
      console.log(`Found existing client: ${client.name}`)
    } else {
      try {
        client = await withRetry(
          () => scopeStackApi.createClient(finalClientName, user.accountId),
          { maxAttempts: 2, delayMs: 1000 }
        )
        console.log(`Created new client: ${client.name}`)
      } catch (error) {
        throw new NonRetryableError('Failed to create client', error)
      }
    }

    // Step 3: Transform content to ScopeStack format
    console.log('Step 3: Transforming content...')
    const scopeStackServices = transformServicesToScopeStack(content.services)
    const surveyResponses = transformQuestionsToSurveyResponses(content.questions)
    const executiveSummary = generateExecutiveSummary(
      content.technology,
      content.services,
      content.sources,
      clientName
    )

    // Step 4: Create project with retry
    console.log('Step 4: Creating project...')
    const finalProjectName = projectName || `${content.technology} Implementation - ${new Date().toLocaleDateString()}`
    
    const project = await withRetry(
      () => scopeStackApi.createProject({
        name: finalProjectName,
        clientId: client.id,
        accountId: user.accountId,
        executiveSummary,
        services: scopeStackServices,
      }),
      {
        maxAttempts: 3,
        delayMs: 2000,
        backoff: true,
        onRetry: (attempt, error) => {
          console.log(`Retry attempt ${attempt} for project creation: ${error.message}`)
          warnings.push(`Project creation retry attempt ${attempt}`)
        }
      }
    )
    console.log(`Created project: ${project.name} (ID: ${project.id})`)

    // Step 5: Create survey if not skipped
    let survey = null
    if (!skipSurvey) {
      const tags = questionnaireTags || ['technology', content.technology.toLowerCase()]
      
      try {
        console.log('Step 5: Creating survey...')
        const questionnaires = await withRetry(
          () => scopeStackApi.getQuestionnaires(tags[0]),
          { maxAttempts: 2, delayMs: 1000 }
        )
        
        if (questionnaires.length > 0) {
          const questionnaire = questionnaires[0]
          console.log(`Using questionnaire: ${questionnaire.name}`)
          
          survey = await withRetry(
            () => scopeStackApi.createSurvey(project.id, questionnaire.id, {
              name: finalProjectName,
              responses: surveyResponses,
              accountId: user.accountId,
            }),
            { maxAttempts: 2, delayMs: 1500 }
          )
          
          // Calculate and apply survey recommendations
          console.log('Calculating survey recommendations...')
          await scopeStackApi.calculateSurvey(survey.id)
          
          console.log('Applying survey recommendations...')
          await scopeStackApi.applySurveyRecommendations(survey.id)
        } else {
          console.log('No questionnaires found, skipping survey creation')
          warnings.push('No questionnaires found for survey creation')
        }
      } catch (error) {
        console.error('Survey creation failed, continuing without survey:', error)
        warnings.push('Survey creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    }

    // Step 6: Generate project document if not skipped
    let document = null
    if (!skipDocument) {
      try {
        console.log('Step 6: Generating project document...')
        document = await withRetry(
          () => scopeStackApi.createProjectDocument(project.id),
          {
            maxAttempts: 3,
            delayMs: 3000,
            backoff: true,
            onRetry: (attempt) => {
              console.log(`Retry attempt ${attempt} for document generation`)
              warnings.push(`Document generation retry attempt ${attempt}`)
            }
          }
        )
        console.log('Document generated successfully')
      } catch (error) {
        console.error('Document generation failed:', error)
        warnings.push('Document generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    }

    // Step 7: Get final project details with pricing
    console.log('Step 7: Fetching final project details...')
    let finalProject
    try {
      finalProject = await withRetry(
        () => scopeStackApi.getProjectDetails(project.id),
        { maxAttempts: 2, delayMs: 1000 }
      )
    } catch (error) {
      console.warn('Failed to fetch final project details:', error)
      warnings.push('Could not fetch final project pricing')
      finalProject = project // Use original project data as fallback
    }

    // Build response
    const response: PushToScopeStackResponse = {
      success: true,
      project: {
        id: finalProject.id,
        name: finalProject.name,
        status: finalProject.status,
        url: `https://app.scopestack.io/${user.accountSlug}/projects/${finalProject.id}`,
        executiveSummary: finalProject.executiveSummary,
        pricing: finalProject.contractRevenue ? {
          revenue: finalProject.contractRevenue,
          cost: finalProject.contractCost,
          margin: finalProject.contractMargin,
        } : undefined,
      },
      client: {
        id: client.id,
        name: client.name,
      },
      survey: survey ? {
        id: survey.id,
        name: survey.name,
        status: survey.status,
      } : null,
      document: document ? {
        id: document.id,
        url: document.documentUrl,
        status: document.status,
      } : null,
      metadata: {
        technology: content.technology,
        totalHours: content.totalHours,
        serviceCount: scopeStackServices.length,
        questionCount: content.questions.length,
        sourceCount: content.sources.length,
        generatedAt: new Date().toISOString(),
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    }

    console.log('Successfully pushed content to ScopeStack!')
    return Response.json(response)
    
  } catch (error) {
    console.error("ScopeStack push failed:", error)
    
    // Determine if this is a retryable error
    const isRetryable = error instanceof RetryableError || 
      (error instanceof Error && error.message.includes('ECONNREFUSED'))
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = error instanceof NonRetryableError ? 400 : 500
    
    return Response.json({ 
      success: false,
      error: "Failed to push content to ScopeStack", 
      details: errorMessage,
      warnings,
    } as PushToScopeStackResponse, { status: statusCode })
  }
}