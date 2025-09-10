// Research Orchestrator v2
// Service-first orchestration with explicit question-to-service mapping

import { getPerplexityEngine } from '../engines/perplexity-research';
import { getServiceGeneratorV2 } from '../generators/service-generator-v2';
import { getQuestionGeneratorV2 } from '../generators/question-generator-v2';
import { getCalculationEngineV2 } from '../generators/calculation-engine-v2';
import { getOpenRouterClient } from '../api/openrouter-client';
import { getContentValidator } from '../validation/content-validator';
import { GeneratedContent, ResearchData, StreamingEvent } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class ResearchOrchestratorV2 {
  private perplexityEngine = getPerplexityEngine();
  private openRouterClient = getOpenRouterClient();
  private serviceGeneratorV2 = getServiceGeneratorV2(this.openRouterClient);
  private questionGeneratorV2 = getQuestionGeneratorV2(this.openRouterClient);
  private calculationEngine = getCalculationEngineV2();
  private validator = getContentValidator();

  /**
   * Validates the user request
   */
  validateRequest(userRequest: string): { valid: boolean; error?: string } {
    if (!userRequest || userRequest.trim().length < 3) {
      return { valid: false, error: 'Request is too short' };
    }
    
    if (userRequest.length > 500) {
      return { valid: false, error: 'Request is too long (max 500 characters)' };
    }
    
    return { valid: true };
  }

  /**
   * Service-first orchestration flow
   */
  async generateContent(
    userRequest: string,
    onProgress?: (event: StreamingEvent) => void
  ): Promise<GeneratedContent> {
    try {
      console.log('🚀🚀🚀 USING V2 ORCHESTRATOR - SERVICE-FIRST FLOW 🚀🚀🚀');
      console.log('🚀 Starting service-first orchestration v2...');
      
      // Step 1: Research
      onProgress?.({
        type: 'step',
        stepId: 'research',
        status: 'in-progress',
        progress: 10
      });

      const researchData = await this.perplexityEngine.performResearch(userRequest);
      console.log(`✅ Research complete with ${researchData.sources.length} sources`);

      onProgress?.({
        type: 'progress',
        progress: 30,
        sources: researchData.sources.map(s => s.title)
      });

      // Step 2: Generate services with scaling metadata
      onProgress?.({
        type: 'step',
        stepId: 'services',
        status: 'in-progress',
        progress: 40
      });

      const services = await this.serviceGeneratorV2.generateServicesFromResearch(
        researchData,
        userRequest
      );
      console.log(`✅ Generated ${services.length} services with scaling metadata`);

      onProgress?.({
        type: 'step',
        stepId: 'services',
        status: 'completed',
        progress: 50
      });

      // Step 3: Generate questions based on services
      onProgress?.({
        type: 'step',
        stepId: 'questions',
        status: 'in-progress',
        progress: 60
      });

      const questions = await this.questionGeneratorV2.generateQuestionsFromServices(
        services,
        researchData,
        userRequest
      );
      console.log(`✅ Generated ${questions.length} questions with service mappings`);

      onProgress?.({
        type: 'step',
        stepId: 'questions',
        status: 'completed',
        progress: 70
      });

      // Step 4: Apply default calculations
      onProgress?.({
        type: 'step',
        stepId: 'calculations',
        status: 'in-progress',
        progress: 80
      });

      // Start with empty responses (quantities should default to 1 until user provides input)
      const emptyResponses: Record<string, any> = {};
      // Don't apply question defaults immediately - wait for user input

      // Apply calculations to services (with empty responses initially)
      const calculatedServices = this.calculationEngine.applyResponsesToServices(
        services,
        questions,
        emptyResponses
      );

      // Generate calculation objects
      const calculations = this.calculationEngine.generateCalculations(
        calculatedServices,
        questions,
        emptyResponses
      );
      console.log(`✅ Generated ${calculations.length} calculations`);

      onProgress?.({
        type: 'step',
        stepId: 'calculations',
        status: 'completed',
        progress: 90
      });

      // Step 5: Calculate total hours
      const totalHours = this.calculateTotalHours(calculatedServices);

      // Build final content
      const content: GeneratedContent = {
        technology: extractTechnologyName(userRequest),
        questions: questions,
        services: calculatedServices,
        calculations: calculations,
        sources: researchData.sources,
        totalHours: totalHours
      };

      // Validate content
      const validation = this.validator.validateContent(content);
      if (!validation.valid) {
        console.warn('Content validation warnings:', validation.warnings);
      }

      onProgress?.({
        type: 'complete',
        progress: 100,
        content: content
      });

      console.log('✅ Content generation complete with service-first flow');
      return content;

    } catch (error) {
      console.error('❌ Orchestration error:', error);
      
      onProgress?.({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      throw error;
    }
  }

  /**
   * Calculate total hours from services
   */
  private calculateTotalHours(services: any[]): number {
    let total = 0;

    services.forEach(service => {
      if (service.subservices && service.subservices.length > 0) {
        service.subservices.forEach((sub: any) => {
          const quantity = sub.quantity || 1;
          const hours = sub.baseHours || sub.hours || 0;
          total += Math.round((quantity * hours) * 100) / 100;
        });
      } else {
        const quantity = service.quantity || 1;
        const hours = service.baseHours || service.hours || 0;
        total += Math.round((quantity * hours) * 100) / 100;
      }
    });

    return Math.round(total * 100) / 100;
  }

  /**
   * Apply dynamic responses to update service calculations
   * This can be called when users change question answers
   */
  async applyResponses(
    services: any[],
    questions: any[],
    responses: Map<string, any> | Record<string, any>
  ): Promise<any> {
    console.log('📊 Applying user responses to services...');
    
    // Apply calculations
    const updatedServices = this.calculationEngine.applyResponsesToServices(
      services,
      questions,
      responses
    );

    // Build response map for calculations
    const responseMap = responses instanceof Map ? 
      Object.fromEntries(responses) : 
      responses;

    // Generate updated calculations
    const calculations = this.calculationEngine.generateCalculations(
      updatedServices,
      questions,
      responseMap
    );

    // Calculate new total
    const totalHours = this.calculateTotalHours(updatedServices);

    return {
      services: updatedServices,
      calculations: calculations,
      totalHours: totalHours
    };
  }
}

// Export singleton
let orchestratorV2Instance: ResearchOrchestratorV2 | null = null;

export function getResearchOrchestratorV2(): ResearchOrchestratorV2 {
  if (!orchestratorV2Instance) {
    orchestratorV2Instance = new ResearchOrchestratorV2();
  }
  return orchestratorV2Instance;
}