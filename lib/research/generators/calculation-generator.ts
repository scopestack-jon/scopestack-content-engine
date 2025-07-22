// Dynamic Quantity-Based Calculation Generation
// Creates actual calculations that compute quantities and map to service hours

import { Question, Calculation, Service } from '../types/interfaces';

export class CalculationGenerator {
  private idCounter = 0;

  /**
   * Generate a unique ID for calculations
   */
  private generateUniqueId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  /**
   * Generates dynamic quantity-based calculations that map question inputs to service hours
   */
  generateCalculationsFromQuestions(questions: Question[], services: Service[]): Calculation[] {
    const calculations: Calculation[] = [];
    
    // Step 1: Create optimized lookups for performance
    const quantityQuestions = this.identifyQuantityQuestions(questions);
    const serviceMap = this.createServiceLookupMap(services);
    
    // Step 2: Create question-based calculations with optimized service lookup
    for (const question of quantityQuestions) {
      const relatedServices = this.findServicesForQuestionOptimized(question, serviceMap);
      const calculation = this.createQuestionToServiceCalculation(question, relatedServices);
      if (calculation) {
        calculations.push(calculation);
      }
    }
    
    // Step 3: Create service-specific calculations
    for (const service of services) {
      const serviceCalculations = this.createServiceSpecificCalculations(service, questions);
      calculations.push(...serviceCalculations);
    }
    
    // Step 4: Add overhead calculation
    calculations.push({
      id: this.generateUniqueId('calc_overhead'),
      name: "Project Management Overhead",
      value: "0.15",
      formula: "total_hours × 0.15",
      unit: "percentage",
      source: "Standard 15% PM overhead applied to total project hours",
      mappedQuestions: [],
      mappedServices: services.map(s => s.name)
    });
    
    return calculations;
  }

  /**
   * Identify questions that represent quantities (users, mailboxes, servers, etc.)
   */
  private identifyQuantityQuestions(questions: Question[]): Question[] {
    const quantityKeywords = [
      'how many', 'number of', 'quantity', 'count', 'total',
      'users', 'mailboxes', 'servers', 'licenses', 'devices',
      'endpoints', 'workstations', 'sites', 'locations',
      'gigabytes', 'terabytes', 'gb', 'tb', 'storage',
      'hours', 'days', 'weeks', 'months'
    ];
    
    return questions.filter(question => {
      const text = question.text.toLowerCase();
      return quantityKeywords.some(keyword => text.includes(keyword));
    });
  }

  /**
   * Create effort mappings based on common service patterns
   */
  private createEffortMappings(questions: Question[], services: Service[]): Map<string, number> {
    const mappings = new Map<string, number>();
    
    // Standard effort rates (hours per unit)
    mappings.set('mailbox_migration', 0.5);  // 0.5 hours per mailbox
    mappings.set('user_training', 2.0);      // 2 hours per user
    mappings.set('server_setup', 8.0);       // 8 hours per server
    mappings.set('workstation_config', 1.5); // 1.5 hours per workstation
    mappings.set('site_deployment', 16.0);   // 16 hours per site
    mappings.set('license_provisioning', 0.25); // 0.25 hours per license
    mappings.set('data_migration_gb', 0.1);   // 0.1 hours per GB
    mappings.set('security_review', 4.0);     // 4 hours per endpoint
    
    return mappings;
  }

  /**
   * Create optimized service lookup map for performance
   */
  private createServiceLookupMap(services: Service[]): Map<string, Service[]> {
    const lookupMap = new Map<string, Service[]>();
    const keywords = ['migration', 'training', 'execution', 'implementation', 'monitoring', 'testing'];
    
    for (const keyword of keywords) {
      const matchingServices = services.filter(service => 
        service.name.toLowerCase().includes(keyword) || 
        service.description.toLowerCase().includes(keyword)
      );
      lookupMap.set(keyword, matchingServices);
    }
    
    return lookupMap;
  }

  /**
   * Optimized service lookup using pre-built map
   */
  private findServicesForQuestionOptimized(question: Question, serviceMap: Map<string, Service[]>): Service[] {
    const text = question.text.toLowerCase();
    const relatedServices: Service[] = [];
    
    if (text.includes('mailbox')) {
      relatedServices.push(...(serviceMap.get('migration') || []));
    }
    if (text.includes('user')) {
      relatedServices.push(...(serviceMap.get('training') || []));
    }
    if (text.includes('server')) {
      relatedServices.push(...(serviceMap.get('execution') || []));
      relatedServices.push(...(serviceMap.get('implementation') || []));
    }
    if (text.includes('test')) {
      relatedServices.push(...(serviceMap.get('monitoring') || []));
      relatedServices.push(...(serviceMap.get('testing') || []));
    }
    
    // Remove duplicates
    return [...new Set(relatedServices)];
  }

