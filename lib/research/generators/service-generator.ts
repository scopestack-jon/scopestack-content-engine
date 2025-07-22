import { OpenRouterClient } from '../api/openrouter-client';
import { extractTechnologyName } from '../utils/response-processor';
import type { Service } from '../types/interfaces';

export class ServiceGenerator {
  constructor(private client: OpenRouterClient) {}

  /**
   * Generate services based on research data - NO fallbacks, purely research-driven
   */
  async generateServicesFromResearch(researchData: any, userRequest: string): Promise<Service[]> {
    const technology = extractTechnologyName(userRequest);
    
    try {
      // Extract key insights from research to inform service generation
      const researchContext = {
        sources: researchData.sources || [],
        summary: researchData.researchSummary || '',
        insights: researchData.keyInsights || [],
        userRequest: userRequest
      };
      
      // Create a comprehensive prompt for AI to generate research-driven services
      const prompt = `Based on this research about "${userRequest}", generate professional services with comprehensive phase coverage and sufficient content depth.

Research Context:
- User Request: ${userRequest}
- Research Summary: ${researchContext.summary}
- Key Insights: ${researchContext.insights.join(', ')}
- Source Topics: ${researchContext.sources.map((s: any) => s.title).slice(0, 5).join(', ')}

REQUIRED SERVICE STRUCTURE - Generate EXACTLY this pattern:
1. ONE comprehensive service that covers ALL project phases (Planning, Design, Implementation, Testing, Training) with 3+ subservices each
2. THREE additional detailed implementation-focused services, each with 3+ subservices

This should result in:
- Total of 4 services minimum
- First service covers full project lifecycle (5 phases × 3 subservices = 15+ subservices)
- Three implementation services with 3+ subservices each (9+ more subservices)
- Total 24+ subservices across all services

Generate services that are:
1. Specific to the technology and use case mentioned in the research
2. Based on actual implementation patterns found in the research
3. Realistic hour estimates for professional services (40-120 hours per service)
4. Include detailed subservices with specific tasks (15-40 hours per subservice)
5. Include comprehensive scope language for professional services
6. Cover the full project lifecycle from planning through training

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
        console.error('❌ No AI response content for services - research failed');
        throw new Error('Failed to generate research-driven services');
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
        console.error('❌ Failed to parse AI services - invalid JSON:', parseError);
        throw new Error('Failed to parse research-driven services');
      }

      // Validate the structure and ensure minimum content requirements
      if (Array.isArray(services) && services.length > 0) {
        // Ensure all services have required fields
        const validatedServices: Service[] = services.map((s: any, index: number) => ({
          name: s.name || `Research-Based Service ${index + 1}`,
          description: s.description || `Service based on research findings`,
          serviceDescription: s.serviceDescription || `This service is based on research findings for ${technology} implementation.`,
          keyAssumptions: s.keyAssumptions || `Key assumptions derived from research analysis.`,
          clientResponsibilities: s.clientResponsibilities || `Client responsibilities based on industry best practices found in research.`,
          outOfScope: s.outOfScope || `Exclusions based on standard project boundaries identified in research.`,
          hours: typeof s.hours === 'number' ? s.hours : 60,
          phase: s.phase || `Phase ${index + 1}`,
          subservices: Array.isArray(s.subservices) ? s.subservices.map((sub: any, subIndex: number) => ({
            name: sub.name || `Subservice ${subIndex + 1}`,
            description: sub.description || 'Research-based subservice',
            serviceDescription: sub.serviceDescription || `This subservice is based on ${technology} best practices identified in research.`,
            keyAssumptions: sub.keyAssumptions || `Assumptions based on research analysis.`,
            clientResponsibilities: sub.clientResponsibilities || `Client responsibilities for this activity.`,
            outOfScope: sub.outOfScope || `Standard exclusions for this type of work.`,
            hours: typeof sub.hours === 'number' ? sub.hours : 20
          })) : []
        }));

        // Validate content volume - ensure we have sufficient services and subservices
        const totalSubservices = validatedServices.reduce((count, service) => count + service.subservices.length, 0);
        
        console.log(`📊 Service volume check: ${validatedServices.length} services, ${totalSubservices} total subservices`);
        
        // If we don't meet minimum requirements, fail rather than use fallbacks
        if (validatedServices.length < 4) {
          console.error(`❌ Insufficient services generated: ${validatedServices.length} (need 4+)`);
          throw new Error(`Research-driven generation failed - only ${validatedServices.length} services generated, need 4+`);
        }
        
        if (totalSubservices < 15) {
          console.error(`❌ Insufficient subservices generated: ${totalSubservices} (need 15+)`);
          throw new Error(`Research-driven generation failed - only ${totalSubservices} subservices generated, need 15+`);
        }

        console.log(`✅ Generated ${validatedServices.length} research-driven services with ${totalSubservices} total subservices`);
        return validatedServices;
      } else {
        console.error('❌ No valid services generated from research');
        throw new Error('Research-driven service generation returned no valid services');
      }

    } catch (error) {
      console.error('❌ Research-driven service generation failed:', error);
      throw error; // Re-throw to fail rather than use fallbacks
    }
  }
}

// Export function to get ServiceGenerator instance
export function getServiceGenerator() {
  const { OpenRouterClient } = require('../api/openrouter-client');
  return new ServiceGenerator(new OpenRouterClient());
}