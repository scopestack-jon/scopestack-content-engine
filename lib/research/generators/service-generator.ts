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

REQUIRED SERVICE STRUCTURE - Generate services aligned with PMBOK phases:

PMBOK PHASES TO USE:
- Initiation: Project charter, stakeholder identification, initial requirements
- Planning: Detailed planning, design, architecture, risk assessment  
- Execution: Implementation, development, configuration, deployment
- Monitoring & Controlling: Testing, quality assurance, progress tracking
- Closing: Training, knowledge transfer, handover, documentation

Generate EXACTLY this pattern:
4-5 specialized services, each focused on a specific PMBOK phase with 4+ subservices each

This should result in:
- Total of 4-5 services (one for each PMBOK phase)
- Each service dedicated to ONE specific PMBOK phase: Initiation, Planning, Execution, Monitoring & Controlling, or Closing
- Each service must have 4+ detailed subservices (16-25 total subservices across all services)
- All PMBOK phases covered with proper methodology
- Target: 20+ subservices across all services (minimum acceptable: 12+ subservices)

IMPORTANT: Generate MORE subservices rather than fewer. Each service should be comprehensive with detailed breakdowns.

Generate services that are:
1. Specific to the technology and use case mentioned in the research
2. Based on actual implementation patterns found in the research
3. Realistic hour estimates for professional services (80-200 hours per service)
4. Include 4-6 detailed subservices per service with specific tasks (15-40 hours per subservice)
5. Include comprehensive scope language for professional services
6. Cover the full project lifecycle from planning through training
7. CRITICAL: Each service must have AT LEAST 4 subservices - generate comprehensive detailed breakdowns

Return ONLY a JSON array of services in this exact format with PMBOK-aligned phases:
[
  {
    "name": "Service Name",
    "description": "Brief service description",
    "serviceDescription": "Detailed 2-3 sentence description of what this service provides, based on research findings",
    "keyAssumptions": "Key assumptions for this service based on typical project requirements found in research",
    "clientResponsibilities": "What the client needs to provide or do for this service to be successful",
    "outOfScope": "What is specifically not included in this service scope",
    "hours": 40,
    "phase": "MUST be one of: Initiation, Planning, Execution, Monitoring & Controlling, or Closing",
    "subservices": [
      {
        "name": "Subservice Name aligned with PMBOK activities", 
        "description": "Subservice description that clearly fits the PMBOK phase",
        "serviceDescription": "Detailed description of this subservice based on research best practices and PMBOK methodology",
        "keyAssumptions": "Assumptions specific to this subservice",
        "clientResponsibilities": "Client responsibilities for this subservice",
        "outOfScope": "What's not included in this subservice",
        "hours": 15
      }
    ]
  }
]

CRITICAL: Each service must map to ONE specific PMBOK phase:
- Use ONLY these exact phase names: "Initiation", "Planning", "Execution", "Monitoring & Controlling", "Closing"
- NO "All Phases" or "Complete Project Lifecycle" services
- Each service focuses exclusively on activities within its assigned PMBOK phase
- Generate 4-5 services to cover all PMBOK phases comprehensively

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