  /**
   * Find services that relate to a specific question (legacy method)
   */
  private findServicesForQuestion(question: Question, services: Service[]): Service[] {
    const text = question.text.toLowerCase();
    const relatedServices: Service[] = [];
    
    services.forEach(service => {
      const serviceName = service.name.toLowerCase();
      const serviceDesc = service.description.toLowerCase();
      
      // Check if question relates to service activities
      if (text.includes('mailbox') && (serviceName.includes('migration') || serviceDesc.includes('migration'))) {
        relatedServices.push(service);
      } else if (text.includes('user') && (serviceName.includes('training') || serviceDesc.includes('training'))) {
        relatedServices.push(service);
      } else if (text.includes('server') && (serviceName.includes('execution') || serviceName.includes('implementation'))) {
        relatedServices.push(service);
      } else if (text.includes('test') && (serviceName.includes('monitoring') || serviceName.includes('testing'))) {
        relatedServices.push(service);
      }
    });
    
    return relatedServices;
  }

  /**
   * Create a calculation that maps a question to specific services
   */
  private createQuestionToServiceCalculation(question: Question, relatedServices: Service[]): Calculation | null {
    const text = question.text.toLowerCase();
    const questionSlug = question.slug || this.generateSlug(question.text);
    const serviceNames = relatedServices.map(s => s.name);
    
    if (relatedServices.length === 0) {
      return null; // Skip if no related services found
    }
    
    // Map question types to calculation formulas with service references
    if (text.includes('mailbox') && text.includes('how many')) {
      return {
        id: this.generateUniqueId('calc_mailbox'),
        name: `${question.text} → Affects ${serviceNames.join(', ')}`,
        value: "0.5",
        formula: "mailbox_count × 0.5",
        unit: "hours per mailbox",
        source: `This question scales effort for: ${serviceNames.join(', ')}`,
        mappedQuestions: [questionSlug],
        mappedServices: serviceNames
      };
    }
    
    if (text.includes('user') && (text.includes('how many') || text.includes('number'))) {
      return {
        id: this.generateUniqueId('calc_user'),
        name: `${question.text} → Affects ${serviceNames.join(', ')}`,
        value: "2.0",
        formula: "user_count × 2.0",
        unit: "hours per user", 
        source: `This question scales effort for: ${serviceNames.join(', ')}`,
        mappedQuestions: [questionSlug],
        mappedServices: serviceNames
      };
    }
    
    if (text.includes('server') && text.includes('how many')) {
      return {
        id: this.generateUniqueId('calc_server'),
        name: `${question.text} → Affects ${serviceNames.join(', ')}`,
        value: "8.0",
        formula: "server_count × 8.0",
        unit: "hours per server",
        source: `This question scales effort for: ${serviceNames.join(', ')}`,
        mappedQuestions: [questionSlug],
        mappedServices: serviceNames
      };
    }
    
    if (text.includes('storage') || text.includes('gb') || text.includes('terabyte')) {
      return {
        id: this.generateUniqueId('calc_storage'),
        name: `${question.text} → Affects ${serviceNames.join(', ')}`,
        value: "0.1",
        formula: "storage_gb × 0.1",
        unit: "hours per GB",
        source: `This question scales effort for: ${serviceNames.join(', ')}`,
        mappedQuestions: [questionSlug],
        mappedServices: serviceNames
      };
    }
    
    if (text.includes('site') || text.includes('location')) {
      return {
        id: this.generateUniqueId('calc_site'),
        name: `${question.text} → Site Deployment Hours`,
        value: "16.0",
        formula: "site_count × 16.0",
        unit: "hours",
        source: `Calculation: Number of sites × 16.0 hours per site deployment`,
        mappedQuestions: [questionSlug]
      };
    }
    
    if (text.includes('workstation') || text.includes('endpoint')) {
      return {
        id: this.generateUniqueId('calc_workstation'),
        name: `${question.text} → Workstation Configuration Hours`,
        value: "1.5",
        formula: "workstation_count × 1.5",
        unit: "hours",
        source: `Calculation: Number of workstations × 1.5 hours per workstation configuration`,
        mappedQuestions: [questionSlug]
      };
    }
    
    // Fallback: create a generic calculation for any quantity question that doesn't match specific patterns
    if (relatedServices.length > 0 && (text.includes('how many') || text.includes('number of'))) {
      return {
        id: this.generateUniqueId('calc_generic'),
        name: `${question.text} → Affects ${serviceNames.join(', ')}`,
        value: "1.0",
        formula: "quantity × 1.0",
        unit: "hours per unit",
        source: `Generic scaling calculation for: ${serviceNames.join(', ')}`,
        mappedQuestions: [questionSlug],
        mappedServices: serviceNames
      };
    }
    
    return null;
  }

