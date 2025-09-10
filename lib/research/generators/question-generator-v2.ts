// Service-Driven Question Generator v2
// Generates questions based on service scaling factors with explicit mapping

import { OpenRouterClient } from '../api/openrouter-client';
import { Service, Question, ResearchData } from '../types/interfaces';

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
   * Map scaling factors to question types and formats
   */
  private getQuestionTemplateForFactor(factor: string): any {
    const templates: Record<string, any> = {
      user_count: {
        text: "How many users will be using the system?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 100
      },
      mailbox_count: {
        text: "How many mailboxes need to be migrated?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 100
      },
      site_count: {
        text: "How many sites or locations are involved?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 1
      },
      data_volume_gb: {
        text: "What is the total data volume in GB?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 100
      },
      integration_count: {
        text: "How many third-party systems need to be integrated?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 1
      },
      complexity: {
        text: "What is the overall project complexity?",
        type: "multiple_choice",
        options: ["Low", "Medium", "High"],
        calculationType: "multiplier",
        defaultValue: "Medium"
      },
      security_level: {
        text: "What level of security is required?",
        type: "multiple_choice",
        options: ["Basic", "Standard", "Enhanced"],
        calculationType: "multiplier",
        defaultValue: "Standard"
      },
      admin_count: {
        text: "How many administrators need to be trained?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 2
      },
      training_groups: {
        text: "How many training groups are needed?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 1
      },
      system_count: {
        text: "How many existing systems need assessment?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 1
      },
      test_scenarios: {
        text: "How many test scenarios need to be validated?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 10
      },
      documentation_sets: {
        text: "How many documentation sets are required?",
        type: "number",
        calculationType: "quantity",
        defaultValue: 1
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
    
    // Extract all unique scaling factors from services
    const scalingFactors = this.extractScalingFactors(services);
    console.log('📊 Unique scaling factors found:', Array.from(scalingFactors));
    
    const questions: Question[] = [];
    let questionId = 1;
    
    // Generate questions for each scaling factor
    scalingFactors.forEach(factor => {
      const template = this.getQuestionTemplateForFactor(factor);
      const impactedServices = this.findImpactedServices(factor, services);
      
      const question: Question = {
        id: `q_${questionId++}`,
        text: template.text,
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
      console.log(`✅ Generated question for ${factor} impacting ${impactedServices.length} services`);
    });
    
    // Add context-specific questions based on research if needed
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
          impacts: impacted,
          slug: cq.slug || this.generateSlug(cq.text)
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
    
    const prompt = `Based on research about "${userRequest}", generate 2-3 additional scoping questions that are NOT covered by these factors: ${existingFactors.join(', ')}

Research insights: ${researchData.keyInsights.slice(0, 3).join(', ')}

Generate questions specific to ${userRequest} that would affect project scope.

Return ONLY valid JSON array:
[
  {
    "text": "specific question text",
    "type": "multiple_choice" or "number",
    "options": ["option1", "option2"] (if multiple_choice),
    "mappingKey": "unique_factor_name",
    "calculationType": "quantity" or "multiplier" or "include_exclude",
    "defaultValue": "default value"
  }
]`;

    try {
      const response = await this.client.generateWithTimeout(
        prompt,
        30000,
        'anthropic/claude-3.5-sonnet'
      );
      
      const cleaned = response.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to generate context questions:', error);
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