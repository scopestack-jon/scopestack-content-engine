import type { NextRequest } from "next/server"
import { ScopeStackApiService, ScopeStackService } from "@/lib/scopestack-api-service"
import type { GeneratedContent, Service, Question, ResearchSource } from "@/lib/research/types/interfaces"
import { getLanguageConfigForAccount, DEMO_ACCOUNT_CONFIG } from "@/lib/scopestack-language-configs"
import { getRequestLogger, extractTechnology, getSessionId } from "@/lib/request-logger"

interface PushToScopeStackRequest {
  content: GeneratedContent
  clientName?: string
  projectName?: string
  questionnaireTags?: string[]
  skipSurvey?: boolean
  skipDocument?: boolean
  useDirectServices?: boolean // Add services directly instead of via survey
  scopeStackApiKey?: string // API key from request body
  scopeStackAccountSlug?: string // Optional account slug from request body
  scopeStackApiUrl?: string // Optional API URL from request body
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
    
    // Transform subservices to include calculated quantities and hours
    const transformedSubservices = (service.subservices || []).map((subservice: any) => {
      return {
        ...subservice,
        // Subservices retain their calculated values from question responses
        hours: subservice.hours || subservice.baseHours || 1,
        quantity: subservice.quantity || subservice.baseQuantity || 1,
      }
    })
    
