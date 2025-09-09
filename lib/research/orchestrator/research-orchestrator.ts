// Research Orchestrator
// Coordinates the entire research and content generation workflow

import { getPerplexityEngine } from '../engines/perplexity-research';
import { getQuestionGenerator } from '../generators/question-generator';
import { getServiceGenerator } from '../generators/service-generator';
import { getCalculationGenerator } from '../generators/calculation-generator';
import { getCalculationMapper } from '../generators/calculation-mapper';
import { getContentValidator } from '../validation/content-validator';
import { GeneratedContent, ResearchData, StreamingEvent } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class ResearchOrchestrator {
  private perplexityEngine = getPerplexityEngine();
  private questionGenerator = getQuestionGenerator();
  private serviceGenerator = getServiceGenerator();
  private calculationGenerator = getCalculationGenerator();
  private calculationMapper = getCalculationMapper();
  private validator = getContentValidator();

  /**
   * Orchestrates the complete research and content generation workflow
   */
  async generateContent(
    userRequest: string,
    onProgress?: (event: StreamingEvent) => void
  ): Promise<GeneratedContent> {
    try {
      // Step 1: Conduct research
      onProgress?.({
        type: 'step',
        stepId: 'research',
        status: 'in-progress',
        progress: 10
      });

      const researchData = await this.perplexityEngine.performResearch(userRequest);

      onProgress?.({
        type: 'progress',
        progress: 30,
        sources: researchData.sources.map(s => s.title)
      });

      // Step 2: Generate content based on research
      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'in-progress',
        progress: 40
      });

      // Step 1: Generate questions and services in parallel for better performance
      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'in-progress',
        progress: 50
      });

      const [questions, services] = await Promise.all([
        this.questionGenerator.generateQuestionsFromResearch(researchData, userRequest),
        this.serviceGenerator.generateServicesFromResearch(researchData, userRequest)
      ]);

      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'completed',
        progress: 80
      });

      // Step 3: Generate calculations that reference actual questions and services
      onProgress?.({
        type: 'step',
        stepId: 'calculations',
        status: 'in-progress',
        progress: 85
      });

      const calculations = this.calculationGenerator.generateCalculationsFromQuestions(questions, services);

      // Apply calculations to services to set proper quantities
      // Create mock responses based on questions (for now, use default values)
      const mockResponses: Record<string, any> = {};
      questions.forEach(q => {
        const slug = q.slug || q.text.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
        const text = q.text.toLowerCase();
        
        // Set default quantities based on question patterns
        if (text.includes('mailbox')) {
          mockResponses[slug] = 100; // Default 100 mailboxes
        } else if (text.includes('user') || text.includes('pilot')) {
          // Check specific user types
          if (text.includes('pilot')) {
            mockResponses[slug] = 10; // Small pilot group
          } else if (text.includes('hybrid')) {
            mockResponses[slug] = 20; // Some hybrid users
          } else {
            mockResponses[slug] = 50; // Default 50 users
          }
        } else if (text.includes('server')) {
          mockResponses[slug] = 5; // Default 5 servers
        } else if (text.includes('domain')) {
          mockResponses[slug] = 3; // Default 3 domains
        } else if (text.includes('integration')) {
          mockResponses[slug] = 5; // Default 5 integrations
        } else if (text.includes('storage') || text.includes('gb')) {
          mockResponses[slug] = 10; // Default 10 GB per mailbox
        } else if (text.includes('downtime') || text.includes('hours')) {
          mockResponses[slug] = 4; // Default 4 hours downtime
        } else if (q.type === 'number') {
          mockResponses[slug] = 10; // Default number
        } else {
          mockResponses[slug] = q.options?.[0] || 'default';
        }
      });

      // Use the improved calculation mapper for better service matching
      const surveyCalculations = this.calculationMapper.generateCalculationsFromResponses(
        questions,
        mockResponses
      );
      
      console.log('📊 Generated survey calculations:', surveyCalculations.map(c => `${c.calculation_id}: ${c.value}`));
      
      // Enhance calculations with better formulas and question mappings after survey calculations are available
      const enhancedCalculations = this.enhanceCalculationsWithSurveyData(calculations, questions, surveyCalculations);
      
      // Apply the calculation mapper to services and subservices
      const servicesWithImprovedMapping = this.calculationMapper.applyCalculationsToServices(
        services,
        surveyCalculations,
        enhancedCalculations // Also pass regular calculations for additional mapping
      );
      
      // Map calculations to service recommendations
      const serviceRecommendations = this.calculationMapper.mapCalculationsToServices(
        surveyCalculations,
        servicesWithImprovedMapping
      );
      
      // Use CalculationMapper results directly - DO NOT override with old calculation generator
      // The CalculationMapper already handles both service and subservice quantities properly
      const finalServices = servicesWithImprovedMapping;

      onProgress?.({
        type: 'step',
        stepId: 'calculations',
        status: 'completed',
        progress: 90
      });

      // Calculate total hours using services with quantities
      const totalHours = this.calculationGenerator.calculateTotalHours(finalServices, enhancedCalculations);

      onProgress?.({
        type: 'progress',
        progress: 90
      });

      // Validate and compile final content
      const content: Partial<GeneratedContent> = {
        technology: extractTechnologyName(userRequest),
        questions,
        services: finalServices, // Use final services with merged quantities and subservice mappings
        calculations: enhancedCalculations, // Use enhanced calculations with better formulas and question mappings
        surveyCalculations, // Include ScopeStack-format calculations
        serviceRecommendations, // Include service recommendations
        sources: researchData.sources,
        totalHours
      };

      const validatedContent = this.validator.validateContent(content);

      onProgress?.({
        type: 'step',
        stepId: 'content',
        status: 'completed',
        progress: 100
      });

      onProgress?.({
        type: 'complete',
        progress: 100,
        content: validatedContent
      });

      return validatedContent;

    } catch (error) {
      console.error('❌ Research orchestration failed:', error);
      
      onProgress?.({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      // Re-throw error instead of providing empty fallback
      throw new Error(`Research-driven content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance calculations with better formulas and question mappings
   */
  private enhanceCalculationsWithSurveyData(
    calculations: Calculation[], 
    questions: Question[], 
    surveyCalculations: any[]
  ): Calculation[] {
    // Create mapping from question slugs to question text
    const questionMap = new Map<string, string>();
    questions.forEach(q => {
      const slug = q.slug || q.text.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
      questionMap.set(slug, q.text);
      
      // Also try exact text matching for better mapping
      const textSlug = q.text.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
      questionMap.set(textSlug, q.text);
    });

    // Create mapping from generic variables to actual survey calculation IDs
    const variableMap = new Map<string, string>();
    surveyCalculations.forEach(calc => {
      const id = calc.calculation_id;
      const desc = (calc.description || '').toLowerCase();
      
      if (id.includes('mailbox') || desc.includes('mailbox')) {
        variableMap.set('mailbox_count', id);
      } else if (id.includes('user_count') || desc.includes('number of users') || desc.includes('total users')) {
        variableMap.set('user_count', id);
        variableMap.set('test_cases', id); // Test cases often scale with user count in ServiceNow
      } else if (id.includes('integration') || desc.includes('integration') || desc.includes('system')) {
        variableMap.set('integration_count', id);
        variableMap.set('test_cases', id); // Test cases often scale with integrations
      } else if (id.includes('data') || desc.includes('data') || desc.includes('volume')) {
        variableMap.set('data_volume', id);
        variableMap.set('storage_gb', id);
      }
    });

    return calculations.map(calc => {
      const enhanced = { ...calc };
      
      // Fix formula by replacing generic variables with actual calculation IDs
      if (enhanced.formula) {
        let updatedFormula = enhanced.formula;
        variableMap.forEach((actualId, genericVar) => {
          updatedFormula = updatedFormula.replace(new RegExp(genericVar, 'g'), actualId);
        });
        
        // Clean up template variables that don't have actual values
        updatedFormula = updatedFormula.replace(/\s*\+\s*\${subservice\.hours}/g, ''); // Remove subservice.hours placeholder
        updatedFormula = updatedFormula.replace(/\s*\+\s*\${[^}]+}/g, ''); // Remove any other template variables
        
        enhanced.formula = updatedFormula;
      }

      // Enhance mapped questions with actual question text
      if (enhanced.mappedQuestions && enhanced.mappedQuestions.length > 0) {
        const enhancedQuestions: string[] = [];
        
        enhanced.mappedQuestions.forEach(slug => {
          // Try different matching strategies
          let questionText = questionMap.get(slug);
          
          if (!questionText) {
            // Try fuzzy matching - find question that contains similar words
            const slugWords = slug.toLowerCase().split('_');
            const matchingQuestion = questions.find(q => {
              const questionWords = q.text.toLowerCase().split(/\s+/);
              return slugWords.some(slugWord => 
                slugWord.length > 3 && questionWords.some(qWord => qWord.includes(slugWord))
              );
            });
            
            if (matchingQuestion) {
              questionText = matchingQuestion.text;
            }
          }
          
          if (questionText) {
            enhancedQuestions.push(questionText);
          } else {
            // Keep the slug as fallback but make it more readable
            enhancedQuestions.push(slug.replace(/_/g, ' '));
          }
        });
        
        enhanced.mappedQuestions = enhancedQuestions;
      }
      
      return enhanced;
    });
  }

  /**
   * Validates user request before processing
   */
  validateRequest(userRequest: string): { valid: boolean; error?: string } {
    if (!userRequest || typeof userRequest !== 'string') {
      return { valid: false, error: 'Request must be a non-empty string' };
    }

    const trimmed = userRequest.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Request cannot be empty' };
    }

    if (trimmed.length < 3) {
      return { valid: false, error: 'Request must be at least 3 characters long' };
    }

    if (trimmed.length > 1000) {
      return { valid: false, error: 'Request must be less than 1000 characters' };
    }

    return { valid: true };
  }

  /**
   * Gets research status and capabilities
   */
  getCapabilities(): {
    engines: string[];
    generators: string[];
    features: string[];
  } {
    return {
      engines: ['Perplexity Research Engine'],
      generators: ['Question Generator', 'Service Generator', 'Calculation Generator'],
      features: [
        'Live web research',
        'AI-driven content generation',
        'Research-based question creation',
        'Professional services scoping',
        'Dynamic calculation mapping',
        'Content validation and fallbacks'
      ]
    };
  }
}

// Singleton instance
let orchestratorInstance: ResearchOrchestrator | null = null;

export function getResearchOrchestrator(): ResearchOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ResearchOrchestrator();
  }
  return orchestratorInstance;
}