  /**
   * Create service-specific calculations that reference actual subservices
   */
  private createServiceSpecificCalculations(service: Service, questions: Question[]): Calculation[] {
    const calculations: Calculation[] = [];
    
    if (!service.subservices || service.subservices.length === 0) {
      return calculations;
    }
    
    // Look for subservices that would benefit from quantity calculations
    service.subservices.forEach(subservice => {
      const subName = subservice.name.toLowerCase();
      const subDesc = subservice.description.toLowerCase();
      
      // Data migration subservice
      if ((subName.includes('data') || subName.includes('migration')) && 
          (subName.includes('migrate') || subDesc.includes('migrate'))) {
        calculations.push({
          id: this.generateUniqueId('calc_data_migration'),
          name: `${service.name}: ${subservice.name} Scaling`,
          value: "0.1",
          formula: "data_volume × migration_rate + ${subservice.hours}",
          unit: "hours",
          source: `Scales ${subservice.name} (base: ${subservice.hours}h) based on data volume`,
          mappedQuestions: this.findRelatedQuestions(questions, ['storage', 'data', 'gb', 'migration']),
          mappedServices: [service.name]
        });
      }
      
      // User training subservice
      if (subName.includes('training') || subName.includes('knowledge transfer')) {
        calculations.push({
          id: this.generateUniqueId('calc_user_training'),
          name: `${service.name}: ${subservice.name} Scaling`,
          value: "2.0",
          formula: "user_count × 2.0 + ${subservice.hours}",
          unit: "hours", 
          source: `Scales ${subservice.name} (base: ${subservice.hours}h) based on user count`,
          mappedQuestions: this.findRelatedQuestions(questions, ['user', 'people', 'employee']),
          mappedServices: [service.name]
        });
      }
      
      // Testing subservice
      if (subName.includes('test') || subName.includes('validation')) {
        calculations.push({
          id: this.generateUniqueId('calc_testing'),
          name: `${service.name}: ${subservice.name} Scaling`,
          value: "0.5",
          formula: "test_cases × 0.5 + ${subservice.hours}",
          unit: "hours",
          source: `Scales ${subservice.name} (base: ${subservice.hours}h) based on test scope`,
          mappedQuestions: this.findRelatedQuestions(questions, ['test', 'environment', 'system']),
          mappedServices: [service.name]
        });
      }
    });
    
    return calculations;
  }

  /**
   * Calculate total project hours including all dynamic calculations
   */
  calculateTotalHours(services: Service[], calculations: Calculation[]): number {
    // Sum base service hours
    let totalHours = services.reduce((total, service) => {
      const serviceHours = service.subservices.reduce((subTotal, sub) => subTotal + (sub.hours || 0), 0);
      return total + serviceHours;
    }, 0);
    
    // Apply overhead
    const overheadCalc = calculations.find(c => c.name.includes('Overhead'));
    if (overheadCalc && overheadCalc.unit === 'percentage') {
      const overheadRate = parseFloat(overheadCalc.value) || 0.15;
      totalHours = totalHours * (1 + overheadRate);
    }
    
    return Math.round(totalHours);
  }

  /**
   * Generate a slug from question text
   */
  private generateSlug(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Find related questions based on keywords
   */
  private findRelatedQuestions(questions: Question[], keywords: string[]): string[] {
    return questions
      .filter(question => {
        const text = question.text.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      })
      .map(question => question.slug || this.generateSlug(question.text))
      .slice(0, 3); // Limit to 3 related questions
  }
}

// Export singleton instance
export function getCalculationGenerator() {
  return new CalculationGenerator();
}