    return {
      name: serviceName,
      description: service.description || 'Service description',
      // Services always have Qty=1, Hours=1 when pushed to ScopeStack
      hours: 1,
      quantity: 1,
      phase: service.phase || 'Implementation',
      position: index + 1,
      serviceDescription: service.serviceDescription || service.description || 'Service description',
      keyAssumptions: service.keyAssumptions || '',
      clientResponsibilities: service.clientResponsibilities || '',
      outOfScope: service.outOfScope || '',
      serviceType: 'professional_services',
      paymentFrequency: 'one_time',
      taskSource: 'custom',
      subservices: transformedSubservices, // Include transformed subservices with calculated values
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

function generateProjectName(technology: string): string {
  // Clean and extract key technology components from user input
  const cleanTech = technology.trim()
  
  // Handle generic or unclear inputs first
  if (/^(help|scope|scoping|project)\b/i.test(cleanTech) || 
      /^(help\s+(me\s+)?(scope|scoping))/i.test(cleanTech) ||
      cleanTech.length < 10) {
    return 'Technology Implementation Project'
  }
  
  // Common patterns to identify technology types
  const techPatterns = [
    // Network/Security
    { pattern: /cisco\s+ise/i, name: 'Cisco ISE Network Access Control' },
    { pattern: /palo\s+alto/i, name: 'Palo Alto Security Implementation' },
    { pattern: /fortinet|fortigate/i, name: 'Fortinet Security Implementation' },
    { pattern: /checkpoint/i, name: 'Check Point Security Implementation' },
    { pattern: /meraki/i, name: 'Cisco Meraki Network Implementation' },
    
    // Cloud platforms
    { pattern: /aws|amazon\s+web/i, name: 'AWS Cloud Implementation' },
    { pattern: /azure|microsoft\s+cloud/i, name: 'Microsoft Azure Implementation' },
    { pattern: /gcp|google\s+cloud/i, name: 'Google Cloud Implementation' },
    { pattern: /office\s*365|o365/i, name: 'Microsoft 365 Implementation' },
    
    // Communication/Collaboration
    { pattern: /teams/i, name: 'Microsoft Teams Implementation' },
    { pattern: /zoom/i, name: 'Zoom Platform Implementation' },
    { pattern: /webex/i, name: 'Cisco Webex Implementation' },
    { pattern: /slack/i, name: 'Slack Workspace Implementation' },
    
    // Infrastructure
    { pattern: /vmware/i, name: 'VMware Virtualization Implementation' },
    { pattern: /hyper-?v/i, name: 'Hyper-V Virtualization Implementation' },
    { pattern: /citrix/i, name: 'Citrix Implementation' },
    { pattern: /active\s+directory|ad/i, name: 'Active Directory Implementation' },
    
    // Audio/Visual
    { pattern: /av\s+|audio.*video|lighting.*sound|concert.*environment/i, name: 'Audio Visual System Implementation' },
    
    // Email/Migration
    { pattern: /email.*migration|migration.*email/i, name: 'Email Migration Project' },
    { pattern: /exchange/i, name: 'Microsoft Exchange Implementation' },
    
    // ERP/Business Applications
    { pattern: /salesforce/i, name: 'Salesforce Implementation' },
    { pattern: /sap/i, name: 'SAP Implementation' },
    { pattern: /oracle/i, name: 'Oracle Implementation' },
    
    // Backup/Storage
    { pattern: /backup/i, name: 'Backup Solution Implementation' },
    { pattern: /storage/i, name: 'Storage Solution Implementation' },
    
    // General patterns
    { pattern: /implementation/i, name: 'Technology Implementation Project' },
    { pattern: /migration/i, name: 'Technology Migration Project' },
    { pattern: /upgrade/i, name: 'Technology Upgrade Project' },
    { pattern: /deployment/i, name: 'Technology Deployment Project' }
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
    return `${words.join(' ')} Implementation`
  } else if (words.length === 1) {
    return `${words[0]} Technology Implementation`
  }
  
  return 'Technology Implementation Project'
}

function generateExecutiveSummary(
  technology: string,
  services: Service[],
  sources: ResearchSource[],
  clientName?: string
): string {
  const clientNameStr = clientName || 'your organization'
  
  // Generate clean technology name for professional summary
  const cleanTechnologyName = generateProjectName(technology).replace(' Implementation', '').replace(' Project', '')
  
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
  
  // Paragraph 1: Strategic introduction
  summary += `${clientNameStr} requires a ${cleanTechnologyName} solution to modernize infrastructure and enhance operational capabilities. `
  summary += `This engagement delivers a production-ready implementation tailored to specific business requirements and technical objectives.\n\n`
  
  // Paragraph 2: Approach and methodology
  const serviceHighlights = []
  if (hasAssessment) serviceHighlights.push('requirements assessment')
  if (hasPlanning) serviceHighlights.push('architecture design')
  if (hasImplementation) serviceHighlights.push('implementation and configuration')
  if (hasValidation) serviceHighlights.push('testing and validation')
  
  if (serviceHighlights.length > 0) {
    summary += `Our structured approach includes ${serviceHighlights.join(', ')}, following industry best practices and proven methodologies. `
  }
  summary += `The solution incorporates enterprise-grade security controls, high availability architecture, and scalable deployment patterns.\n\n`
  
  // Paragraph 3: Service overview
  summary += `**KEY SERVICES:**\n\n`
  services.forEach((service, index) => {
    summary += `**${index + 1}. ${service.name}**\n`
    const description = service.serviceDescription || service.description
    // Shorten long descriptions
    const shortDescription = description.length > 150 ? description.substring(0, 150) + '...' : description
    summary += `${shortDescription}\n\n`
  })
  
  // Paragraph 4: Business outcomes
  summary += `**EXPECTED OUTCOMES:**\n\n`
  summary += `This ${cleanTechnologyName} implementation will deliver enhanced system reliability, reduced security risk exposure, improved compliance posture, and accelerated service delivery capabilities. `
  summary += `The engagement provides long-term value through automation efficiencies, reduced operational overhead, and improved business agility while ensuring minimal disruption to existing operations.`
  
  return summary
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = getRequestLogger();

  try {
    const { 
      content, 
      clientName, 
      projectName, 
      questionnaireTags,
      skipSurvey = false,
      skipDocument = false,
      useDirectServices = false,
      scopeStackApiKey,
      scopeStackAccountSlug,
      scopeStackApiUrl
    }: PushToScopeStackRequest = await request.json()

    // Log the push request
    const technology = content?.technology || extractTechnology(JSON.stringify(content));
    const sessionId = getSessionId(request);
    
    await logger.logRequest({
      userRequest: `Push ${technology || 'content'} to ScopeStack: ${projectName || clientName || 'Unnamed Project'}`,
      requestType: 'push-to-scopestack',
      sessionId,
      status: 'started',
      technology,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        clientName,
        projectName,
        serviceCount: content?.services?.length || 0,
        questionCount: content?.questions?.length || 0,
        useDirectServices,
        skipSurvey,
        skipDocument
      }
    });

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

    // Get ScopeStack configuration from request body or environment
    const scopeStackToken = scopeStackApiKey || process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN
    // Clean up API URL - remove trailing slashes and ensure correct format
    const rawUrl = scopeStackApiUrl || process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL || 'https://api.scopestack.io'
    const scopeStackUrl = rawUrl.replace(/\/$/, '') // Remove trailing slash
    const accountSlug = scopeStackAccountSlug || process.env.SCOPESTACK_ACCOUNT_SLUG || process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG

    console.log("🔍 Configuration check:", {
      hasToken: !!scopeStackToken,
      tokenSource: scopeStackApiKey ? 'request' : 'environment',
      apiUrl: scopeStackUrl,
      hasSlug: !!accountSlug,
      tokenPrefix: scopeStackToken ? scopeStackToken.substring(0, 10) + '...' : 'missing'
    })

    if (!scopeStackToken) {
      console.error("❌ ScopeStack API token not found")
      return Response.json({ 
        error: "ScopeStack API token not configured", 
        details: "Please provide 'scopeStackApiKey' in request body or set SCOPESTACK_API_TOKEN environment variable" 
      }, { status: 400 })
    }

    // Initialize ScopeStack API service
    const scopeStackApi = new ScopeStackApiService({
      apiToken: scopeStackToken,
      baseUrl: scopeStackUrl,
      accountSlug: accountSlug,
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
    const generatedProjectName = generateProjectName(content.technology)
    const finalProjectName = projectName || `${generatedProjectName} - ${new Date().toLocaleDateString()}`
    console.log('Generated project name:', generatedProjectName)
    const project = await scopeStackApi.createProject({
      name: finalProjectName,
      clientId: client.id,
      accountId: user.accountId,
      executiveSummary,
    })
    console.log(`Created project: ${project.name} (ID: ${project.id})`)

    // Step 4a: Add services directly if requested
    let createdServices: any[] = []
    if (useDirectServices && content.services && content.services.length > 0) {
      console.log('Step 4a: Adding services directly to project...')
      console.log(`Project ID: ${project.id}`)
      console.log(`Number of services to add: ${scopeStackServices.length}`)
      console.log('First service example:', JSON.stringify(scopeStackServices[0], null, 2))
      try {
        createdServices = await scopeStackApi.addServicesToProject(project.id, scopeStackServices)
        console.log(`Successfully added ${scopeStackServices.length} services to project`)
        if (createdServices && createdServices.length > 0) {
          console.log('Created services:', createdServices.map(s => ({ id: s.id, name: s.name })))
        } else {
          console.log('No services returned from addServicesToProject')
        }
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
      services: createdServices && createdServices.length > 0 ? createdServices.map(service => ({
        id: service.id,
        name: service.name,
        hours: service.hours || service.quantity,
        phase: service.phase,
        status: 'active'
      })) : [],
      metadata: {
        technology: content.technology,
        totalHours: content.totalHours,
        serviceCount: scopeStackServices.length,
        questionCount: content.questions.length,
        sourceCount: content.sources.length,
        generatedAt: new Date().toISOString(),
      },
    }

    // Log successful completion
    await logger.logRequest({
      userRequest: `Push ${technology || 'content'} to ScopeStack: ${projectName || clientName || 'Unnamed Project'}`,
      requestType: 'push-to-scopestack',
      sessionId,
      status: 'completed',
      duration: Date.now() - startTime,
      technology,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        clientName,
        projectName,
        serviceCount: content?.services?.length || 0,
        questionCount: content?.questions?.length || 0,
        useDirectServices,
        skipSurvey,
        skipDocument,
        pushedToScopeStack: true,
        projectId: finalProject.id,
        contractRevenue: finalProject.contractRevenue,
        servicesCreated: createdServices?.length || 0
      }
    });

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

    // Log the error
    try {
      const body = await request.json();
      const content = body.content;
      const technology = content?.technology || extractTechnology(JSON.stringify(content || {}));
      const sessionId = getSessionId(request);
      const projectName = body.projectName || body.clientName;

      await logger.logRequest({
        userRequest: `Push ${technology || 'content'} to ScopeStack: ${projectName || 'Unnamed Project'}`,
        requestType: 'push-to-scopestack',
        sessionId,
        status: 'failed',
        duration: Date.now() - startTime,
        technology,
        errorMessage: errorDetails,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          statusCode,
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      });
    } catch (logError) {
      console.warn('Failed to log error:', logError);
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
