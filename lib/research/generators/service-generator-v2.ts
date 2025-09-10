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
      
      const prompt = `Generate exactly 5 professional services for "${userRequest}" implementation with scaling metadata.

Research Context: ${researchContext.summary}
Key Insights: ${researchContext.insights.slice(0, 3).join(', ')}

Requirements:
1. Generate EXACTLY 5 services, one for each PMBOK phase with rich scope language:
   - Initiation Phase: Requirements gathering, stakeholder analysis, current state assessment
   - Planning Phase: Architecture design, project planning, detailed technical specifications
   - Execution Phase: Implementation, deployment, configuration, data migration
   - Monitoring Phase: Testing, quality assurance, performance monitoring, validation
   - Closing Phase: Knowledge transfer, documentation, handover, project sign-off

Each subservice should include professional scope language based on the research insights:
- Use specific ${technology} terminology from the research
- Include deliverables, activities, assumptions, and exclusions
- Reference industry best practices found in the research
- Mention compliance, security, or performance considerations when relevant

2. Each service MUST include:
   - id: Unique identifier (e.g., "svc_init_001")
   - name: Service name specific to ${technology}
   - description: Brief description
   - serviceDescription: Detailed professional description
   - hours: Total hours estimate (will be sum of subservice hours)
   - baseHours: Base hours per unit (set to total hours)
   - phase: PMBOK phase name
   - quantity: Always 1 (services represent phases, not scalable units)
   - subservices: Array of 4-5 subservices with scaling logic

3. Each subservice MUST include:
   - id: Unique identifier (e.g., "sub_init_001")
   - name: Subservice name
   - description: Brief description with scope language explaining what's included
   - scope: Detailed scope statement explaining deliverables, activities, and boundaries
   - hours: Estimated hours
   - baseHours: Base hours per unit
   - scalingFactors: Array of factors that scale this subservice
   - quantityDriver: Primary scaling factor for this subservice
   - calculationRules: Object with quantity/multiplier formulas specific to this subservice

4. Use these common scaling factors where appropriate:
   - user_count: Number of users
   - mailbox_count: Number of mailboxes
   - site_count: Number of locations
   - data_volume_gb: Data in GB
   - integration_count: Number of integrations
   - complexity: Project complexity (low/medium/high)
   - security_level: Security requirements
   - admin_count: Number of administrators
   - training_groups: Number of training groups

Return ONLY a valid JSON array with all 5 services. No markdown, no explanations.

SERVICES should NOT have calculation rules - they always have quantity: 1
Services represent project phases, not scalable units.

Example calculation rules for SUBSERVICES ONLY:
- quantity: "user_count || 1" (for user-based subservices)
- quantity: "mailbox_count || 1" (for mailbox migration subservices)
- quantity: "Math.ceil(data_volume_gb / 100)" (for data processing subservices)
- multiplier: "site_count > 1 ? 1.5 : 1.0" (for multi-site complexity)
- quantityDriver: "integration_count" (for integration-related subservices)

IMPORTANT: Every subservice should have either calculationRules OR quantityDriver. Do not leave subservices without scaling logic.`;

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
      console.log('🔍 Service Generator V2 - Raw AI Response:');
      console.log('📝 Response length:', response.length);
      console.log('📝 First 200 chars:', response.substring(0, 200));
      console.log('📝 Last 200 chars:', response.substring(response.length - 200));
      
      // Clean response - remove markdown code blocks if present
      let cleaned = response.trim();
      
      if (!cleaned) {
        throw new Error('Empty response received from AI');
      }
      
      // Remove markdown code blocks
      if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      
      // Find JSON array in response
      const jsonStart = cleaned.indexOf('[');
      const jsonEnd = cleaned.lastIndexOf(']');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('❌ No JSON array markers found in cleaned response:');
        console.error('📝 Cleaned response:', cleaned.substring(0, 500));
        throw new Error('No valid JSON array found in response');
      }
      
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      console.log('✅ Extracted JSON length:', cleaned.length);
      console.log('✅ Extracted JSON preview:', cleaned.substring(0, 200) + '...');
      
      const services = JSON.parse(cleaned);
      
      // Validate and enhance each service
      if (!Array.isArray(services)) {
        throw new Error('Response is not an array');
      }
      
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
      console.error('Raw response:', response.substring(0, 500));
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