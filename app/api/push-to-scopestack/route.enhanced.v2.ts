import type { NextRequest } from "next/server"
import { ScopeStackApiService, ScopeStackService } from "@/lib/scopestack-api-service"
import type { GeneratedContent, Service, Question, ResearchSource } from "@/lib/research/types/interfaces"

interface PushToScopeStackRequest {
  content: GeneratedContent
  clientName?: string
  projectName?: string
  questionnaireTags?: string[]
  
  // Workflow control flags
  workflow?: 'project-with-services' | 'catalog-only' | 'full'
  skipSurvey?: boolean
  skipDocument?: boolean
  skipCatalogCreation?: boolean
  useCustomServices?: boolean // If true, adds services as custom instead of from catalog
}

interface PushToScopeStackResponse {
  success: boolean
  workflow: string
  project?: any
  client?: any
  survey?: any
  document?: any
  catalogServices?: any[]
  questionnaire?: any
  projectServices?: any[]
  metadata: any
  warnings?: string[]
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
      quantity: service.hours || 0, // Use hours as quantity
      phase: service.phase || 'Implementation',
      position: index + 1,
      serviceDescription: service.serviceDescription || service.description || 'Service description',
      keyAssumptions: service.keyAssumptions || '',
      clientResponsibilities: service.clientResponsibilities || '',
      outOfScope: service.outOfScope || '',
      serviceType: 'professional_services',
      paymentFrequency: 'one_time',
      taskSource: 'custom',
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
    const {
      content,
      clientName,
      projectName,
      questionnaireTags,
      workflow = 'project-with-services',
      skipSurvey = false,
      skipDocument = false,
      skipCatalogCreation = false,
      useCustomServices = true
    }: PushToScopeStackRequest = await request.json()

    const warnings: string[] = []

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
    
    const response: PushToScopeStackResponse = {
      success: true,
      workflow,
      metadata: {
        technology: content.technology,
        totalHours: content.totalHours,
        serviceCount: content.services?.length || 0,
        questionCount: content.questions?.length || 0,
        sourceCount: content.sources?.length || 0,
        generatedAt: new Date().toISOString(),
      },
      warnings,
    }

    // WORKFLOW: Catalog Only - Create services and questionnaires in the catalog
    if (workflow === 'catalog-only') {
      console.log('Running CATALOG-ONLY workflow...')
      
      // Create services in catalog
      if (!skipCatalogCreation && content.services?.length > 0) {
        console.log('Creating services in catalog...')
        const catalogServices = []
        
        for (const service of content.services) {
          try {
            const catalogService = await scopeStackApi.createServiceInCatalog({
              name: service.name || 'Unnamed Service',
              description: service.description || '',
              baseHours: service.hours,
              serviceType: 'professional_services',
              tags: [content.technology.toLowerCase(), service.phase?.toLowerCase()].filter(Boolean)
            })
            catalogServices.push(catalogService)
            console.log(`Created catalog service: ${catalogService.attributes.name}`)
          } catch (error) {
            console.error(`Failed to create catalog service: ${service.name}`, error)
            warnings.push(`Failed to create catalog service: ${service.name}`)
          }
        }
        
        response.catalogServices = catalogServices
      }
      
      // Create questionnaire from questions
      if (content.questions?.length > 0) {
        console.log('Creating questionnaire from content...')
        try {
          const questionnaire = await scopeStackApi.createQuestionnaireFromContent({
            name: `${content.technology} Assessment`,
            description: `Automated questionnaire for ${content.technology} implementation`,
            questions: content.questions,
            tags: questionnaireTags || [content.technology.toLowerCase()]
          })
          response.questionnaire = questionnaire
          console.log(`Created questionnaire: ${questionnaire.attributes.name}`)
        } catch (error) {
          console.error('Failed to create questionnaire:', error)
          warnings.push('Failed to create questionnaire')
        }
      }
      
      return Response.json(response)
    }

