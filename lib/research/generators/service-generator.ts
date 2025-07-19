// AI-driven Service Generation
// Generates professional services based on research findings

import { getOpenRouterClient } from '../api/openrouter-client';
import { ResearchData, Service } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class ServiceGenerator {
  private client = getOpenRouterClient();

  /**
   * Generates research-driven professional services for project scoping
   */
  async generateServicesFromResearch(researchData: ResearchData, userRequest: string): Promise<Service[]> {
    const technology = extractTechnologyName(userRequest);
    
    try {
      // Extract key insights from research to inform service generation
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
5. Include comprehensive scope language for professional services

Return ONLY a JSON array of services in this exact format:
[
  {
    "name": "Service Name",
    "description": "Brief service description",
    "serviceDescription": "Detailed 2-3 sentence description of what this service provides, based on research findings",
    "keyAssumptions": "Key assumptions for this service based on typical project requirements found in research",
    "clientResponsibilities": "What the client needs to provide or do for this service to be successful",
    "outOfScope": "What is specifically not included in this service scope",
    "hours": 40,
    "phase": "Phase Name",
    "subservices": [
      {
        "name": "Subservice Name", 
        "description": "Subservice description",
        "serviceDescription": "Detailed description of this subservice based on research best practices",
        "keyAssumptions": "Assumptions specific to this subservice",
        "clientResponsibilities": "Client responsibilities for this subservice",
        "outOfScope": "What's not included in this subservice",
        "hours": 15
      }
    ]
  }
]

NO markdown, NO explanations, ONLY the JSON array.`;

      // Call OpenRouter API to generate research-driven services
      const aiContent = await this.client.generateWithRetry(
        'anthropic/claude-3.5-sonnet',
        prompt
      );

      if (!aiContent) {
        console.warn('No AI response content for services, using fallback');
        return this.getFallbackServices(technology);
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
        return this.getFallbackServices(technology);
      }

      // Validate the structure
      if (Array.isArray(services) && services.length > 0) {
        // Ensure all services have required fields
        const validatedServices: Service[] = services.map((s: any, index: number) => ({
          name: s.name || s.service || `${technology} Service ${index + 1}`,
          description: s.description || `Service description for ${technology}`,
          serviceDescription: s.serviceDescription || `This service provides comprehensive ${s.name || 'implementation'} for ${technology} based on industry best practices and research findings.`,
          keyAssumptions: s.keyAssumptions || `Client will provide timely access to required systems and stakeholders. Existing infrastructure meets minimum requirements for ${technology}.`,
          clientResponsibilities: s.clientResponsibilities || `Provide access to systems and stakeholders. Make technical staff available for consultation. Provide existing documentation and requirements.`,
          outOfScope: s.outOfScope || `Hardware procurement and infrastructure setup are not included. Training beyond standard knowledge transfer is excluded. Support for third-party integrations not directly related to ${technology}.`,
          hours: typeof s.hours === 'number' ? s.hours : 40,
          phase: s.phase || `Phase ${index + 1}`,
          subservices: Array.isArray(s.subservices) ? s.subservices.map((sub: any) => ({
            name: sub.name || 'Subservice',
            description: sub.description || 'Subservice description',
            serviceDescription: sub.serviceDescription || `This subservice provides essential ${sub.name || 'implementation'} activities for ${technology} according to industry best practices.`,
            keyAssumptions: sub.keyAssumptions || `Required access and documentation will be provided. Work will be performed during standard business hours unless otherwise specified.`,
            clientResponsibilities: sub.clientResponsibilities || `Provide timely access to required systems. Make appropriate staff available for meetings and testing.`,
            outOfScope: sub.outOfScope || `Custom development beyond standard configuration. Hardware procurement and setup.`,
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
    return this.getFallbackServices(technology);
  }

  /**
   * Fallback services when AI generation fails
   */
  private getFallbackServices(technology: string): Service[] {
    return [
      {
        name: `${technology} Requirements Assessment`,
        description: `Assessment of current environment and ${technology} requirements`,
        serviceDescription: `This service provides a comprehensive assessment of your current environment and detailed requirements gathering for ${technology} implementation. Our team will conduct stakeholder interviews, document existing systems, and identify key success factors for your project.`,
        keyAssumptions: `Client stakeholders will be available for requirements gathering sessions. Existing system documentation will be provided where available. Current infrastructure meets minimum requirements for ${technology} implementation.`,
        clientResponsibilities: `Provide access to key stakeholders and subject matter experts. Share existing documentation, network diagrams, and system configurations. Make technical staff available for interviews and system access.`,
        outOfScope: `Hardware procurement and infrastructure upgrades are not included. Business process reengineering beyond ${technology} implementation scope. Integration with systems not directly related to ${technology}.`,
        hours: 40,
        phase: "Assessment",
        subservices: [
          {
            name: "Current State Analysis",
            description: `Analysis of existing infrastructure and systems`,
            serviceDescription: `This subservice provides detailed analysis of your current infrastructure, identifying integration points, potential challenges, and baseline configurations for ${technology} implementation.`,
            keyAssumptions: `Access to current systems and documentation will be provided. Technical staff will be available for system reviews and questions.`,
            clientResponsibilities: `Provide access to existing systems and environments. Make technical documentation available. Ensure appropriate staff are available for consultation.`,
            outOfScope: `Remediation of issues found during analysis. Upgrades to existing systems to meet requirements.`,
            hours: 20
          },
          {
            name: "Requirements Gathering",
            description: `Detailed requirements gathering and documentation`,
            serviceDescription: `This subservice focuses on gathering detailed functional and technical requirements through stakeholder interviews, workshops, and documentation review.`,
            keyAssumptions: `Key stakeholders will be available for requirements sessions. Business requirements are generally understood by client stakeholders.`,
            clientResponsibilities: `Make stakeholders available for requirements gathering sessions. Provide existing requirements documentation if available.`,
            outOfScope: `Business process design beyond ${technology} implementation requirements.`,
            hours: 20
          }
        ]
      },
      {
        name: `${technology} Implementation`,
        description: `Core implementation and configuration of ${technology}`,
        serviceDescription: `This service provides the core implementation and configuration of ${technology} according to gathered requirements and industry best practices. Includes system setup, configuration, and initial testing.`,
        keyAssumptions: `Required infrastructure and access will be provided. Configuration requirements are clearly defined. Test environments are available.`,
        clientResponsibilities: `Provide required infrastructure and system access. Make technical staff available for configuration validation. Participate in testing activities.`,
        outOfScope: `Custom development beyond standard configuration. Integration with third-party systems not directly related to core ${technology} functionality.`,
        hours: 80,
        phase: "Implementation",
        subservices: [
          {
            name: "System Installation and Setup",
            description: `Installation and initial setup of ${technology}`,
            serviceDescription: `This subservice covers the installation and initial configuration of ${technology} components according to requirements and best practices.`,
            keyAssumptions: `Infrastructure meets requirements. Required access and credentials will be provided.`,
            clientResponsibilities: `Provide system access and credentials. Ensure infrastructure readiness.`,
            outOfScope: `Infrastructure provisioning and hardware setup.`,
            hours: 40
          },
          {
            name: "Configuration and Testing",
            description: `Detailed configuration and initial testing`,
            serviceDescription: `This subservice provides detailed configuration of ${technology} features and comprehensive testing to ensure proper functionality.`,
            keyAssumptions: `Test scenarios and acceptance criteria are defined. Test data is available.`,
            clientResponsibilities: `Provide test data and scenarios. Participate in testing validation.`,
            outOfScope: `Performance testing beyond basic functionality validation.`,
            hours: 40
          }
        ]
      },
      {
        name: `${technology} Knowledge Transfer`,
        description: `Knowledge transfer and documentation for ${technology}`,
        serviceDescription: `This service provides comprehensive knowledge transfer to client staff including documentation, training materials, and hands-on sessions to ensure successful ongoing management of ${technology}.`,
        keyAssumptions: `Client staff will be available for knowledge transfer sessions. Basic technical competency exists within client team.`,
        clientResponsibilities: `Make appropriate technical staff available for training sessions. Provide feedback on documentation and training materials.`,
        outOfScope: `Formal training courses beyond knowledge transfer sessions. Long-term support and maintenance.`,
        hours: 24,
        phase: "Knowledge Transfer",
        subservices: [
          {
            name: "Documentation Creation",
            description: `Creation of system documentation and runbooks`,
            serviceDescription: `This subservice creates comprehensive documentation including system configuration, operational procedures, and troubleshooting guides.`,
            keyAssumptions: `Documentation standards and templates will be provided if required. System access for documentation validation.`,
            clientResponsibilities: `Review and provide feedback on documentation. Provide documentation standards if required.`,
            outOfScope: `Translation of documentation into multiple languages. Video training materials.`,
            hours: 12
          },
          {
            name: "Staff Training",
            description: `Hands-on training for client staff`,
            serviceDescription: `This subservice provides hands-on training sessions for client staff covering system operation, maintenance, and troubleshooting procedures.`,
            keyAssumptions: `Appropriate staff will be available for training sessions. Training environment is available for hands-on practice.`,
            clientResponsibilities: `Make technical staff available for training sessions. Provide training environment access.`,
            outOfScope: `Certification training programs. Advanced troubleshooting beyond standard operational procedures.`,
            hours: 12
          }
        ]
      }
    ];
  }
}

// Singleton instance
let serviceGeneratorInstance: ServiceGenerator | null = null;

export function getServiceGenerator(): ServiceGenerator {
  if (!serviceGeneratorInstance) {
    serviceGeneratorInstance = new ServiceGenerator();
  }
  return serviceGeneratorInstance;
}