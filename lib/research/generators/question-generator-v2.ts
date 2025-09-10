// Service-Driven Question Generator v2
// Generates questions based on service scaling factors with explicit mapping

import { OpenRouterClient } from '../api/openrouter-client';
import { Service, Question, ResearchData } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class QuestionGeneratorV2 {
  constructor(private client: OpenRouterClient) {}

  /**
   * Extract unique scaling factors from all services
   */
  private extractScalingFactors(services: Service[]): Set<string> {
    const factors = new Set<string>();
    
    services.forEach(service => {
      // Add service-level factors
      service.scalingFactors?.forEach(factor => factors.add(factor));
      
      // Add subservice-level factors
      service.subservices?.forEach(sub => {
        sub.scalingFactors?.forEach(factor => factors.add(factor));
      });
    });
    
    return factors;
  }

  /**
   * Map scaling factors to question types and formats with context
   */
  private getQuestionTemplateForFactor(
    factor: string, 
    technology: string, 
    researchContext: any,
    services: Service[]
  ): any {
    // Find which services use this factor for more specific questions
    const relatedServices = this.findServicesUsingFactor(factor, services);
    const serviceContext = relatedServices.slice(0, 2).join(', ');
    
    const templates: Record<string, any> = {
      user_count: {
        text: `How many users will be migrated to the ${technology} system?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 100,
        context: `Affects ${serviceContext}`
      },
      mailbox_count: {
        text: `How many ${technology} mailboxes need to be migrated and configured?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 100,
        context: `Impacts data migration and user provisioning`
      },
      site_count: {
        text: `How many physical sites will require ${technology} deployment?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 1,
        context: `Each site requires separate installation and configuration`
      },
      data_volume_gb: {
        text: `What is the total data volume (in GB) to be migrated to ${technology}?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 100,
        context: `Impacts migration duration and storage requirements`
      },
      integration_count: {
        text: `How many existing systems need to be integrated with ${technology}?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 1,
        context: `Each integration requires custom development and testing`
      },
      complexity: {
        text: `What is the overall ${technology} implementation complexity?`,
        type: "multiple_choice",
        options: ["Low - Standard setup", "Medium - Some customization", "High - Extensive customization"],
        calculationType: "multiplier",
        defaultValue: "Medium - Some customization"
      },
      security_level: {
        text: `What level of security compliance is required for ${technology}?`,
        type: "multiple_choice",
        options: ["Basic - Standard security", "Standard - Industry compliance", "Enhanced - High security/regulatory"],
        calculationType: "multiplier",
        defaultValue: "Standard - Industry compliance"
      },
      admin_count: {
        text: `How many administrators will manage the ${technology} system?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 2,
        context: `Each admin needs specialized training and documentation`
      },
      training_groups: {
        text: `How many separate training sessions are needed for ${technology} users?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 1,
        context: `Based on user roles, locations, or departments`
      },
      system_count: {
        text: `How many existing systems need to be assessed for ${technology} compatibility?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 1,
        context: `Each system requires analysis and testing`
      },
      test_scenarios: {
        text: `How many unique test scenarios need validation for ${technology}?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 10,
        context: `Includes functional, integration, and performance tests`
      },
      documentation_sets: {
        text: `How many different documentation packages are required for ${technology}?`,
        type: "number",
        calculationType: "quantity",
        defaultValue: 1,
        context: `Typically includes admin guides, user manuals, and technical docs`
      }
    };
    
    return templates[factor] || {
      text: `What is the value for ${factor.replace(/_/g, ' ')}?`,
      type: "number",
      calculationType: "quantity",
      defaultValue: 1
    };
  }

  /**
   * Find service names that use a specific scaling factor
   */
  private findServicesUsingFactor(factor: string, services: Service[]): string[] {
    const using: string[] = [];
    
    services.forEach(service => {
      if (service.scalingFactors?.includes(factor) || 
          service.quantityDriver === factor ||
          JSON.stringify(service.calculationRules || {}).includes(factor)) {
        using.push(service.name);
      }
      
      // Check subservices too
      service.subservices?.forEach(sub => {
        if (sub.scalingFactors?.includes(factor) || 
            sub.quantityDriver === factor ||
            JSON.stringify(sub.calculationRules || {}).includes(factor)) {
          if (!using.includes(service.name)) {
            using.push(service.name);
          }
        }
      });
    });
    
    return using;
  }

  /**
   * Find all services/subservices that use a specific scaling factor
   */
  private findImpactedServices(factor: string, services: Service[]): string[] {
    const impacted: string[] = [];
    
    services.forEach(service => {
      // Check service-level factors
      if (service.scalingFactors?.includes(factor) || service.quantityDriver === factor) {
        if (service.id) impacted.push(service.id);
      }
      
      // Check subservice-level factors
      service.subservices?.forEach(sub => {
        if (sub.scalingFactors?.includes(factor) || sub.quantityDriver === factor) {
          if (sub.id) impacted.push(sub.id);
        }
      });
    });
    
    return impacted;
  }

  /**
   * Generate questions based on services and their scaling factors
   */
  async generateQuestionsFromServices(
    services: Service[],
    researchData: ResearchData,
    userRequest: string
  ): Promise<Question[]> {
    console.log('🎯 Generating questions from services with explicit mapping...');
    
    // Extract technology for more specific questions
    const technology = extractTechnologyName(userRequest);
    
    // Extract all unique scaling factors from services
    const scalingFactors = this.extractScalingFactors(services);
    console.log('📊 Unique scaling factors found:', Array.from(scalingFactors));
    
    const questions: Question[] = [];
    let questionId = 1;
    
    // Generate questions for each scaling factor with technology context
    scalingFactors.forEach(factor => {
      const template = this.getQuestionTemplateForFactor(factor, technology, researchData, services);
      const impactedServices = this.findImpactedServices(factor, services);
      
      const question: Question = {
        id: `q_${questionId++}`,
        text: template.text,
        question: template.text, // Set both for UI compatibility
        type: template.type,
        options: template.options,
        required: true,
        impacts: impactedServices,
        calculationType: template.calculationType,
        mappingKey: factor,
        defaultValue: template.defaultValue,
        slug: factor // Use factor as slug for easy mapping
      };
      
      questions.push(question);
      console.log(`✅ Generated specific question for ${factor} impacting ${impactedServices.length} services`);
    });
    
    // Add context-specific questions based on research with systematic scaling factor coverage
    try {
      const contextQuestions = await this.generateContextSpecificQuestions(
        userRequest,
        researchData,
        services,
        questions
      );
      
      // Add context questions with proper mapping
      contextQuestions.forEach(cq => {
        // Find which services might be impacted based on question content
        const impacted = this.inferImpactedServices(cq.text, services);
        questions.push({
          ...cq,
          id: `q_${questionId++}`,
          question: cq.text || cq.question, // Ensure question field is set
          impacts: impacted,
          slug: cq.slug || this.generateSlug(cq.text || cq.question || '')
        });
      });
      
    } catch (error) {
      console.warn('Could not generate context-specific questions:', error);
    }
    
    console.log(`📝 Generated ${questions.length} questions with explicit service mappings`);
    return questions;
  }

  /**
   * Generate additional context-specific questions based on research
   */
  private async generateContextSpecificQuestions(
    userRequest: string,
    researchData: ResearchData,
    services: Service[],
    existingQuestions: Question[]
  ): Promise<Question[]> {
    const existingFactors = existingQuestions.map(q => q.mappingKey);
    
    // Define systematic scaling factor types we want to ensure coverage for
    const scalingTypes = [
      { category: 'Scale/Volume', factors: ['user_count', 'mailbox_count', 'data_volume_gb', 'device_count'] },
      { category: 'Complexity', factors: ['complexity', 'security_level', 'integration_complexity'] },  
      { category: 'Geography/Distribution', factors: ['site_count', 'location_count', 'region_count'] },
      { category: 'Integration/Dependencies', factors: ['integration_count', 'system_count', 'third_party_count'] },
      { category: 'Support/Training', factors: ['admin_count', 'training_groups', 'support_level'] },
      { category: 'Timeline/Approach', factors: ['migration_approach', 'downtime_tolerance', 'rollout_strategy'] }
    ];
    
    // Find which scaling types are not yet covered
    const uncoveredTypes = scalingTypes.filter(type => 
      !type.factors.some(factor => existingFactors.includes(factor))
    );
    
    const prompt = `Based on research about "${userRequest}", generate exactly 3-4 scoping questions that cover these UNCOVERED scaling dimensions:

${uncoveredTypes.map(type => `${type.category}: ${type.factors.join(', ')}`).join('\n')}

Research insights: ${researchData.keyInsights.slice(0, 3).join(', ')}

Requirements:
1. Generate questions specific to "${userRequest}" using the research context
2. Each question should target one of the uncovered scaling dimensions above
3. Questions should be practical and affect project scope/effort
4. Use appropriate question types (number for quantities, multiple_choice for complexity/approach)

Return ONLY valid JSON array:
[
  {
    "text": "specific question about ${userRequest}",
    "type": "multiple_choice" or "number", 
    "options": ["option1", "option2", "option3"] (if multiple_choice),
    "mappingKey": "factor_from_uncovered_list_above",
    "calculationType": "quantity" or "multiplier" or "include_exclude",
    "defaultValue": "appropriate default"
  }
]`;

    try {
      console.log('🔍 Question Generator V2 - Calling AI for context questions...');
      console.log('📋 Uncovered scaling types:', uncoveredTypes.length);
      
      const response = await this.client.generateWithTimeout(
        prompt,
        30000,
        'anthropic/claude-3.5-sonnet'
      );
      
      console.log('📝 Question AI Response length:', response.length);
      console.log('📝 Question AI Response preview:', response.substring(0, 300));
      
      const cleaned = response.replace(/```json|```/g, '').trim();
      console.log('🧹 Cleaned question response:', cleaned.substring(0, 200));
      
      if (!cleaned) {
        console.error('❌ Empty response from question AI');
        return [];
      }
      
      const questions = JSON.parse(cleaned);
      console.log('✅ Successfully parsed', questions.length, 'context questions');
      return questions;
    } catch (error) {
      console.error('❌ Failed to generate context questions:', error);
      console.error('📝 Error details:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Infer which services are impacted by a question based on text matching
   */
  private inferImpactedServices(questionText: string, services: Service[]): string[] {
    const impacted: string[] = [];
    const lowerText = questionText.toLowerCase();
    
    services.forEach(service => {
      const serviceName = service.name.toLowerCase();
      const serviceDesc = service.description.toLowerCase();
      
      // Check if question relates to this service
      if (this.isRelated(lowerText, serviceName) || this.isRelated(lowerText, serviceDesc)) {
        if (service.id) impacted.push(service.id);
      }
      
      // Check subservices
      service.subservices?.forEach(sub => {
        const subName = sub.name.toLowerCase();
        const subDesc = sub.description.toLowerCase();
        
        if (this.isRelated(lowerText, subName) || this.isRelated(lowerText, subDesc)) {
          if (sub.id) impacted.push(sub.id);
        }
      });
    });
    
    return impacted;
  }

  /**
   * Check if question text is related to service text
   */
  private isRelated(questionText: string, serviceText: string): boolean {
    // Extract key terms from both
    const questionTerms = this.extractKeyTerms(questionText);
    const serviceTerms = this.extractKeyTerms(serviceText);
    
    // Check for overlap
    return questionTerms.some(qt => serviceTerms.includes(qt));
  }

  /**
   * Extract key terms from text for matching
   */
  private extractKeyTerms(text: string): string[] {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'for', 'to', 'of', 'in', 'with'];
    
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
  }

  /**
   * Generate a slug from question text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }
}

// Export singleton getter
let questionGeneratorV2Instance: QuestionGeneratorV2 | null = null;

export function getQuestionGeneratorV2(client: OpenRouterClient): QuestionGeneratorV2 {
  if (!questionGeneratorV2Instance) {
    questionGeneratorV2Instance = new QuestionGeneratorV2(client);
  }
  return questionGeneratorV2Instance;
}