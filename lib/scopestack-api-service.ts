import axios, { AxiosInstance } from 'axios'

export interface ScopeStackConfig {
  apiToken: string
  baseUrl?: string
  accountSlug?: string
  languageFieldMappings?: Record<string, string>
}

export interface ScopeStackUser {
  accountId: string
  accountSlug: string
  userName: string
}

export interface ScopeStackClient {
  id: string
  name: string
  msaDate?: string | null
  contacts?: ScopeStackContact[]
}

export interface ScopeStackContact {
  id?: string
  name: string
  email: string
  phone?: string
  title?: string
}

export interface ScopeStackProject {
  id: string
  name: string
  status: string
  clientId?: string
  executiveSummary?: string
  contractRevenue?: number
  contractCost?: number
  contractMargin?: number
}

export interface ScopeStackSurvey {
  id: string
  name: string
  status: string
  projectId: string
}

export interface ScopeStackDocument {
  id: string
  status: string
  documentUrl?: string
  templateId: string
  projectId: string
}

export interface ScopeStackService {
  name: string
  description: string
  hours: number
  phase?: string
  position?: number
  serviceDescription?: string
  keyAssumptions?: string
  clientResponsibilities?: string
  outOfScope?: string
  quantity?: number
  serviceType?: string
  paymentFrequency?: string
  taskSource?: string
  lobId?: string | null
  serviceId?: string | null
  subservices?: Array<{
    name: string
    description: string
    hours: number
    serviceDescription?: string
    keyAssumptions?: string
    clientResponsibilities?: string
    outOfScope?: string
  }>
}

export interface ScopeStackQuestionnaire {
  id: string
  name: string
  description?: string
  tagList?: string[]
  questions?: any[]
}

export class ScopeStackApiService {
  private apiToken: string
  private baseUrl: string
  private accountSlug: string | null = null
  private apiScoped: AxiosInstance | null = null
  private apiGeneral: AxiosInstance
  
  // Configurable language field mappings - can be customized per account
  private languageFieldMappings = {
    keyAssumptions: 'assumptions',
    clientResponsibilities: 'customer', // or could be 'deliverables' 
    outOfScope: 'out',
    serviceDescription: 'implementation_language', // primary service description
    // Additional mappings for different content types
    operationalNotes: 'operate',
    deliverables: 'deliverables', 
    designNotes: 'design_language',
    planningNotes: 'planning_language',
    internalNotes: 'internal_only',
    sla: 'service_level_agreement'
  }

