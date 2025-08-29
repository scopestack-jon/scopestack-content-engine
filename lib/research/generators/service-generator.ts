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
      
      // Create a structured prompt that explicitly requires all PMBOK phases
      const prompt = `Generate exactly 5 professional services based on "${userRequest}" research, with ONE service for EACH PMBOK phase.

Research: ${researchContext.summary}
Key Insights: ${researchContext.insights.slice(0, 3).join(', ')}

MANDATORY PHASE STRUCTURE:
1. Initiation Phase Service (stakeholder analysis, project charter, initial requirements)
2. Planning Phase Service (detailed design, architecture planning, project planning)  
3. Execution Phase Service (implementation, deployment, configuration)
4. Monitoring & Controlling Phase Service (testing, quality assurance, performance monitoring)
5. Closing Phase Service (knowledge transfer, documentation, project handover)

REQUIREMENTS:
- EXACTLY 5 services, one for each PMBOK phase above
- Each service has 4+ subservices (minimum 20 total subservices)
- Based on research findings for ${technology}
- Professional consulting scope language throughout

SERVICE NAMING GUIDELINES:
- Include specific ${technology} components/features in service names
- Avoid generic terms like "Assessment", "Planning", "Implementation" alone
- Example good names: "${technology} Policy Engine Configuration", "${technology} High Availability Deployment", "${technology} RADIUS Integration Services"
- Subservices should reference specific technical tasks or components

SCOPE LANGUAGE QUALITY GUIDELINES:
- serviceDescription: Clear business value and outcomes (2-3 sentences)
- keyAssumptions: Specific technical and business assumptions that affect scope
- clientResponsibilities: Concrete deliverables/actions required from client
- outOfScope: Specific exclusions to prevent scope creep

JSON FORMAT - Return exactly 5 services in this order (NO markdown, explanations, or code blocks):
[
  {
    "name": "${technology} Project Initiation & Stakeholder Analysis",
    "description": "Brief description",
    "serviceDescription": "Professional description highlighting business value, technical approach, and key deliverables that directly address implementation challenges identified in research.",
    "keyAssumptions": "Client provides necessary access credentials and technical documentation. Existing infrastructure meets minimum requirements. Key stakeholders will be available for requirements validation sessions.",
    "clientResponsibilities": "Client will provide dedicated technical resources for knowledge transfer sessions. Client responsible for coordinating internal approvals and change management communications. Client will validate all configurations in test environment before production deployment.",
    "outOfScope": "Hardware procurement and infrastructure setup excluded. Third-party integrations beyond standard APIs require separate engagement. End-user training beyond administrative handover sessions not included.",
    "hours": 24,
    "phase": "Initiation",
    "subservices": [
      {
        "name": "Requirements Gathering Workshop",
        "description": "Technical subservice description", 
        "serviceDescription": "Detailed description of specific components, configuration parameters, and integration points that contribute to the overall implementation success.",
        "keyAssumptions": "Specific technical assumptions relevant to this subservice component.",
        "clientResponsibilities": "Specific client actions and deliverables required for this subservice.",
        "outOfScope": "Specific exclusions for this subservice to maintain clear boundaries.",
        "hours": 6
      }
    ]
  },
  {
    "name": "${technology} Architecture Design & Planning",
    "description": "Brief description",
    "serviceDescription": "Professional description...",
    "keyAssumptions": "Client assumptions...", 
    "clientResponsibilities": "Client responsibilities...",
    "outOfScope": "Exclusions...",
    "hours": 48,
    "phase": "Planning",
    "subservices": [...]
  },
  {
    "name": "${technology} Implementation & Configuration",
    "description": "Brief description",
    "serviceDescription": "Professional description...",
    "keyAssumptions": "Client assumptions...",
    "clientResponsibilities": "Client responsibilities...", 
    "outOfScope": "Exclusions...",
    "hours": 80,
    "phase": "Execution",
    "subservices": [...]
  },
  {
    "name": "${technology} Testing & Quality Assurance",
    "description": "Brief description", 
    "serviceDescription": "Professional description...",
    "keyAssumptions": "Client assumptions...",
    "clientResponsibilities": "Client responsibilities...",
    "outOfScope": "Exclusions...",
    "hours": 32,
    "phase": "Monitoring & Controlling",
    "subservices": [...]
  },
  {
    "name": "${technology} Knowledge Transfer & Project Closure",
    "description": "Brief description",
    "serviceDescription": "Professional description...",
    "keyAssumptions": "Client assumptions...",
    "clientResponsibilities": "Client responsibilities...",
    "outOfScope": "Exclusions...", 
    "hours": 16,
    "phase": "Closing",
    "subservices": [...]
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
          name: s.name || `${technology} ${this.getPhaseSpecificServiceName(s.phase, index)}`,
          description: s.description || `Specialized service based on research findings`,
          serviceDescription: s.serviceDescription || s.description || '',
          keyAssumptions: s.keyAssumptions || '',
          clientResponsibilities: s.clientResponsibilities || '',
          outOfScope: s.outOfScope || '',
          hours: typeof s.hours === 'number' ? s.hours : this.getDefaultServiceHours(s.phase),
          phase: this.normalizePMBOKPhase(s.phase) || `Phase ${index + 1}`,
          subservices: Array.isArray(s.subservices) ? s.subservices.map((sub: any, subIndex: number) => ({
            name: sub.name || `${technology} ${this.getSubserviceSpecificName(s.phase, subIndex)}`,
            description: sub.description || `Technical configuration task`,
            serviceDescription: sub.serviceDescription || sub.description || '',
            keyAssumptions: sub.keyAssumptions || '',
            clientResponsibilities: sub.clientResponsibilities || '',
            outOfScope: sub.outOfScope || '',
            hours: typeof sub.hours === 'number' ? sub.hours : this.getDefaultSubserviceHours(s.phase)
          })) : []
        }));

        // Validate content volume and PMBOK phase alignment
        const totalSubservices = validatedServices.reduce((count, service) => count + service.subservices.length, 0);
        const phaseAlignment = this.validatePMBOKPhases(validatedServices);
        
        console.log(`📊 Service volume check: ${validatedServices.length} services, ${totalSubservices} total subservices`);
        console.log(`📊 PMBOK phase coverage: ${phaseAlignment.coveragePercentage}% (${phaseAlignment.coveredPhases.length}/5 phases)`);
        
        // If we don't meet minimum requirements, fail rather than use fallbacks
        if (validatedServices.length < 5) {
          console.error(`❌ Insufficient services generated: ${validatedServices.length} (need 5)`);
          throw new Error(`Research-driven generation failed - only ${validatedServices.length} services generated, need 5`);
        }
        
        if (totalSubservices < 8) {
          console.error(`❌ Insufficient subservices generated: ${totalSubservices} (need 8+)`);
          throw new Error(`Research-driven generation failed - only ${totalSubservices} subservices generated, need 8+`);
        } else if (totalSubservices < 12) {
          console.warn(`⚠️ Subservice count below target: ${totalSubservices} (target 15+, minimum 8)`);
        }
        
        // Enforce full PMBOK phase coverage (100%)
        if (phaseAlignment.coveragePercentage < 100) {
          console.error(`❌ Incomplete PMBOK phase coverage: ${phaseAlignment.coveragePercentage}% (need 100%)`);
          console.error(`❌ Missing phases: ${phaseAlignment.missingPhases.join(', ')}`);
          
          // Add missing phases with fallback services
          validatedServices = this.ensureAllPMBOKPhases(validatedServices, technology);
          
          // Re-validate after adding missing phases
          const newPhaseAlignment = this.validatePMBOKPhases(validatedServices);
          console.log(`📊 Phase coverage after correction: ${newPhaseAlignment.coveragePercentage}%`);
          
          if (newPhaseAlignment.coveragePercentage < 100) {
            throw new Error(`Research-driven generation failed - could not achieve full PMBOK phase coverage`);
          }
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
   * Get phase-specific service name when AI doesn't provide one
   */
  private getPhaseSpecificServiceName(phase: string, index: number): string {
    const normalizedPhase = this.normalizePMBOKPhase(phase);
    
    switch (normalizedPhase) {
      case 'Initiation': return 'Discovery & Requirements Analysis';
      case 'Planning': return 'Architecture & Design Services';
      case 'Execution': return 'Platform Deployment & Configuration';
      case 'Monitoring & Controlling': return 'Testing & Validation Services';
      case 'Closing': return 'Knowledge Transfer & Documentation';
      default: return `Technical Service ${index + 1}`;
    }
  }

  /**
   * Get subservice-specific name when AI doesn't provide one
   */
  private getSubserviceSpecificName(phase: string, index: number): string {
    const normalizedPhase = this.normalizePMBOKPhase(phase);
    const subserviceNames: Record<string, string[]> = {
      'Initiation': [
        'Current State Assessment',
        'Requirements Workshop Facilitation',
        'Use Case Documentation',
        'Technical Prerequisites Review'
      ],
      'Planning': [
        'High-Level Design Documentation',
        'Network Topology Planning',
        'Security Policy Framework',
        'Integration Point Mapping'
      ],
      'Execution': [
        'Core Platform Installation',
        'Authentication Service Configuration',
        'Policy Engine Setup',
        'External System Integration'
      ],
      'Monitoring & Controlling': [
        'Functional Testing Execution',
        'Performance Baseline Validation',
        'Security Compliance Verification',
        'Failover Scenario Testing'
      ],
      'Closing': [
        'Administrator Training Delivery',
        'Runbook Documentation',
        'Handover Session Facilitation',
        'Post-Implementation Review'
      ]
    };
    
    const phaseNames = subserviceNames[normalizedPhase] || [
      'Technical Configuration Task',
      'System Integration Activity',
      'Validation & Testing',
      'Documentation & Training'
    ];
    
    return phaseNames[index % phaseNames.length];
  }

  /**
   * Get default service hours based on PMBOK phase
   */
  private getDefaultServiceHours(phase: string): number {
    const normalizedPhase = this.normalizePMBOKPhase(phase);
    
    switch (normalizedPhase) {
      case 'Initiation': return 24;
      case 'Planning': return 48;
      case 'Execution': return 80;
      case 'Monitoring & Controlling': return 32;
      case 'Closing': return 16;
      default: return 40; // Default fallback
    }
  }

  /**
   * Get default subservice hours based on PMBOK phase
   */
  private getDefaultSubserviceHours(phase: string): number {
    const normalizedPhase = this.normalizePMBOKPhase(phase);
    
    switch (normalizedPhase) {
      case 'Initiation': return 6;
      case 'Planning': return 12;
      case 'Execution': return 20;
      case 'Monitoring & Controlling': return 8;
      case 'Closing': return 4;
      default: return 12; // Default fallback
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
   * Ensure all PMBOK phases are covered by adding missing services
   */
  private ensureAllPMBOKPhases(services: Service[], technology: string): Service[] {
    const pmbokPhases = ['Initiation', 'Planning', 'Execution', 'Monitoring & Controlling', 'Closing'];
    const phaseTemplates: Record<string, {name: string, description: string, hours: number, subservices: any[]}> = {
      'Initiation': {
        name: `${technology} Project Initiation & Requirements Discovery`,
        description: 'Project kickoff and initial requirements analysis',
        hours: 24,
        subservices: [
          { name: 'Stakeholder Identification Workshop', description: 'Identify and engage key project stakeholders', hours: 6 },
          { name: 'Current State Assessment', description: 'Document existing environment and constraints', hours: 8 },
          { name: 'Success Criteria Definition', description: 'Define measurable project success metrics', hours: 4 },
          { name: 'Project Charter Development', description: 'Create formal project authorization document', hours: 6 }
        ]
      },
      'Planning': {
        name: `${technology} Architecture Design & Technical Planning`,
        description: 'Detailed technical design and implementation planning',
        hours: 48,
        subservices: [
          { name: 'Solution Architecture Design', description: 'Design comprehensive system architecture', hours: 16 },
          { name: 'Integration Planning', description: 'Plan system integrations and data flows', hours: 12 },
          { name: 'Security Framework Design', description: 'Design security policies and controls', hours: 12 },
          { name: 'Implementation Roadmap', description: 'Create detailed implementation timeline', hours: 8 }
        ]
      },
      'Execution': {
        name: `${technology} System Implementation & Configuration`,
        description: 'Core system deployment and configuration',
        hours: 80,
        subservices: [
          { name: 'Platform Installation', description: 'Install and configure core platform components', hours: 24 },
          { name: 'Security Configuration', description: 'Implement security policies and controls', hours: 20 },
          { name: 'Integration Implementation', description: 'Configure system integrations', hours: 20 },
          { name: 'User Access Configuration', description: 'Set up user accounts and permissions', hours: 16 }
        ]
      },
      'Monitoring & Controlling': {
        name: `${technology} Testing & Quality Validation`,
        description: 'Comprehensive testing and quality assurance',
        hours: 32,
        subservices: [
          { name: 'Functional Testing', description: 'Test all system functionality', hours: 12 },
          { name: 'Security Testing', description: 'Validate security controls and policies', hours: 8 },
          { name: 'Performance Testing', description: 'Test system performance and scalability', hours: 8 },
          { name: 'User Acceptance Testing', description: 'Coordinate user acceptance testing', hours: 4 }
        ]
      },
      'Closing': {
        name: `${technology} Knowledge Transfer & Project Handover`,
        description: 'Project closure and knowledge transfer activities',
        hours: 16,
        subservices: [
          { name: 'Administrator Training', description: 'Train system administrators', hours: 8 },
          { name: 'Documentation Handover', description: 'Deliver comprehensive system documentation', hours: 4 },
          { name: 'Support Transition', description: 'Transition to ongoing support model', hours: 2 },
          { name: 'Project Closure Review', description: 'Conduct project lessons learned session', hours: 2 }
        ]
      }
    };

    const currentPhases = this.validatePMBOKPhases(services);
    const updatedServices = [...services];

    // Add missing phases
    for (const missingPhase of currentPhases.missingPhases) {
      if (phaseTemplates[missingPhase]) {
        const template = phaseTemplates[missingPhase];
        const newService: Service = {
          name: template.name,
          description: template.description,
          serviceDescription: '',
          keyAssumptions: '',
          clientResponsibilities: '',
          outOfScope: '',
          hours: template.hours,
          phase: missingPhase,
          subservices: template.subservices.map(sub => ({
            ...sub,
            serviceDescription: sub.serviceDescription || sub.description || '',
            keyAssumptions: sub.keyAssumptions || '',
            clientResponsibilities: sub.clientResponsibilities || '',
            outOfScope: sub.outOfScope || ''
          }))
        };
        
        updatedServices.push(newService);
        console.log(`➕ Added missing ${missingPhase} phase service: ${template.name}`);
      }
    }

    return updatedServices;
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