// Enhanced Service Generator v2
// Generates services with explicit scaling metadata and calculation rules

import { OpenRouterClient } from '../api/openrouter-client';
import { extractTechnologyName } from '../utils/response-processor';
import { SERVICE_GENERATION_TIMEOUT } from '../config/constants';
import type { Service } from '../types/interfaces';

export class ServiceGeneratorV2 {
  constructor(private client: OpenRouterClient) {}

  /**
   * Generate services with scaling metadata based on research
   */
  async generateServicesFromResearch(researchData: any, userRequest: string): Promise<Service[]> {
    const technology = extractTechnologyName(userRequest);
    
    try {
      const researchContext = {
        sources: researchData.sources || [],
        summary: researchData.researchSummary || '',
        insights: researchData.keyInsights || [],
        userRequest: userRequest
      };
      
      const prompt = `Generate exactly 5 professional services for "${userRequest}" with scaling metadata.

Research: ${researchContext.summary}
Key Insights: ${researchContext.insights.slice(0, 3).join(', ')}

MANDATORY STRUCTURE:
1. Initiation Phase - stakeholder analysis, requirements
2. Planning Phase - architecture design, project planning  
3. Execution Phase - implementation, deployment
4. Monitoring Phase - testing, quality assurance
5. Closing Phase - knowledge transfer, documentation

IMPORTANT: Each service MUST include scaling metadata that defines:
- scalingFactors: Array of factors that scale this service (user_count, mailbox_count, site_count, data_volume_gb, integration_count, etc.)
- quantityDriver: The PRIMARY factor that drives quantity
- calculationRules: Rules for calculating quantity/multiplier

Return ONLY valid JSON (no markdown or explanations):
[
  {
    "id": "svc_initiation_001",
    "name": "${technology} Project Initiation & Requirements",
    "description": "Stakeholder analysis and requirements gathering",
    "serviceDescription": "Comprehensive stakeholder engagement and requirements documentation for ${technology} implementation",
    "hours": 24,
    "baseHours": 24,
    "phase": "Initiation",
    "scalingFactors": ["site_count", "complexity"],
    "quantityDriver": "site_count",
    "calculationRules": {
      "quantity": "site_count || 1",
      "multiplier": "complexity === 'high' ? 1.5 : 1.0"
    },
    "subservices": [
      {
        "id": "sub_init_001",
        "name": "Stakeholder Analysis Workshop",
        "description": "Identify and engage key stakeholders",
        "hours": 8,
        "baseHours": 2,
        "scalingFactors": ["site_count"],
        "quantityDriver": "site_count",
        "calculationRules": {
          "quantity": "site_count || 1"
        }
      },
      {
        "id": "sub_init_002",
        "name": "Requirements Documentation",
        "description": "Document technical and business requirements",
        "hours": 8,
        "baseHours": 8
      },
      {
        "id": "sub_init_003",
        "name": "Current State Assessment",
        "description": "Analyze existing environment",
        "hours": 4,
        "baseHours": 1,
        "scalingFactors": ["system_count"],
        "quantityDriver": "system_count",
        "calculationRules": {
          "quantity": "system_count || 1"
        }
      },
      {
        "id": "sub_init_004",
        "name": "Success Criteria Definition",
        "description": "Define measurable success metrics",
        "hours": 4,
        "baseHours": 4
      }
    ]
  },
  {
    "id": "svc_planning_002",
    "name": "${technology} Architecture & Design",
    "description": "Technical architecture and implementation planning",
    "serviceDescription": "Detailed technical design and architecture planning for ${technology} deployment",
    "hours": 40,
    "baseHours": 40,
    "phase": "Planning",
    "scalingFactors": ["integration_count", "complexity"],
    "quantityDriver": "integration_count",
    "calculationRules": {
      "quantity": "1",
      "multiplier": "(integration_count > 5 ? 1.5 : 1.0) * (complexity === 'high' ? 1.3 : 1.0)"
    },
    "subservices": [
      {
        "id": "sub_plan_001",
        "name": "Solution Architecture Design",
        "description": "Design overall technical architecture",
        "hours": 16,
        "baseHours": 16
      },
      {
        "id": "sub_plan_002",
        "name": "Integration Planning",
        "description": "Plan system integrations",
        "hours": 8,
        "baseHours": 2,
        "scalingFactors": ["integration_count"],
        "quantityDriver": "integration_count",
        "calculationRules": {
          "quantity": "integration_count || 1"
        }
      },
      {
        "id": "sub_plan_003",
        "name": "Security Design",
        "description": "Design security architecture",
        "hours": 8,
        "baseHours": 8,
        "calculationRules": {
          "multiplier": "security_level === 'enhanced' ? 1.5 : 1.0"
        }
      },
      {
        "id": "sub_plan_004",
        "name": "Migration Strategy",
        "description": "Define migration approach",
        "hours": 8,
        "baseHours": 0.01,
        "scalingFactors": ["data_volume_gb"],
        "quantityDriver": "data_volume_gb",
        "calculationRules": {
          "quantity": "data_volume_gb || 100"
        }
      }
    ]
  },
  {
    "id": "svc_execution_003",
    "name": "${technology} Implementation & Deployment",
    "description": "Core implementation and deployment services",
    "serviceDescription": "Hands-on implementation and deployment of ${technology} solution",
    "hours": 80,
    "baseHours": 80,
    "phase": "Execution",
    "scalingFactors": ["user_count", "mailbox_count", "site_count"],
    "quantityDriver": "user_count",
    "calculationRules": {
      "quantity": "1",
      "multiplier": "user_count > 1000 ? (user_count / 1000) : 1.0"
    },
    "subservices": [
      {
        "id": "sub_exec_001",
        "name": "Core System Installation",
        "description": "Install and configure base system",
        "hours": 16,
        "baseHours": 8,
        "scalingFactors": ["site_count"],
        "quantityDriver": "site_count",
        "calculationRules": {
          "quantity": "site_count || 1"
        }
      },
      {
        "id": "sub_exec_002",
        "name": "User Migration Services",
        "description": "Migrate users to new system",
        "hours": 24,
        "baseHours": 0.25,
        "scalingFactors": ["user_count", "mailbox_count"],
        "quantityDriver": "user_count",
        "calculationRules": {
          "quantity": "user_count || mailbox_count || 100"
        }
      },
      {
        "id": "sub_exec_003",
        "name": "Data Migration",
        "description": "Migrate existing data",
        "hours": 24,
        "baseHours": 0.1,
        "scalingFactors": ["data_volume_gb"],
        "quantityDriver": "data_volume_gb",
        "calculationRules": {
          "quantity": "data_volume_gb || 100"
        }
      },
      {
        "id": "sub_exec_004",
        "name": "Integration Implementation",
        "description": "Implement system integrations",
        "hours": 16,
        "baseHours": 4,
        "scalingFactors": ["integration_count"],
        "quantityDriver": "integration_count",
        "calculationRules": {
          "quantity": "integration_count || 1"
        }
      }
    ]
  },
  {
    "id": "svc_monitoring_004",
    "name": "${technology} Testing & Quality Assurance",
    "description": "Comprehensive testing and validation",
    "serviceDescription": "Thorough testing and quality assurance for ${technology} deployment",
    "hours": 32,
    "baseHours": 32,
    "phase": "Monitoring",
    "scalingFactors": ["test_scenarios", "site_count"],
    "quantityDriver": "test_scenarios",
    "calculationRules": {
      "quantity": "1",
      "multiplier": "site_count > 5 ? 1.5 : 1.0"
    },
    "subservices": [
      {
        "id": "sub_mon_001",
        "name": "Functional Testing",
        "description": "Test core functionality",
        "hours": 8,
        "baseHours": 8
      },
      {
        "id": "sub_mon_002",
        "name": "Integration Testing",
        "description": "Test system integrations",
        "hours": 8,
        "baseHours": 2,
        "scalingFactors": ["integration_count"],
        "quantityDriver": "integration_count",
        "calculationRules": {
          "quantity": "integration_count || 1"
        }
      },
      {
        "id": "sub_mon_003",
        "name": "Performance Testing",
        "description": "Validate system performance",
        "hours": 8,
        "baseHours": 0.01,
        "scalingFactors": ["user_count"],
        "quantityDriver": "user_count",
        "calculationRules": {
          "quantity": "user_count || 100"
        }
      },
      {
        "id": "sub_mon_004",
        "name": "User Acceptance Testing",
        "description": "Facilitate UAT sessions",
        "hours": 8,
        "baseHours": 2,
        "scalingFactors": ["site_count"],
        "quantityDriver": "site_count",
        "calculationRules": {
          "quantity": "site_count || 1"
        }
      }
    ]
  },
  {
    "id": "svc_closing_005",
    "name": "${technology} Knowledge Transfer & Closing",
    "description": "Documentation and knowledge transfer",
    "serviceDescription": "Comprehensive knowledge transfer and project closure for ${technology}",
    "hours": 24,
    "baseHours": 24,
    "phase": "Closing",
    "scalingFactors": ["training_groups", "documentation_sets"],
    "quantityDriver": "training_groups",
    "calculationRules": {
      "quantity": "1"
    },
    "subservices": [
      {
        "id": "sub_close_001",
        "name": "Administrator Training",
        "description": "Train system administrators",
        "hours": 8,
        "baseHours": 4,
        "scalingFactors": ["admin_count"],
        "quantityDriver": "admin_count",
        "calculationRules": {
          "quantity": "Math.ceil((admin_count || 2) / 5)"
        }
      },
      {
        "id": "sub_close_002",
        "name": "End User Training",
        "description": "Train end users",
        "hours": 8,
        "baseHours": 2,
        "scalingFactors": ["training_groups"],
        "quantityDriver": "training_groups",
        "calculationRules": {
          "quantity": "training_groups || Math.ceil((user_count || 100) / 20)"
        }
      },
      {
        "id": "sub_close_003",
        "name": "Documentation Delivery",
        "description": "Deliver technical documentation",
        "hours": 4,
        "baseHours": 4
      },
      {
        "id": "sub_close_004",
        "name": "Project Handover",
        "description": "Final handover and closure",
        "hours": 4,
        "baseHours": 4
      }
    ]
  }
]`;

      const response = await this.client.generateWithTimeout(
        prompt,
        SERVICE_GENERATION_TIMEOUT,
        'anthropic/claude-3.5-sonnet'
      );

      const services = this.parseAndEnhanceServices(response, technology);
      return services;
      
    } catch (error) {
      console.error('Service generation v2 failed:', error);
      throw error;
    }
  }

  /**
   * Parse and enhance services with additional metadata
   */
  private parseAndEnhanceServices(response: string, technology: string): Service[] {
    try {
      // Clean response and parse JSON
      const cleaned = response.replace(/```json|```/g, '').trim();
      const services = JSON.parse(cleaned);
      
      // Enhance each service with generated IDs if missing
      return services.map((service: Service, sIndex: number) => ({
        ...service,
        id: service.id || `svc_${sIndex + 1}`,
        subservices: service.subservices?.map((sub: any, subIndex: number) => ({
          ...sub,
          id: sub.id || `sub_${sIndex + 1}_${subIndex + 1}`
        }))
      }));
      
    } catch (error) {
      console.error('Failed to parse services v2:', error);
      throw new Error('Failed to parse service generation response');
    }
  }
}

// Export singleton getter
let serviceGeneratorV2Instance: ServiceGeneratorV2 | null = null;

export function getServiceGeneratorV2(client: OpenRouterClient): ServiceGeneratorV2 {
  if (!serviceGeneratorV2Instance) {
    serviceGeneratorV2Instance = new ServiceGeneratorV2(client);
  }
  return serviceGeneratorV2Instance;
}