// Content Validation and Error Handling
// Validates generated content and provides fallbacks

import { GeneratedContent, Question, Service, Calculation, ResearchSource } from '../types/interfaces';

export class ContentValidator {
  private idCounter = 0;

  /**
   * Generate a unique ID
   */
  private generateUniqueId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  /**
   * Generate a short, readable question slug (15 chars max)
   */
  private generateQuestionSlug(questionText: string): string {
    // Extract key words and create meaningful short slug
    const text = questionText.toLowerCase();
    
    if (text.includes('how many')) {
      if (text.includes('user')) return 'users_count';
      if (text.includes('mailbox')) return 'mailbox_count';
      if (text.includes('server')) return 'server_count';
      if (text.includes('site') || text.includes('location')) return 'site_count';
      if (text.includes('workstation') || text.includes('endpoint')) return 'endpoint_count';
      return 'quantity';
    }
    
    if (text.includes('storage') || text.includes('gb') || text.includes('tb')) return 'storage_size';
    if (text.includes('budget') || text.includes('cost')) return 'budget';
    if (text.includes('timeline') || text.includes('deadline')) return 'timeline';
    if (text.includes('priority')) return 'priority';
    if (text.includes('existing') || text.includes('current')) return 'current_state';
    if (text.includes('compliance') || text.includes('regulation')) return 'compliance';
    if (text.includes('security')) return 'security';
    if (text.includes('integration')) return 'integration';
    if (text.includes('training')) return 'training_need';
    if (text.includes('support')) return 'support_level';
    
    // Fallback: create slug from first meaningful words
    return questionText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 2)
      .join('_')
      .substring(0, 15);
  }

  /**
   * Detect if a question expects a numerical answer
   */
  private isNumericalQuestion(questionText: string): boolean {
    const text = questionText.toLowerCase();
    
    // Common patterns for numerical questions
    const numericalPatterns = [
      'how many',
      'number of', 
      'quantity',
      'count',
      'size',
      'gb',
      'tb',
      'terabytes',
      'gigabytes',
      'hours',
      'days',
      'weeks',
      'months',
      'years',
      'budget',
      'cost',
      'price',
      'amount'
    ];
    
    return numericalPatterns.some(pattern => text.includes(pattern));
  }

  /**
   * Validates and sanitizes generated content
   */
  validateContent(content: Partial<GeneratedContent>): GeneratedContent {
    return {
      technology: this.validateTechnology(content.technology),
      questions: this.validateQuestions(content.questions || []),
      services: this.validateServices(content.services || []),
      calculations: this.validateCalculations(content.calculations || []),
      sources: this.validateSources(content.sources || []),
      totalHours: this.validateTotalHours(content.totalHours)
    };
  }

  /**
   * Validates technology name
   */
  private validateTechnology(technology?: string): string {
    if (!technology || typeof technology !== 'string' || technology.trim().length === 0) {
      return 'Technology Solution';
    }
    return technology.trim();
  }

  /**
   * Validates questions array
   */
  private validateQuestions(questions: any[]): Question[] {
    if (!Array.isArray(questions)) {
      return this.getDefaultQuestions();
    }

    const validQuestions = questions.filter(q => this.isValidQuestion(q))
      .map(q => this.sanitizeQuestion(q));

    return validQuestions.length > 0 ? validQuestions : this.getDefaultQuestions();
  }

  /**
   * Validates services array - NO fallbacks, research-driven only
   */
  private validateServices(services: any[]): Service[] {
    if (!Array.isArray(services)) {
      throw new Error('Services must be an array generated from research');
    }

    const validServices = services.filter(s => this.isValidService(s))
      .map(s => this.sanitizeService(s));

    if (validServices.length === 0) {
      throw new Error('No valid services generated from research');
    }

    return validServices;
  }

  /**
   * Validates calculations array
   */
  private validateCalculations(calculations: any[]): Calculation[] {
    if (!Array.isArray(calculations)) {
      return this.getDefaultCalculations();
    }

    const validCalculations = calculations.filter(c => this.isValidCalculation(c))
      .map(c => this.sanitizeCalculation(c));

    return validCalculations.length > 0 ? validCalculations : this.getDefaultCalculations();
  }

  /**
   * Validates sources array
   */
  private validateSources(sources: any[]): ResearchSource[] {
    if (!Array.isArray(sources)) {
      return [];
    }

    return sources.filter(s => this.isValidSource(s))
      .map(s => this.sanitizeSource(s));
  }

  /**
   * Validates total hours
   */
  private validateTotalHours(totalHours?: number): number {
    if (typeof totalHours === 'number' && totalHours > 0) {
      return Math.round(totalHours);
    }
    return 40; // Default minimum hours
  }

  // Validation helpers

  private isValidQuestion(question: any): boolean {
    return question && 
           typeof question === 'object' && 
           typeof question.text === 'string' && 
           question.text.trim().length > 0;
  }

  private isValidService(service: any): boolean {
    return service && 
           typeof service === 'object' && 
           typeof service.name === 'string' && 
           service.name.trim().length > 0;
  }

  private isValidCalculation(calculation: any): boolean {
    return calculation && 
           typeof calculation === 'object' && 
           typeof calculation.name === 'string' && 
           calculation.name.trim().length > 0;
  }

  private isValidSource(source: any): boolean {
    return source && 
           typeof source === 'object' && 
           typeof source.title === 'string' && 
           typeof source.url === 'string' &&
           source.title.trim().length > 0 &&
           source.url.trim().length > 0;
  }

  // Sanitization methods

  private sanitizeQuestion(question: any): Question {
    const questionText = String(question.text || question.question || 'Question').trim();
    
    // Always generate shorter, more readable slug (15 chars max) - override AI-generated slugs
    const slug = this.generateQuestionSlug(questionText);
    
    // Determine if this is a numerical question
    const isNumericalQuestion = this.isNumericalQuestion(questionText);
    const questionType = isNumericalQuestion ? 'number' : 
      (this.isValidQuestionType(question.type) ? question.type : 'multiple_choice');

    return {
      id: question.id || this.generateUniqueId('q'),
      text: questionText,
      question: questionText, // Frontend compatibility
      slug: slug, // Frontend compatibility
      type: questionType,
      options: isNumericalQuestion ? undefined : (
        Array.isArray(question.options) ? question.options : [
          { key: "Yes", value: 1, default: true },
          { key: "No", value: 0, default: false }
        ]
      ),
      required: question.required !== false // Default to true
    } as any; // Use any to accommodate both interfaces
  }

  private sanitizeService(service: any): Service {
    return {
      name: String(service.name || service.service || 'Service').trim(),
      description: String(service.description || 'Service description').trim(),
      hours: this.sanitizeHours(service.hours),
      phase: String(service.phase || 'Implementation').trim(),
      subservices: Array.isArray(service.subservices) 
        ? service.subservices.map(this.sanitizeSubservice.bind(this)) 
        : [],
      serviceDescription: String(service.serviceDescription || service.description || '').trim(),
      keyAssumptions: String(service.keyAssumptions || '').trim(),
      clientResponsibilities: String(service.clientResponsibilities || '').trim(),
      outOfScope: String(service.outOfScope || '').trim()
    };
  }

  private sanitizeSubservice(subservice: any): any {
    return {
      name: String(subservice.name || 'Subservice').trim(),
      description: String(subservice.description || 'Subservice description').trim(),
      hours: this.sanitizeHours(subservice.hours),
      serviceDescription: String(subservice.serviceDescription || '').trim(),
      keyAssumptions: String(subservice.keyAssumptions || '').trim(),
      clientResponsibilities: String(subservice.clientResponsibilities || '').trim(),
      outOfScope: String(subservice.outOfScope || '').trim()
    };
  }

  private sanitizeCalculation(calculation: any): Calculation {
    return {
      id: calculation.id || this.generateUniqueId('calc'),
      name: String(calculation.name || 'Calculation').trim(),
      value: calculation.value || '1.0',
      formula: calculation.formula || null,
      unit: String(calculation.unit || 'multiplier').trim(),
      source: String(calculation.source || 'Generated calculation').trim(),
      mappedQuestions: Array.isArray(calculation.mappedQuestions) ? calculation.mappedQuestions : [],
      mappedServices: Array.isArray(calculation.mappedServices) ? calculation.mappedServices : []
    };
  }

  private sanitizeSource(source: any): ResearchSource {
    return {
      title: String(source.title).trim(),
      url: String(source.url).trim(),
      summary: String(source.summary || '').trim(),
      credibility: this.isValidCredibility(source.credibility) ? source.credibility : 'medium',
      relevance: this.sanitizeRelevance(source.relevance),
      sourceType: this.isValidSourceType(source.sourceType) ? source.sourceType : 'other'
    };
  }

  // Utility methods

  private isValidQuestionType(type: any): boolean {
    return ['multiple_choice', 'text', 'number', 'boolean'].includes(type);
  }

  private isValidCredibility(credibility: any): boolean {
    return ['high', 'medium', 'low'].includes(credibility);
  }

  private isValidSourceType(sourceType: any): boolean {
    return ['documentation', 'guide', 'case_study', 'vendor', 'community', 'blog', 'news', 'other'].includes(sourceType);
  }

  private sanitizeHours(hours: any): number {
    const parsed = typeof hours === 'number' ? hours : parseFloat(hours);
    return isNaN(parsed) || parsed < 0 ? 8 : Math.round(parsed);
  }

  private sanitizeRelevance(relevance: any): number {
    const parsed = typeof relevance === 'number' ? relevance : parseFloat(relevance);
    if (isNaN(parsed)) return 0.5;
    return Math.max(0, Math.min(1, parsed));
  }

  // Default fallbacks

  private getDefaultQuestions(): Question[] {
    return [
      {
        text: "What is the primary scope of your project?",
        type: 'multiple_choice',
        options: ["New implementation", "Upgrade/migration", "Configuration changes"],
        required: true
      },
      {
        text: "What is the size of your environment?",
        type: 'multiple_choice', 
        options: ["Small (1-50 users)", "Medium (51-500 users)", "Large (501+ users)"],
        required: true
      }
    ];
  }

  private getDefaultServices(): Service[] {
    return [
      {
        name: "Requirements Assessment",
        description: "Assessment of current environment and requirements",
        hours: 40,
        phase: "Assessment",
        subservices: []
      },
      {
        name: "Implementation",
        description: "Core implementation and configuration",
        hours: 80,
        phase: "Implementation", 
        subservices: []
      }
    ];
  }

  private getDefaultCalculations(): Calculation[] {
    return [
      {
        name: "Base Implementation Complexity",
        value: "1.2",
        unit: "multiplier",
        source: "Standard complexity factor for implementation projects"
      }
    ];
  }
}

// Singleton instance
let contentValidatorInstance: ContentValidator | null = null;

export function getContentValidator(): ContentValidator {
  if (!contentValidatorInstance) {
    contentValidatorInstance = new ContentValidator();
  }
  return contentValidatorInstance;
}