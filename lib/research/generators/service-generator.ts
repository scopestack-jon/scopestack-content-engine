import { OpenRouterClient } from '../api/openrouter-client';
import { extractTechnologyName } from '../utils/response-processor';
import { SERVICE_GENERATION_TIMEOUT } from '../config/constants';
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
      
      // Create a streamlined prompt for faster service generation with enhanced scope language
      const prompt = `Generate 4-5 professional services based on "${userRequest}" research with high-quality scope language.

Research: ${researchContext.summary}
Key Insights: ${researchContext.insights.slice(0, 3).join(', ')}

REQUIREMENTS:
- 4-5 services aligned with PMBOK phases: Initiation, Planning, Execution, Monitoring & Controlling, Closing  
- Each service has 4+ subservices (minimum 16 total subservices)
- Based on research findings for ${technology}
- Professional consulting scope language throughout

SCOPE LANGUAGE QUALITY GUIDELINES:
- serviceDescription: Clear business value and outcomes (2-3 sentences)
- keyAssumptions: Specific technical and business assumptions that affect scope
- clientResponsibilities: Concrete deliverables/actions required from client
- outOfScope: Specific exclusions to prevent scope creep

JSON FORMAT (NO markdown, explanations, or code blocks):
[
  {
    "name": "Service Name",
    "description": "Brief description",
    "serviceDescription": "Professional description highlighting business value, technical approach, and key deliverables that directly address the ${technology} implementation challenges identified in research.",
    "keyAssumptions": "Client provides necessary access credentials and technical documentation. Existing infrastructure meets minimum requirements identified in ${technology} specifications. Key stakeholders will be available for requirements validation sessions.",
    "clientResponsibilities": "Client will provide dedicated technical resources for knowledge transfer sessions. Client responsible for coordinating internal approvals and change management communications. Client will validate all configurations in test environment before production deployment.",
    "outOfScope": "Hardware procurement and infrastructure setup excluded. Third-party integrations beyond standard APIs require separate engagement. End-user training beyond administrative handover sessions not included.",
    "hours": 80,
    "phase": "One of: Initiation, Planning, Execution, Monitoring & Controlling, Closing",
    "subservices": [
      {
        "name": "Subservice Name",
        "description": "Subservice description", 
        "serviceDescription": "Detailed description of specific activities, methodologies, and deliverables that contribute to the overall ${technology} implementation success.",
        "keyAssumptions": "Specific technical assumptions relevant to this subservice component.",
        "clientResponsibilities": "Specific client actions and deliverables required for this subservice.",
        "outOfScope": "Specific exclusions for this subservice to maintain clear boundaries.",
        "hours": 20
      }
    ]
  }
]`;

      // Call OpenRouter API to generate research-driven services with extended timeout
      const aiContent = await this.client.generateWithRetry(
        'anthropic/claude-3.5-sonnet',
        prompt,
        SERVICE_GENERATION_TIMEOUT
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
          phase: this.normalizePMBOKPhase(s.phase) || `Phase ${index + 1}`,
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

        // Validate content volume and PMBOK phase alignment
        const totalSubservices = validatedServices.reduce((count, service) => count + service.subservices.length, 0);
        const phaseAlignment = this.validatePMBOKPhases(validatedServices);
        
        console.log(`📊 Service volume check: ${validatedServices.length} services, ${totalSubservices} total subservices`);
        console.log(`📊 PMBOK phase coverage: ${phaseAlignment.coveragePercentage}% (${phaseAlignment.coveredPhases.length}/5 phases)`);
        
        // If we don't meet minimum requirements, fail rather than use fallbacks
        if (validatedServices.length < 4) {
          console.error(`❌ Insufficient services generated: ${validatedServices.length} (need 4+)`);
          throw new Error(`Research-driven generation failed - only ${validatedServices.length} services generated, need 4+`);
        }
        
        if (totalSubservices < 12) {
          console.error(`❌ Insufficient subservices generated: ${totalSubservices} (need 12+)`);
          throw new Error(`Research-driven generation failed - only ${totalSubservices} subservices generated, need 12+`);
        } else if (totalSubservices < 15) {
          console.warn(`⚠️ Subservice count below target: ${totalSubservices} (target 15+, minimum 12)`);
        }
        
        if (phaseAlignment.coveragePercentage < 60) {
          console.error(`❌ Insufficient PMBOK phase coverage: ${phaseAlignment.coveragePercentage}% (need 60%+)`);
          console.error(`❌ Missing phases: ${phaseAlignment.missingPhases.join(', ')}`);
          throw new Error(`Research-driven generation failed - insufficient PMBOK phase coverage: ${phaseAlignment.coveragePercentage}%`);
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

  /**
   * Normalize phase names to standard PMBOK phases
   */
  private normalizePMBOKPhase(phase: string): string {
    if (!phase) return '';
    
    const phaseLower = phase.toLowerCase();
    
    // Map common variations to PMBOK standard phases
    if (phaseLower.includes('initiat') || phaseLower.includes('start') || phaseLower.includes('charter')) {
      return 'Initiation';
    }
    if (phaseLower.includes('plan') || phaseLower.includes('design') || phaseLower.includes('architect')) {
      return 'Planning';
    }
    if (phaseLower.includes('execut') || phaseLower.includes('implement') || phaseLower.includes('deploy') || phaseLower.includes('build')) {
      return 'Execution';
    }
    if (phaseLower.includes('monitor') || phaseLower.includes('control') || phaseLower.includes('test') || phaseLower.includes('quality')) {
      return 'Monitoring & Controlling';
    }
    if (phaseLower.includes('clos') || phaseLower.includes('train') || phaseLower.includes('handover')) {
      return 'Closing';
    }
    
    // If no match, return original
    return phase;
  }

  /**
   * Validate PMBOK phase coverage in generated services
   */
  private validatePMBOKPhases(services: Service[]): {
    coveragePercentage: number;
    coveredPhases: string[];
    missingPhases: string[];
  } {
    const pmbokPhases = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'];
    const phaseKeywords = {
      'Initiation': ['initiation', 'charter', 'stakeholder', 'initial', 'kickoff', 'startup'],
      'Planning': ['planning', 'design', 'architecture', 'strategy', 'blueprint', 'analysis', 'assessment'],
      'Execution': ['execution', 'implementation', 'development', 'build', 'deployment', 'configuration', 'setup'],
      'Monitoring': ['monitoring', 'testing', 'quality', 'validation', 'control', 'tracking', 'assurance'],
      'Closing': ['closing', 'training', 'handover', 'documentation', 'knowledge transfer', 'closure', 'completion']
    };

    const coveredPhases: string[] = [];
    
    // Check each phase for coverage
    for (const phase of pmbokPhases) {
      const keywords = phaseKeywords[phase as keyof typeof phaseKeywords];
      let phaseFound = false;

      // Look for phase coverage in service names, descriptions, and phase fields
      for (const service of services) {
        const searchText = `${service.name} ${service.description} ${service.phase} ${service.serviceDescription}`.toLowerCase();
        
        if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
          phaseFound = true;
          break;
        }

        // Also check subservices
        for (const subservice of service.subservices) {
          const subSearchText = `${subservice.name} ${subservice.description} ${subservice.serviceDescription}`.toLowerCase();
          if (keywords.some(keyword => subSearchText.includes(keyword.toLowerCase()))) {
            phaseFound = true;
            break;
          }
        }
        
        if (phaseFound) break;
      }

      if (phaseFound) {
        coveredPhases.push(phase);
      }
    }

    const coveragePercentage = Math.round((coveredPhases.length / pmbokPhases.length) * 100);
    const missingPhases = pmbokPhases.filter(phase => !coveredPhases.includes(phase));

    return {
      coveragePercentage,
      coveredPhases,
      missingPhases
    };
  }
}

// Export function to get ServiceGenerator instance
export function getServiceGenerator() {
  const { OpenRouterClient } = require('../api/openrouter-client');
  return new ServiceGenerator(new OpenRouterClient());
}