  constructor(config: ScopeStackConfig) {
    this.apiToken = config.apiToken
    this.baseUrl = config.baseUrl || 'https://api.scopestack.io'
    this.accountSlug = config.accountSlug || null
    
    // Override language mappings if provided in config
    if (config.languageFieldMappings) {
      this.languageFieldMappings = { ...this.languageFieldMappings, ...config.languageFieldMappings }
    }

    // Create general API instance for non-scoped endpoints
    this.apiGeneral = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
    })

    // If account slug is provided, create scoped instance
    if (this.accountSlug) {
      this.createScopedInstance(this.accountSlug)
    }
  }

  private createScopedInstance(accountSlug: string) {
    this.accountSlug = accountSlug
    this.apiScoped = axios.create({
      baseURL: `${this.baseUrl}/${accountSlug}`,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
    })
  }

  private async ensureAccountSlug(): Promise<void> {
    if (!this.accountSlug || !this.apiScoped) {
      const user = await this.getCurrentUser()
      this.createScopedInstance(user.accountSlug)
    }
  }

  async getCurrentUser(): Promise<ScopeStackUser> {
    try {
      const response = await this.apiGeneral.get('/v1/me')
      const attributes = response.data.data.attributes
      return {
        accountId: attributes['account-id'],
        accountSlug: attributes['account-slug'],
        userName: attributes.name,
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      throw new Error('Failed to authenticate with ScopeStack')
    }
  }

  async searchClients(searchTerm: string): Promise<ScopeStackClient[]> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.get(
        `/v1/clients?filter[active]=true&filter[name]=${encodeURIComponent(searchTerm)}&include=contacts`
      )

      // Create contacts map
      const contactsMap: Record<string, any> = {}
      if (response.data.included) {
        response.data.included.forEach((item: any) => {
          if (item.type === 'contacts') {
            contactsMap[item.id] = item
          }
        })
      }

      return response.data.data.map((client: any) => {
        const contactRefs = client.relationships?.contacts?.data || []
        const contacts = contactRefs
          .map((ref: any) => {
            const contactData = contactsMap[ref.id]
            return contactData
              ? {
                  id: contactData.id,
                  name: contactData.attributes.name,
                  email: contactData.attributes.email,
                  phone: contactData.attributes.phone,
                  title: contactData.attributes.title,
                }
              : null
          })
          .filter((contact: any) => contact !== null)

        return {
          id: client.id,
          name: client.attributes?.name,
          msaDate: client.attributes?.['msa-date'] || null,
          contacts,
        }
      })
    } catch (error) {
      console.error('Error searching clients:', error)
      return []
    }
  }

  async createClient(clientName: string, accountId: string): Promise<ScopeStackClient> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.post('/v1/clients', {
        data: {
          type: 'clients',
          attributes: {
            name: clientName,
            active: true,
          },
          relationships: {
            account: {
              data: {
                type: 'accounts',
                id: accountId,
              },
            },
          },
        },
      })

      return {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        msaDate: response.data.data.attributes['msa-date'],
      }
    } catch (error) {
      console.error('Error creating client:', error)
      throw new Error('Failed to create client')
    }
  }

  async getDefaultRateTable(): Promise<string | null> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.get('/v1/rate-tables?filter[active]=true')
      const defaultTable = response.data.data.find((table: any) => table.attributes.default === true)
      return defaultTable ? defaultTable.id : null
    } catch (error) {
      console.error('Error fetching rate table:', error)
      return null
    }
  }

  async getDefaultPaymentTerm(): Promise<string | null> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.get('/v1/payment-terms?filter[active]=true')
      const defaultTerm = response.data.data.find((term: any) => term.attributes.default === true)
      return defaultTerm ? defaultTerm.id : null
    } catch (error) {
      console.error('Error fetching payment term:', error)
      return null
    }
  }

  async createProject(projectData: {
    name: string
    clientId: string
    accountId: string
    executiveSummary?: string
    services?: ScopeStackService[]
  }): Promise<ScopeStackProject> {
    await this.ensureAccountSlug()

    const rateTableId = await this.getDefaultRateTable()
    const paymentTermId = await this.getDefaultPaymentTerm()

    try {
      const requestData = {
        data: {
          type: 'projects',
          attributes: {
            'project-name': projectData.name,
            'executive-summary': projectData.executiveSummary || '',
          },
          relationships: {
            client: {
              data: {
                type: 'clients',
                id: projectData.clientId,
              },
            },
            account: {
              data: {
                type: 'accounts',
                id: projectData.accountId,
              },
            },
            ...(rateTableId && {
              'rate-table': {
                data: {
                  type: 'rate-tables',
                  id: rateTableId,
                },
              },
            }),
            ...(paymentTermId && {
              'payment-term': {
                data: {
                  type: 'payment-terms',
                  id: paymentTermId,
                },
              },
            }),
          },
        },
      }

      const response = await this.apiScoped!.post('/v1/projects', requestData)

      const project = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        status: response.data.data.attributes.status,
        clientId: projectData.clientId,
        executiveSummary: response.data.data.attributes['executive-summary'],
      }

      // Note: Services will be added via survey recommendations, not directly

      return project
    } catch (error) {
      console.error('Error creating project:', error)
      throw new Error('Failed to create project')
    }
  }

  /**
   * Format text with line breaks after sentences
   */
  private formatSentences(text: string): string {
    if (!text || typeof text !== 'string') return text
    
    // Split on sentence endings (., !, ?) followed by space and capital letter
    // This handles cases like "All hardware components are available. Network prerequisites are met."
    return text
      .split(/([.!?])\s+(?=[A-Z])/)
      .reduce((result, part, index, array) => {
        if (index % 2 === 0) {
          // This is the sentence text
          result += part
        } else {
          // This is the punctuation
          result += part
          // Add line break after punctuation if there's more content
          if (index < array.length - 1) {
            result += '\n'
          }
        }
        return result
      }, '')
      .trim()
  }

  /**
   * Build languages object using configured field mappings
   */
  private buildLanguagesObject(service: any): Record<string, string> {
    const languages: Record<string, string> = {}
    
    // Map our standard fields to account-specific language field names with sentence formatting
    if (service.keyAssumptions) {
      languages[this.languageFieldMappings.keyAssumptions] = this.formatSentences(service.keyAssumptions)
    }
    if (service.clientResponsibilities) {
      languages[this.languageFieldMappings.clientResponsibilities] = this.formatSentences(service.clientResponsibilities)
    }
    if (service.outOfScope) {
      languages[this.languageFieldMappings.outOfScope] = this.formatSentences(service.outOfScope)
    }
    
    // Put main service description in implementation_language field if available
    if (service.serviceDescription && this.languageFieldMappings.serviceDescription) {
      languages[this.languageFieldMappings.serviceDescription] = this.formatSentences(service.serviceDescription)
    }
    
    return languages
  }

  /**
   * Configure language field mappings for this account
   */
  public setLanguageFieldMappings(mappings: Record<string, string>): void {
    this.languageFieldMappings = { ...this.languageFieldMappings, ...mappings }
  }

  /**
   * Discover active language fields for the current account
   */
  public async discoverLanguageFields(): Promise<any[]> {
    await this.ensureAccountSlug()
    
    try {
      const response = await this.apiScoped!.get('/v1/language-fields?filter[active]=true')
      const languageFields = response.data.data || []
      
      console.log(`📋 Discovered ${languageFields.length} active language fields for account`)
      languageFields.forEach((field: any) => {
        console.log(`  - ${field.attributes?.['sow-language'] || field.attributes?.name || 'Unknown'}: ${field.attributes?.label || 'No label'}`)
      })
      
      return languageFields
    } catch (error) {
      console.error('Failed to discover language fields:', error)
      return []
    }
  }

  /**
   * Auto-configure language field mappings based on discovered fields
   */
  public async autoConfigureLanguageFields(): Promise<void> {
    const languageFields = await this.discoverLanguageFields()
    
    if (languageFields.length === 0) {
      console.warn('⚠️ No language fields discovered, using default configuration')
      return
    }

    // Create a mapping from discovered fields
    const discoveredMappings: Record<string, string> = {}
    
    languageFields.forEach((field: any) => {
      const sowLanguage = field.attributes?.['sow-language'] || field.attributes?.name
      const label = field.attributes?.label?.toLowerCase() || ''
      
      if (!sowLanguage) return

      // Map based on common patterns in field labels/names and sow_language values
      const searchText = `${label} ${sowLanguage}`.toLowerCase()
      
      // Priority mapping - check exact matches first
      if (sowLanguage === 'assumptions' || searchText.includes('assumption')) {
        discoveredMappings.keyAssumptions = sowLanguage
      } else if (sowLanguage === 'customer' || searchText.includes('client') || searchText.includes('customer') || searchText.includes('responsibility')) {
        discoveredMappings.clientResponsibilities = sowLanguage
      } else if (sowLanguage === 'out' || searchText.includes('out of scope') || searchText.includes('exclusion')) {
        discoveredMappings.outOfScope = sowLanguage
      } else if (sowLanguage === 'implementation_language' || searchText.includes('implementation') || (searchText.includes('service') && searchText.includes('description'))) {
        discoveredMappings.serviceDescription = sowLanguage
      } else if (sowLanguage === 'deliverables' || searchText.includes('deliverable')) {
        discoveredMappings.deliverables = sowLanguage
      } else if (sowLanguage === 'operate' || searchText.includes('operate') || searchText.includes('operational')) {
        discoveredMappings.operationalNotes = sowLanguage
      } else if (sowLanguage === 'design_language' || searchText.includes('design')) {
        discoveredMappings.designNotes = sowLanguage
      } else if (sowLanguage === 'planning_language' || searchText.includes('planning')) {
        discoveredMappings.planningNotes = sowLanguage
      } else if (sowLanguage === 'internal_only' || searchText.includes('internal')) {
        discoveredMappings.internalNotes = sowLanguage
      } else if (sowLanguage === 'service_level_agreement' || searchText.includes('sla') || searchText.includes('service level')) {
        discoveredMappings.sla = sowLanguage
      } else if (sowLanguage === 'sow_language' || searchText.includes('sow')) {
        // SOW Language could be used for general service description if no implementation_language found
        if (!discoveredMappings.serviceDescription) {
          discoveredMappings.serviceDescription = sowLanguage
        }
      }
    })

    // Apply the discovered mappings
    this.languageFieldMappings = { ...this.languageFieldMappings, ...discoveredMappings }
    
    console.log('✅ Auto-configured language field mappings:', discoveredMappings)
  }

  async addServicesToProject(projectId: string, services: ScopeStackService[]): Promise<any[]> {
    await this.ensureAccountSlug()
    
    const createdServices: any[] = []
    
    for (let i = 0; i < services.length; i++) {
      const service = services[i]
      try {
        const requestData = {
          data: {
            type: 'project-services',
            attributes: {
              name: service.name,
              quantity: 1, // Always set quantity to 1
              'override-hours': service.hours || service.quantity || 0, // Map unit hours to override-hours
              'task-source': service.taskSource || 'custom',
              'service-type': service.serviceType || 'professional_services',
              'payment-frequency': service.paymentFrequency || 'one_time',
              position: service.position || i,
              'service-description': service.description || '',
              'languages': this.buildLanguagesObject(service),
            },
            relationships: {
              project: {
                data: {
                  id: parseInt(projectId.toString()),
                  type: 'projects'
                }
              }
            }
          }
        }

        console.log(`Adding service ${service.name} with quantity=1 and override-hours=${service.hours || 0}`)
        console.log('Service request data:', JSON.stringify(requestData, null, 2))
        const response = await this.apiScoped!.post('/v1/project-services', requestData)
        const createdService = response.data.data
        console.log(`Successfully added service ${service.name} (ID: ${createdService.id})`)
        
        // Add to our return array
        createdServices.push({
          id: createdService.id,
          name: createdService.attributes.name,
          hours: createdService.attributes['override-hours'],
          phase: service.phase, // Keep original phase from input
          type: createdService.attributes['service-type']
        })

        // Add subservices if they exist
        if (service.subservices && Array.isArray(service.subservices) && service.subservices.length > 0) {
          console.log(`Adding ${service.subservices.length} subservices for ${service.name}`)
          await this.addSubservicesToService(createdService.id, service.subservices)
        }
      } catch (error: any) {
        console.error(`Error adding service ${service.name}:`, error)
        if (error.response?.data) {
          console.error('Error details:', JSON.stringify(error.response.data, null, 2))
        }
        throw error // Re-throw to handle at higher level
      }
    }
    
    return createdServices
  }

  async addSubservicesToService(parentServiceId: string, subservices: any[]): Promise<void> {
    await this.ensureAccountSlug()
    
    for (let i = 0; i < subservices.length; i++) {
      const subservice = subservices[i]
      try {
        const requestData = {
          data: {
            type: 'project-subservices',
            attributes: {
              name: subservice.name || `Subservice ${i + 1}`,
              quantity: 1, // Always set quantity to 1
              'override-hours': subservice.hours || 0, // Map unit hours to override-hours
              'service-description': subservice.description || '',
              'languages': this.buildLanguagesObject(subservice),
              'task-source': 'custom',
            },
            relationships: {
              'project-service': {
                data: {
                  id: parentServiceId,
                  type: 'project-services'
                }
              }
            }
          }
        }

        console.log(`Adding subservice ${subservice.name} with quantity=1 and override-hours=${subservice.hours || 0} to service ${parentServiceId}`)
        await this.apiScoped!.post('/v1/project-subservices', requestData)
        console.log(`Successfully added subservice ${subservice.name}`)
      } catch (error: any) {
        console.error(`Error adding subservice ${subservice.name}:`, error)
        if (error.response?.data) {
          console.error('Subservice error details:', JSON.stringify(error.response.data, null, 2))
        }
        // Don't re-throw subservice errors - just log them and continue
      }
    }
  }

  async createServiceInCatalog(serviceData: {
    name: string
    description: string
    baseHours?: number
    serviceType?: string
    tags?: string[]
  }): Promise<any> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.post('/v1/services', {
        data: {
          type: 'services',
          attributes: {
            name: serviceData.name,
            description: serviceData.description,
            'base-hours': serviceData.baseHours || 0,
            'service-type': serviceData.serviceType || 'professional_services',
            'tag-list': serviceData.tags || [],
            active: true,
            published: true,
          },
        },
      })
      return response.data.data
    } catch (error) {
      console.error('Error creating service in catalog:', error)
      throw new Error('Failed to create service in catalog')
    }
  }

  async createQuestionnaireFromContent(questionnaireData: {
    name: string
    description: string
    questions: any[]
    tags?: string[]
  }): Promise<any> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.post('/v1/questionnaires', {
        data: {
          type: 'questionnaires',
          attributes: {
            name: questionnaireData.name,
            description: questionnaireData.description,
            'tag-list': questionnaireData.tags || [],
            questions: questionnaireData.questions,
            active: true,
            published: true,
          },
        },
      })
      return response.data.data
    } catch (error) {
      console.error('Error creating questionnaire:', error)
      throw new Error('Failed to create questionnaire')
    }
  }

  async getServicesFromCatalog(tag?: string): Promise<any[]> {
    await this.ensureAccountSlug()
    try {
      let url = '/v1/services?filter[active]=true&filter[published]=true'
      if (tag) {
        url += `&filter[tag-list]=${encodeURIComponent(tag)}`
      }

      const response = await this.apiScoped!.get(url)
      return response.data.data
    } catch (error) {
      console.error('Error fetching services from catalog:', error)
      return []
    }
  }

  async addCatalogServiceToProject(projectId: string, serviceId: string, customization?: {
    quantity?: number
    description?: string
    position?: number
  }): Promise<void> {
    await this.ensureAccountSlug()
    try {
      const requestData = {
        data: {
          type: 'project-services',
          attributes: {
            quantity: customization?.quantity || 0,
            position: customization?.position || 0,
            'service-type': 'professional_services',
            'payment-frequency': 'one_time',
            'task-source': 'service', // Using 'service' when adding from catalog
            'override-hours': 0,
            'total-hours': customization?.quantity || 0,
            'extended-hours': 0,
            'actual-hours': 0,
            'lob-id': 0,
            languages: {},
            'calculated-pricing': {}
          },
          relationships: {
            project: {
              links: { self: 'string', related: 'string' },
              data: { id: parseInt(projectId), type: 'projects' }
            },
            service: {
              links: { self: 'string', related: 'string' },
              data: { id: parseInt(serviceId), type: 'services' }
            },
            'project-location': { links: { self: 'string', related: 'string' }, data: null },
            'project-phase': { links: { self: 'string', related: 'string' }, data: null },
            'project-resource': { links: { self: 'string', related: 'string' }, data: null },
            resource: { links: { self: 'string', related: 'string' }, data: null },
            lob: { links: { self: 'string', related: 'string' }, data: null },
            'project-subservices': { links: { self: 'string', related: 'string' }, data: [] },
            notes: { links: { self: 'string', related: 'string' }, data: [] },
            'allocated-governances': { links: { self: 'string', related: 'string' }, data: null }
          }
        }
      }

      await this.apiScoped!.post('/v1/project-services', requestData)
      console.log(`Successfully added catalog service ${serviceId} to project ${projectId}`)
    } catch (error: any) {
      console.error('Error adding catalog service to project:', error)
      if (error.response?.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2))
      }
      throw error
    }
  }

  async getQuestionnaires(tag?: string): Promise<ScopeStackQuestionnaire[]> {
    await this.ensureAccountSlug()
    try {
      let url = '/v1/questionnaires?filter[active]=true&filter[published]=true'
      if (tag) {
        url += `&filter[tag-list]=${encodeURIComponent(tag)}`
      }

      const response = await this.apiScoped!.get(url)
      return response.data.data.map((q: any) => ({
        id: q.id,
        name: q.attributes.name,
        description: q.attributes.description,
        tagList: q.attributes['tag-list'],
      }))
    } catch (error) {
      console.error('Error fetching questionnaires:', error)
      return []
    }
  }

  async createSurvey(
    projectId: string,
    questionnaireId: string,
    surveyData: {
      name: string
      responses: Record<string, any>
      accountId: string
    }
  ): Promise<ScopeStackSurvey> {
    await this.ensureAccountSlug()
    try {
      const requestData = {
        data: {
          type: 'surveys',
          attributes: {
            name: `${surveyData.name} Survey`,
            responses: surveyData.responses,
          },
          relationships: {
            account: { data: { id: surveyData.accountId, type: 'accounts' } },
            questionnaire: { data: { id: questionnaireId, type: 'questionnaires' } },
            project: { data: { id: projectId, type: 'projects' } },
          },
        },
      }

      const response = await this.apiScoped!.post('/v1/surveys', requestData)
      return {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        status: response.data.data.attributes.status,
        projectId,
      }
    } catch (error) {
      console.error('Error creating survey:', error)
      throw new Error('Failed to create survey')
    }
  }

  async calculateSurvey(surveyId: string): Promise<void> {
    await this.ensureAccountSlug()
    try {
      await this.apiScoped!.put(`/v1/surveys/${surveyId}/calculate`)
      
      // Poll for calculation completion
      let status = 'calculating'
      let attempts = 0
      const maxAttempts = 10

      while (status === 'calculating' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const response = await this.apiScoped!.get(`/v1/surveys/${surveyId}`)
        status = response.data.data.attributes.status
        attempts++
      }
    } catch (error) {
      console.error('Error calculating survey:', error)
      throw new Error('Failed to calculate survey')
    }
  }

  async applySurveyRecommendations(surveyId: string): Promise<void> {
    await this.ensureAccountSlug()
    try {
      await this.apiScoped!.put(`/v1/surveys/${surveyId}/apply`)
    } catch (error) {
      console.error('Error applying recommendations:', error)
      throw new Error('Failed to apply survey recommendations')
    }
  }

  async getDocumentTemplates(): Promise<Array<{ id: string; name: string }>> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.get('/v1/document-templates?filter[active]=true')
      return response.data.data.map((template: any) => ({
        id: template.id,
        name: template.attributes.name,
      }))
    } catch (error) {
      console.error('Error fetching document templates:', error)
      return []
    }
  }

  async createProjectDocument(projectId: string, templateId?: string): Promise<ScopeStackDocument> {
    await this.ensureAccountSlug()
    
    // Get first available template if not provided
    if (!templateId) {
      const templates = await this.getDocumentTemplates()
      if (templates.length === 0) {
        throw new Error('No document templates available')
      }
      templateId = templates[0].id
    }

    try {
      const response = await this.apiScoped!.post('/v1/project-documents', {
        data: {
          type: 'project-documents',
          attributes: {
            'template-id': templateId,
            'document-type': 'sow',
            'force-regeneration': true,
            'generate-pdf': true,
          },
          relationships: {
            project: {
              data: {
                type: 'projects',
                id: projectId.toString(),
              },
            },
          },
        },
      })

      const document = {
        id: response.data.data.id,
        status: response.data.data.attributes.status,
        documentUrl: response.data.data.attributes['document-url'],
        templateId,
        projectId,
      }

      // Poll for document generation completion
      if (!document.documentUrl) {
        document.documentUrl = await this.pollForDocumentUrl(projectId)
      }

      return document
    } catch (error) {
      console.error('Error creating document:', error)
      throw new Error('Failed to create project document')
    }
  }

  private async pollForDocumentUrl(projectId: string): Promise<string | undefined> {
    const maxAttempts = 20
    const delay = 2000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.apiScoped!.get(
          `/v1/project-documents?filter[project]=${projectId}&include=project`
        )

        if (response.data.data && response.data.data.length > 0) {
          const document = response.data.data[0]
          const documentUrl = document.attributes['document-url']
          const status = document.attributes.status

          if (status === 'finished' || documentUrl) {
            return documentUrl
          }
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`Error polling for document (attempt ${attempt}):`, error)
      }
    }

    return undefined
  }

  async updateProjectExecutiveSummary(projectId: string, summary: string): Promise<void> {
    await this.ensureAccountSlug()
    try {
      await this.apiScoped!.patch(`/v1/projects/${projectId}`, {
        data: {
          id: projectId,
          type: 'projects',
          attributes: {
            'executive-summary': summary,
          },
        },
      })
    } catch (error) {
      console.error('Error updating executive summary:', error)
    }
  }

  async getProjectDetails(projectId: string): Promise<ScopeStackProject> {
    await this.ensureAccountSlug()
    try {
      const response = await this.apiScoped!.get(`/v1/projects/${projectId}`)
      const attributes = response.data.data.attributes

      return {
        id: response.data.data.id,
        name: attributes.name,
        status: attributes.status,
        executiveSummary: attributes['executive-summary'],
        contractRevenue: attributes['contract-revenue'],
        contractCost: attributes['contract-cost'],
        contractMargin: attributes['contract-margin'],
      }
    } catch (error) {
      console.error('Error fetching project details:', error)
      throw new Error('Failed to fetch project details')
    }
  }
}