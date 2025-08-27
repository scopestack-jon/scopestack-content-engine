import type { NextRequest } from "next/server"
import { ScopeStackApiService, ScopeStackService } from "@/lib/scopestack-api-service"
import type { GeneratedContent, Service, Question, ResearchSource } from "@/lib/research/types/interfaces"

interface PushToScopeStackRequest {
  content: GeneratedContent
  clientName?: string
  projectName?: string
  questionnaireTags?: string[]
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
      phase: service.phase || 'Implementation',
      position: index + 1,
      serviceDescription: service.serviceDescription || service.description || 'Service description',
      keyAssumptions: service.keyAssumptions || '',
      clientResponsibilities: service.clientResponsibilities || '',
      outOfScope: service.outOfScope || '',
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
  const clientNameStr = clientName || 'the client'
  
  // Build service summary
  const serviceCount = services.length
  const totalHours = services.reduce((sum, service) => sum + service.hours, 0)
  const phases = [...new Set(services.map(s => s.phase).filter(Boolean))]
  
  // Extract key insights from sources
  const highCredibilitySources = sources.filter(s => s.credibility === 'high').slice(0, 3)
  
  let summary = `This project proposes a comprehensive ${technology} implementation for ${clientNameStr}, designed to deliver enterprise-grade capabilities and measurable business value. `
  
  summary += `The engagement encompasses ${serviceCount} key services across ${phases.length || 1} ${phases.length === 1 ? 'phase' : 'phases'}, with an estimated effort of ${totalHours} hours. `
  
  // Add detailed service breakdown
  summary += `\n\n**PROPOSED SERVICES:**\n`
  services.forEach((service, index) => {
    summary += `${index + 1}. **${service.name}** (${service.hours} hours) - ${service.phase || 'Implementation'} Phase\n`
    summary += `   ${service.serviceDescription || service.description}\n`
    if (service.keyAssumptions) {
      summary += `   *Key Assumptions:* ${service.keyAssumptions}\n`
    }
    if (service.clientResponsibilities) {
      summary += `   *Client Responsibilities:* ${service.clientResponsibilities}\n`
    }
    if (service.outOfScope) {
      summary += `   *Out of Scope:* ${service.outOfScope}\n`
    }
    summary += `\n`
  })
  
  // Add credibility statement if we have high-quality sources
  if (highCredibilitySources.length > 0) {
    summary += `Our approach is informed by industry best practices and proven methodologies, ensuring alignment with current standards and future scalability requirements. `
  }
  
  summary += `\nThe proposed solution will enable ${clientNameStr} to optimize operations, enhance security posture, and achieve strategic objectives through modern ${technology} capabilities.`
  
  return summary
}

export async function POST(request: NextRequest) {
  try {
    const { content, clientName, projectName, questionnaireTags }: PushToScopeStackRequest = await request.json()

    // Validate required fields
    if (!content) {
      return Response.json({ error: "Content is required" }, { status: 400 })
    }

    // Get ScopeStack configuration from environment
    const scopeStackToken = process.env.SCOPESTACK_API_TOKEN || process.env.NEXT_PUBLIC_SCOPESTACK_API_TOKEN
    const scopeStackUrl = process.env.SCOPESTACK_API_URL || process.env.NEXT_PUBLIC_SCOPESTACK_API_URL
    const scopeStackAccountSlug = process.env.SCOPESTACK_ACCOUNT_SLUG || process.env.NEXT_PUBLIC_SCOPESTACK_ACCOUNT_SLUG

    if (!scopeStackToken) {
      return Response.json({ error: "ScopeStack API token not configured" }, { status: 400 })
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
      // Note: Services will be added via survey workflow
    })
    console.log(`Created project: ${project.name} (ID: ${project.id})`)

    // Step 5: Create survey if questionnaire is available
    let survey = null
    const tags = questionnaireTags || ['technology', content.technology.toLowerCase()]
    
    try {
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

    // Step 6: Generate project document
    let document = null
    try {
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
        url: `https://app.scopestack.io/${user.accountSlug}/projects/${finalProject.id}`,
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
    console.error("ScopeStack push failed:", error)
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ 
      error: "Failed to push content to ScopeStack", 
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