    // WORKFLOW: Project with Services (default) or Full
    console.log(`Running ${workflow.toUpperCase()} workflow...`)
    
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
    response.client = { id: client.id, name: client.name }

    // Step 3: Create project
    console.log('Step 3: Creating project...')
    const finalProjectName = projectName || `${content.technology} Implementation - ${new Date().toLocaleDateString()}`
    const executiveSummary = generateExecutiveSummary(
      content.technology,
      content.services || [],
      content.sources || [],
      clientName
    )
    
    const project = await scopeStackApi.createProject({
      name: finalProjectName,
      clientId: client.id,
      accountId: user.accountId,
      executiveSummary,
    })
    console.log(`Created project: ${project.name} (ID: ${project.id})`)
    
    // Step 4: Add services to project
    if (content.services?.length > 0) {
      console.log('Step 4: Adding services to project...')
      
      if (useCustomServices) {
        // Add services as custom services
        console.log('Adding custom services directly to project...')
        const scopeStackServices = transformServicesToScopeStack(content.services)
        
        try {
          await scopeStackApi.addServicesToProject(project.id, scopeStackServices)
          response.projectServices = scopeStackServices
          console.log(`Added ${scopeStackServices.length} custom services to project`)
        } catch (error) {
          console.error('Failed to add custom services:', error)
          warnings.push('Some services failed to add to the project')
        }
      } else {
        // First create services in catalog if needed, then add to project
        if (workflow === 'full' && !skipCatalogCreation) {
          console.log('Creating services in catalog first...')
          const catalogServices = []
          
          for (const service of content.services) {
            try {
              const catalogService = await scopeStackApi.createServiceInCatalog({
                name: service.name || 'Unnamed Service',
                description: service.description || '',
                baseHours: service.hours,
                serviceType: 'professional_services',
                tags: [content.technology.toLowerCase()]
              })
              catalogServices.push(catalogService)
              
              // Add catalog service to project
              await scopeStackApi.addCatalogServiceToProject(
                project.id,
                catalogService.id,
                { quantity: service.hours, position: catalogServices.length }
              )
              console.log(`Added catalog service to project: ${catalogService.attributes.name}`)
            } catch (error) {
              console.error(`Failed to create/add catalog service: ${service.name}`, error)
              warnings.push(`Failed to create/add catalog service: ${service.name}`)
            }
          }
          
          response.catalogServices = catalogServices
        }
      }
    }

    // Step 5: Create survey if not skipped and questionnaire is available
    if (!skipSurvey) {
      let survey = null
      const tags = questionnaireTags || ['technology', content.technology.toLowerCase()]
      
      try {
        console.log('Step 5: Creating survey...')
        const questionnaires = await scopeStackApi.getQuestionnaires(tags[0])
        
        if (questionnaires.length > 0) {
          const questionnaire = questionnaires[0]
          console.log(`Using questionnaire: ${questionnaire.name}`)
          
          const surveyResponses = transformQuestionsToSurveyResponses(content.questions || [])
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
          
          response.survey = {
            id: survey.id,
            name: survey.name,
            status: survey.status,
          }
        } else {
          console.log('No questionnaires found, skipping survey creation')
          warnings.push('No questionnaires found for survey creation')
        }
      } catch (error) {
        console.error('Survey creation failed:', error)
        warnings.push('Survey creation failed')
      }
    }

    // Step 6: Generate project document if not skipped
    if (!skipDocument) {
      try {
        console.log('Step 6: Generating project document...')
        const document = await scopeStackApi.createProjectDocument(project.id)
        response.document = {
          id: document.id,
          url: document.documentUrl,
          status: document.status,
        }
        console.log('Document generated successfully')
      } catch (error) {
        console.error('Document generation failed:', error)
        warnings.push('Document generation failed')
      }
    }

    // Step 7: Get final project details with pricing
    console.log('Step 7: Fetching final project details...')
    const finalProject = await scopeStackApi.getProjectDetails(project.id)
    
    response.project = {
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