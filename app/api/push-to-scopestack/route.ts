import type { NextRequest } from "next/server"
import { ScopeStackApiService, ScopeStackService } from "@/lib/scopestack-api-service"
import type { GeneratedContent, Service, Question, ResearchSource } from "@/lib/research/types/interfaces"
import { getLanguageConfigForAccount, DEMO_ACCOUNT_CONFIG } from "@/lib/scopestack-language-configs"

interface PushToScopeStackRequest {
  content: GeneratedContent
  clientName?: string
  projectName?: string
  questionnaireTags?: string[]
  skipSurvey?: boolean
  skipDocument?: boolean
  useDirectServices?: boolean // Add services directly instead of via survey
}

function transformServicesToScopeStack(services: Service[]): ScopeStackService[] {
  return services.map((service, index) => {
    // Handle different service name formats from content engine
    let serviceName = service.name || service.service || 'Unnamed Service'
    if (typeof serviceName === 'object' && serviceName.name) {
      serviceName = serviceName.name
    } else if (typeof serviceName === 'object') {
      serviceName = JSON.stringify(serviceName).replace(/[{}"]/g, '').replace(/,/g, ', ') || 'Unnamed Service'
    }
    
    return {
      name: serviceName,
      description: service.description || 'Service description',
      hours: service.hours || 0,
      quantity: service.hours || 0,
      phase: service.phase || 'Implementation',
      position: index + 1,
      serviceDescription: service.serviceDescription || service.description || 'Service description',
      keyAssumptions: service.keyAssumptions || '',
      clientResponsibilities: service.clientResponsibilities || '',
      outOfScope: service.outOfScope || '',
      serviceType: 'professional_services',
      paymentFrequency: 'one_time',
      taskSource: 'custom',
      subservices: service.subservices || [], // Include subservices
    }
  })
}

function transformQuestionsToSurveyResponses(questions: Question[]): Record<string, any> {
  const responses: Record<string, any> = {}
  
  questions.forEach((question) => {
    const slug = question.slug || question.id || question.text.toLowerCase().replace(/\s+/g, '_')
    
    if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
      responses[slug] = question.options[0]
    } else if (question.type === 'number') {
      responses[slug] = 1
    } else if (question.type === 'boolean') {
      responses[slug] = true
    } else {
      responses[slug] = question.text
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
  const clientNameStr = clientName || 'your organization'
  
  // Build service metadata
  const serviceCount = services.length
  const totalHours = services.reduce((sum, service) => sum + service.hours, 0)
  const phases = [...new Set(services.map(s => s.phase).filter(Boolean))]
  
  // Extract key service categories for better summary
  const hasAssessment = services.some(s => s.phase?.toLowerCase().includes('initiation') || s.name.toLowerCase().includes('assessment'))
  const hasPlanning = services.some(s => s.phase?.toLowerCase().includes('planning') || s.name.toLowerCase().includes('design'))
  const hasImplementation = services.some(s => s.phase?.toLowerCase().includes('execution') || s.name.toLowerCase().includes('implementation'))
  const hasValidation = services.some(s => s.phase?.toLowerCase().includes('monitoring') || s.name.toLowerCase().includes('test'))
  
  let summary = ''
  
  // Paragraph 1: Introduction with client name and project context
  summary += `${clientNameStr} is embarking on a strategic ${technology} initiative to modernize infrastructure and enhance operational capabilities. `
  summary += `This comprehensive engagement will deliver a production-ready ${technology} solution tailored to meet specific business requirements and technical objectives. `
  summary += `Our proposed approach encompasses ${serviceCount} specialized services delivered across ${phases.length || 1} project ${phases.length === 1 ? 'phase' : 'phases'}, ensuring systematic progress from initial assessment through full production deployment.\n\n`
  
  // Paragraph 2: Client needs and recommended services overview
  summary += `Based on industry best practices and proven implementation methodologies, we have structured this engagement to address critical areas including `
  const serviceHighlights = []
  if (hasAssessment) serviceHighlights.push('comprehensive requirements assessment')
  if (hasPlanning) serviceHighlights.push('detailed architecture design')
  if (hasImplementation) serviceHighlights.push('phased implementation and configuration')
  if (hasValidation) serviceHighlights.push('rigorous testing and validation')
  summary += serviceHighlights.join(', ') + '. '
  
  // Add key technical aspects
  summary += `The technical solution will incorporate enterprise-grade security controls, high availability architecture, and scalable deployment patterns optimized for ${clientNameStr}'s environment. `
  summary += `Each service phase builds upon previous deliverables, ensuring knowledge transfer and sustainable operations post-implementation.\n\n`
  
  // Paragraph 3: Service details and benefits
  summary += `**RECOMMENDED SERVICES:**\n\n`
  services.forEach((service, index) => {
    summary += `**${index + 1}. ${service.name}** (${service.hours} hours)\n`
    summary += `${service.serviceDescription || service.description}\n\n`
  })
  
  // Paragraph 4: Business outcomes and ROI
  summary += `**ANTICIPATED BUSINESS OUTCOMES:**\n\n`
  summary += `Upon successful completion of this ${technology} implementation, ${clientNameStr} will realize significant operational improvements including `
  summary += `enhanced system reliability, reduced security risk exposure, improved compliance posture, and accelerated service delivery capabilities. `
  summary += `The investment of ${totalHours} professional services hours will yield long-term value through automation efficiencies, reduced operational overhead, and improved business agility. `
  summary += `Our methodology ensures minimal disruption to existing operations while delivering transformational technology capabilities that align with strategic business objectives.`
  
  return summary
}

export async function POST(request: NextRequest) {
  try {
    const { 
      content, 
      clientName, 
      projectName, 
      questionnaireTags,
      skipSurvey = false,
      skipDocument = false,
      useDirectServices = false
    }: PushToScopeStackRequest = await request.json()

    // Validate required fields
    if (!content) {
      console.error("❌ No content provided in request body")
      return Response.json({ 
        error: "Content is required", 
        details: "Request body must include 'content' field with generated research data" 
      }, { status: 400 })
    }

    console.log("✅ Content validation passed", {
      technology: content.technology,
      serviceCount: content.services?.length || 0,
      questionCount: content.questions?.length || 0
    })

    // Get ScopeStack configuration from environment
    const scopeStackToken = process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN
    const scopeStackUrl = process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL
    const scopeStackAccountSlug = process.env.SCOPESTACK_ACCOUNT_SLUG || process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG

    console.log("🔍 Environment variables check:", {
      hasToken: !!scopeStackToken,
      hasUrl: !!scopeStackUrl,
      hasSlug: !!scopeStackAccountSlug,
      tokenPrefix: scopeStackToken ? scopeStackToken.substring(0, 10) + '...' : 'missing'
    })

    if (!scopeStackToken) {
      console.error("❌ ScopeStack API token not found in environment variables")
      return Response.json({ 
        error: "ScopeStack API token not configured", 
        details: "Please set SCOPESTACK_API_TOKEN or NEXT_PUBLIC_SCOPESTACK_API_TOKEN environment variable" 
      }, { status: 400 })
    }

    // Initialize ScopeStack API service
    const scopeStackApi = new ScopeStackApiService({
      apiToken: scopeStackToken,
      baseUrl: scopeStackUrl,
      accountSlug: scopeStackAccountSlug,
    })
    
    // Step 1: Get current user and account details
    console.log('Step 1: Authenticating with ScopeStack...')
    const user = await scopeStackApi.getCurrentUser()
    
    // Step 1a: Auto-discover and configure language fields for this account
    console.log('Step 1a: Discovering language fields...')
    try {
      await scopeStackApi.autoConfigureLanguageFields()
    } catch (error) {
      console.warn('⚠️ Failed to auto-configure language fields, using defaults:', error)
      // Fallback to demo config if auto-discovery fails
      scopeStackApi.setLanguageFieldMappings(DEMO_ACCOUNT_CONFIG)
    }
    
    // Step 2: Find or create client
    console.log('Step 2: Finding or creating client...')
    const finalClientName = clientName || content.technology + ' Implementation Client'
    let clients = await scopeStackApi.searchClients(finalClientName)
    
    let client
    if (clients.length > 0) {
      client = clients[0]
      console.log(`Found existing client: ${client.name}`)
    } else {
      client = await scopeStackApi.createClient(finalClientName, user.accountId)
      console.log(`Created new client: ${client.name}`)
    }

    // Step 3: Transform content to ScopeStack format
    console.log('Step 3: Transforming content...')
    console.log('Raw services from content engine:', JSON.stringify(content.services?.slice(0, 2), null, 2))
    const scopeStackServices = transformServicesToScopeStack(content.services)
    console.log('Transformed services:', JSON.stringify(scopeStackServices?.slice(0, 2), null, 2))
    const surveyResponses = transformQuestionsToSurveyResponses(content.questions)
    const executiveSummary = generateExecutiveSummary(
      content.technology,
      content.services,
      content.sources,
      clientName
    )

    // Step 4: Create project
    console.log('Step 4: Creating project...')
    const finalProjectName = projectName || `${content.technology} Implementation - ${new Date().toLocaleDateString()}`
    const project = await scopeStackApi.createProject({
      name: finalProjectName,
      clientId: client.id,
      accountId: user.accountId,
      executiveSummary,
    })
    console.log(`Created project: ${project.name} (ID: ${project.id})`)

    // Step 4a: Add services directly if requested
    if (useDirectServices && content.services && content.services.length > 0) {
      console.log('Step 4a: Adding services directly to project...')
      console.log(`Project ID: ${project.id}`)
      console.log(`Number of services to add: ${scopeStackServices.length}`)
      console.log('First service example:', JSON.stringify(scopeStackServices[0], null, 2))
      try {
        await scopeStackApi.addServicesToProject(project.id, scopeStackServices)
        console.log(`Successfully added ${scopeStackServices.length} services to project`)
      } catch (error) {
        console.error('Failed to add services directly:', error)
        if (error instanceof Error) {
          console.error('Error message:', error.message)
          console.error('Error stack:', error.stack)
        }
        // Continue with the rest of the workflow even if service addition fails
      }
    }

    // Step 5: Create survey if questionnaire is available and not skipped
    let survey = null
    const tags = questionnaireTags || ['technology', content.technology.toLowerCase()]
    
    if (!skipSurvey && !useDirectServices) try {
      console.log('Step 5: Creating survey...')
      const questionnaires = await scopeStackApi.getQuestionnaires(tags[0])
      
      if (questionnaires.length > 0) {
        const questionnaire = questionnaires[0]
        console.log(`Using questionnaire: ${questionnaire.name}`)
        
        survey = await scopeStackApi.createSurvey(project.id, questionnaire.id, {
          name: finalProjectName,
          responses: surveyResponses,
          accountId: user.accountId,
        })
        
        // Calculate and apply survey recommendations
        console.log('Calculating survey recommendations...')
        await scopeStackApi.calculateSurvey(survey.id)
        
        console.log('Applying survey recommendations...')
        await scopeStackApi.applySurveyRecommendations(survey.id)
      } else {
        console.log('No questionnaires found, skipping survey creation')
      }
    } catch (error) {
      console.error('Survey creation failed, continuing without survey:', error)
    }

    // Step 6: Generate project document (if not skipped)
    let document = null
    if (!skipDocument) try {
      console.log('Step 6: Generating project document...')
      document = await scopeStackApi.createProjectDocument(project.id)
      console.log('Document generated successfully')
    } catch (error) {
      console.error('Document generation failed:', error)
    }

    // Step 7: Get final project details with pricing
    console.log('Step 7: Fetching final project details...')
    const finalProject = await scopeStackApi.getProjectDetails(project.id)

    // Build response
    const response = {
      success: true,
      project: {
        id: finalProject.id,
        name: finalProject.name,
        status: finalProject.status,
        url: `https://app.scopestack.io/projects/${finalProject.id}/edit`,
        executiveSummary: finalProject.executiveSummary,
        pricing: {
          revenue: finalProject.contractRevenue,
          cost: finalProject.contractCost,
          margin: finalProject.contractMargin,
        },
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
    }

    console.log('Successfully pushed content to ScopeStack!')
    return Response.json(response)
    
  } catch (error) {
    console.error("❌ ScopeStack push failed:", error)
    
    // Determine appropriate status code based on error type
    let statusCode = 500
    let errorDetails = ''
    
    if (error instanceof Error) {
      // Check for specific error patterns that should return 400
      if (error.message.includes('API token') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
        statusCode = 400
        errorDetails = 'Authentication failed - check ScopeStack API credentials'
      } else if (error.message.includes('validation') || error.message.includes('required field')) {
        statusCode = 400
        errorDetails = 'Request validation failed - check required fields'
      } else {
        errorDetails = error.message
      }
    } else {
      errorDetails = 'Unknown error occurred during ScopeStack integration'
    }
    
    console.error("📊 Error analysis:", {
      statusCode,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error)
    })
    
    return Response.json({ 
      error: "Failed to push content to ScopeStack", 
      details: errorDetails,
      statusCode,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: statusCode })
  }
}
