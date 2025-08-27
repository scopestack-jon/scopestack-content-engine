import axios, { AxiosInstance } from 'axios'

export interface ScopeStackConfig {
  apiToken: string
  baseUrl?: string
  accountSlug?: string
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

  constructor(config: ScopeStackConfig) {
    this.apiToken = config.apiToken
    this.baseUrl = config.baseUrl || 'https://api.scopestack.io'
    this.accountSlug = config.accountSlug || null

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

  async addServicesToProject(projectId: string, services: ScopeStackService[]): Promise<void> {
    await this.ensureAccountSlug()
    
    for (let i = 0; i < services.length; i++) {
      const service = services[i]
      try {
        await this.apiScoped!.post('/v1/project-services', {
          data: {
            type: 'project-services',
            attributes: {
              name: service.name,
              description: service.description,
              'total-hours': service.hours,
              position: service.position || i + 1,
              'service-description': service.serviceDescription || service.description,
              'key-assumptions': service.keyAssumptions || '',
              'client-responsibilities': service.clientResponsibilities || '',
              'out-of-scope': service.outOfScope || '',
              active: true,
            },
            relationships: {
              project: {
                data: {
                  type: 'projects',
                  id: projectId,
                },
              },
            },
          },
        })
      } catch (error) {
        console.error(`Error adding service ${service.name}:`, error)
      }
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