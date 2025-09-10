// Rule-Based Calculation Engine v2
// Applies question responses to services using explicit calculation rules

import { Service, Question, Calculation } from '../types/interfaces';

export interface QuestionResponse {
  questionId: string;
  mappingKey: string;
  value: any;
}

export class CalculationEngineV2 {
  
  /**
   * Apply question responses to services using their calculation rules
   */
  applyResponsesToServices(
    services: Service[],
    questions: Question[],
    responses: Map<string, any> | Record<string, any>
  ): Service[] {
    console.log('🔧🔧🔧 V2 CALCULATION ENGINE CALLED 🔧🔧🔧');
    console.log('🔧 Applying responses to services using calculation rules...');
    
    // Convert responses to a more accessible format
    const responseMap = this.buildResponseMap(questions, responses);
    console.log('📊 Response map:', responseMap);
    
    // Apply calculations to each service
    return services.map(service => this.calculateService(service, responseMap));
  }

  /**
   * Build a map of factor keys to their values from responses
   */
  private buildResponseMap(
    questions: Question[],
    responses: Map<string, any> | Record<string, any>
  ): Record<string, any> {
    const responseMap: Record<string, any> = {};
    
    questions.forEach(question => {
      const key = question.mappingKey || question.slug || question.id || '';
      let value: any;
      
      if (responses instanceof Map) {
        value = responses.get(question.id || '') || 
                responses.get(question.slug || '') ||
                question.defaultValue;
      } else {
        value = responses[question.id || ''] || 
                responses[question.slug || ''] ||
                question.defaultValue;
      }
      
      responseMap[key] = value;
    });
    
    return responseMap;
  }

  /**
   * Calculate quantities and multipliers for a service
   */
  private calculateService(service: Service, responseMap: Record<string, any>): Service {
    const updatedService = { ...service };
    
    // Services always have quantity = 1 (they represent phases, not scalable units)
    // Only subservices should scale based on question responses
    updatedService.quantity = 1;
    console.log(`  📌 Service ${service.name} quantity set to 1 (services don't scale)`);
    
    // Apply service-level calculations only if explicitly defined (fallback)
    if (service.calculationRules) {
      console.log(`  ⚠️ Service ${service.name} has calculation rules but services shouldn't scale`);
      const { quantity, multiplier } = this.evaluateRules(
        service.calculationRules,
        responseMap,
        service.name
      );
      
      // Override - services should not scale
      updatedService.quantity = 1;
      
      // Apply multiplier to base hours only if needed
      if (multiplier !== 1 && service.baseHours) {
        updatedService.hours = Math.round(service.baseHours * multiplier * 100) / 100;
      }
    }
    
    // Apply calculations to subservices
    if (service.subservices) {
      updatedService.subservices = service.subservices.map(sub => 
        this.calculateSubservice(sub, responseMap)
      );
    }
    
    // Update mapped questions
    updatedService.mappedQuestions = this.getMappedQuestions(service, responseMap);
    console.log(`  🔗 ${service.name} mappedQuestions:`, updatedService.mappedQuestions);
    
    return updatedService;
  }

  /**
   * Calculate quantities and multipliers for a subservice
   */
  private calculateSubservice(subservice: any, responseMap: Record<string, any>): any {
    const updated = { ...subservice };
    
    console.log(`    📋 Processing subservice: ${subservice.name}`);
    console.log(`    📋 Has calculationRules: ${!!subservice.calculationRules}`);
    console.log(`    📋 CalculationRules:`, subservice.calculationRules);
    console.log(`    📋 Has quantityDriver: ${!!subservice.quantityDriver}`);
    console.log(`    📋 QuantityDriver:`, subservice.quantityDriver);
    
    if (subservice.calculationRules) {
      const { quantity, multiplier, included } = this.evaluateRules(
        subservice.calculationRules,
        responseMap,
        subservice.name
      );
      
      // Apply quantity
      updated.quantity = quantity;
      console.log(`    ➡️ Set quantity to: ${quantity}`);
      
      // Calculate final hours: quantity × baseHours (with multiplier if applicable)
      const baseHours = subservice.baseHours || subservice.hours || 0;
      const finalHours = Math.round(quantity * baseHours * multiplier * 100) / 100;
      updated.hours = finalHours;
      console.log(`    💰 Final hours: ${quantity} × ${baseHours} × ${multiplier} = ${finalHours}h`);
      
      // Handle inclusion/exclusion
      if (!included) {
        updated.quantity = 0;
        updated.hours = 0;
        console.log(`    ❌ Service excluded, set quantity and hours to 0`);
      }
    } else if (subservice.quantityDriver) {
      // Simple quantity driver without rules
      updated.quantity = responseMap[subservice.quantityDriver] || 1;
      console.log(`    ➡️ Using quantityDriver ${subservice.quantityDriver}: ${updated.quantity}`);
      
      // Calculate final hours for quantity driver case
      const baseHours = subservice.baseHours || subservice.hours || 0;
      updated.hours = Math.round(updated.quantity * baseHours * 100) / 100;
      console.log(`    💰 Final hours: ${updated.quantity} × ${baseHours} = ${updated.hours}h`);
      
    } else {
      // Check if subservice has multiple scaling factors we can combine
      const combinedQuantity = this.calculateCombinedQuantity(subservice, responseMap);
      if (combinedQuantity > 1) {
        updated.quantity = combinedQuantity;
        console.log(`    ➕ Calculated combined quantity from scaling factors: ${combinedQuantity}`);
        
        // Calculate final hours for combined quantity case
        const baseHours = subservice.baseHours || subservice.hours || 0;
        updated.hours = Math.round(combinedQuantity * baseHours * 100) / 100;
        console.log(`    💰 Final hours: ${combinedQuantity} × ${baseHours} = ${updated.hours}h`);
        
      } else {
        // Ensure quantity is always set, even if no rules
        if (!updated.quantity) {
          updated.quantity = 1;
        }
        console.log(`    ⚠️ No calculation rules or quantity driver found, setting default quantity: ${updated.quantity}`);
        
        // For default case, hours = baseHours (no scaling)
        const baseHours = subservice.baseHours || subservice.hours || 0;
        updated.hours = baseHours;
        console.log(`    💰 Default hours (no scaling): ${updated.hours}h`);
      }
    }
    
    // Update mapped questions
    updated.mappedQuestions = this.getMappedQuestions(subservice, responseMap);
    console.log(`    🔗 ${subservice.name} mappedQuestions:`, updated.mappedQuestions);
    
    return updated;
  }

  /**
   * Evaluate calculation rules with the response values
   */
  private evaluateRules(
    rules: any,
    responseMap: Record<string, any>,
    serviceName: string
  ): { quantity: number; multiplier: number; included: boolean } {
    let quantity = 1;
    let multiplier = 1;
    let included = true;
    
    try {
      // Evaluate quantity rule
      if (rules.quantity) {
        quantity = this.evaluateExpression(rules.quantity, responseMap);
        console.log(`  📐 ${serviceName} quantity: ${rules.quantity} = ${quantity}`);
      }
      
      // Evaluate multiplier rule
      if (rules.multiplier) {
        multiplier = this.evaluateExpression(rules.multiplier, responseMap);
        console.log(`  ✖️ ${serviceName} multiplier: ${rules.multiplier} = ${multiplier}`);
      }
      
      // Evaluate inclusion rule
      if (rules.included) {
        included = this.evaluateExpression(rules.included, responseMap);
        console.log(`  ✅ ${serviceName} included: ${rules.included} = ${included}`);
      }
      
    } catch (error) {
      console.error(`Error evaluating rules for ${serviceName}:`, error);
    }
    
    return { quantity, multiplier, included };
  }

  /**
   * Safely evaluate an expression with variable substitution
   */
  private evaluateExpression(expression: string, variables: Record<string, any>): any {
    try {
      // Create a safe evaluation context
      const context = { ...variables, Math };
      
      // Replace variable names in expression
      let evaluableExpression = expression;
      Object.keys(variables).forEach(key => {
        const value = variables[key];
        const quotedValue = typeof value === 'string' ? `"${value}"` : value;
        // Replace variable references with actual values
        evaluableExpression = evaluableExpression.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          quotedValue
        );
      });
      
      console.log(`    Evaluating: ${expression} -> ${evaluableExpression}`);
      
      // Use Function constructor for safe evaluation
      const func = new Function(...Object.keys(context), `return ${evaluableExpression}`);
      const result = func(...Object.values(context));
      
      return result;
      
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`, error);
      // Return safe defaults
      if (expression.includes('||')) {
        // Try to extract default value after ||
        const parts = expression.split('||');
        if (parts.length > 1) {
          const defaultValue = parts[parts.length - 1].trim();
          return isNaN(Number(defaultValue)) ? 1 : Number(defaultValue);
        }
      }
      return 1;
    }
  }

  /**
   * Calculate combined quantity from multiple scaling factors
   */
  private calculateCombinedQuantity(
    subservice: any,
    responseMap: Record<string, any>
  ): number {
    const scalingFactors = subservice.scalingFactors || [];
    
    if (scalingFactors.length === 0) {
      return 1;
    }
    
    console.log(`    🔢 Combining ${scalingFactors.length} scaling factors for ${subservice.name}:`, scalingFactors);
    
    let combinedQuantity = 0;
    let factorsUsed = 0;
    
    scalingFactors.forEach((factor: string) => {
      const value = responseMap[factor];
      if (value !== undefined && value !== null) {
        // Convert to number if it's a string number
        const numValue = typeof value === 'number' ? value : 
                        (typeof value === 'string' && !isNaN(Number(value))) ? Number(value) : 0;
        
        if (numValue > 0) {
          // Add scaling factors together for combined impact
          // Example: "100 users + 4 sites" = 104 total scaling units
          combinedQuantity += numValue;
          factorsUsed++;
          console.log(`      ➕ ${factor}: ${numValue} (total so far: ${combinedQuantity})`);
        }
      }
    });
    
    console.log(`    🎯 Added ${factorsUsed} factors together: ${combinedQuantity}`);
    
    return Math.max(combinedQuantity, 1);
  }

  /**
   * Get list of questions that map to this service/subservice
   */
  private getMappedQuestions(
    item: Service | any,
    responseMap: Record<string, any>
  ): string[] {
    const mapped: string[] = [];
    
    // Add scaling factors
    if (item.scalingFactors) {
      mapped.push(...item.scalingFactors);
    }
    
    // Add quantity driver
    if (item.quantityDriver) {
      mapped.push(item.quantityDriver);
    }
    
    // Add any factors referenced in calculation rules
    if (item.calculationRules) {
      const rulesText = JSON.stringify(item.calculationRules);
      Object.keys(responseMap).forEach(key => {
        if (rulesText.includes(key) && !mapped.includes(key)) {
          mapped.push(key);
        }
      });
    }
    
    return mapped;
  }

  /**
   * Generate calculations from the applied rules
   */
  generateCalculations(
    services: Service[],
    questions: Question[],
    responseMap: Record<string, any>
  ): Calculation[] {
    const calculations: Calculation[] = [];
    let calcId = 1;
    
    // Create a calculation for each unique factor that actually affects services
    const factors = new Set<string>();
    questions.forEach(q => {
      if (q.mappingKey) factors.add(q.mappingKey);
    });
    
    console.log(`📊 Evaluating ${factors.size} scaling factors for calculation generation`);
    
    let calculationsCreated = 0;
    let calculationsSkipped = 0;
    
    factors.forEach(factor => {
      const value = responseMap[factor];
      const affectedServices = this.findServicesUsingFactor(factor, services);
      
      // Only create calculation if this factor actually affects subservices
      if (affectedServices.length > 0) {
        console.log(`✅ Creating calculation for ${factor} (affects ${affectedServices.length} services)`);
        calculations.push({
          id: `calc_${calcId++}`,
          name: factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value || 0,
          unit: this.getUnitForFactor(factor),
          source: 'User Input',
          mappedServices: affectedServices,
          mappedQuestions: [factor], // UI expects this field
          slug: factor, // UI expects this field  
          resultType: 'quantity' // UI expects this field
        });
        calculationsCreated++;
      } else {
        console.log(`⏭️ Skipping calculation for ${factor} (no services use it)`);
        calculationsSkipped++;
      }
    });
    
    // Add derived calculations
    const totalHours = this.calculateTotalHours(services);
    calculations.push({
      id: `calc_${calcId++}`,
      name: 'Total Project Hours',
      value: totalHours,
      unit: 'hours',
      source: 'Calculated',
      formula: 'Sum of all service hours × quantities',
      mappedQuestions: [], // No specific questions for total
      slug: 'total_project_hours',
      resultType: 'total'
    });
    
    console.log(`📈 Generated ${calculationsCreated} calculations, skipped ${calculationsSkipped} unused factors`);
    
    return calculations;
  }

  /**
   * Find services that use a specific factor
   */
  private findServicesUsingFactor(factor: string, services: Service[]): string[] {
    const using: string[] = [];
    
    console.log(`🔍 Finding services using factor: ${factor}`);
    
    services.forEach(service => {
      let uses = false;
      
      // Check service level (should be rare now since services don't scale)
      if (service.scalingFactors?.includes(factor) || 
          service.quantityDriver === factor ||
          JSON.stringify(service.calculationRules || {}).includes(factor)) {
        uses = true;
        console.log(`  📋 Service ${service.name} uses ${factor} at service level`);
      }
      
      // Check subservices (this is where most scaling factors should be)
      service.subservices?.forEach(sub => {
        if (sub.scalingFactors?.includes(factor) || 
            sub.quantityDriver === factor ||
            JSON.stringify(sub.calculationRules || {}).includes(factor)) {
          uses = true;
          console.log(`  📋 Service ${service.name} uses ${factor} in subservice: ${sub.name}`);
        }
      });
      
      if (uses) {
        using.push(service.name);
      }
    });
    
    console.log(`✅ Factor ${factor} is used by services:`, using);
    return using;
  }

  /**
   * Get appropriate unit for a factor
   */
  private getUnitForFactor(factor: string): string {
    const units: Record<string, string> = {
      user_count: 'users',
      mailbox_count: 'mailboxes',
      site_count: 'sites',
      data_volume_gb: 'GB',
      integration_count: 'integrations',
      admin_count: 'administrators',
      training_groups: 'groups',
      system_count: 'systems',
      test_scenarios: 'scenarios',
      documentation_sets: 'sets'
    };
    
    return units[factor] || 'units';
  }

  /**
   * Calculate total hours across all services
   */
  private calculateTotalHours(services: Service[]): number {
    let total = 0;
    
    services.forEach(service => {
      const serviceQuantity = service.quantity || 1;
      const serviceHours = service.hours || 0;
      
      if (service.subservices && service.subservices.length > 0) {
        // Sum subservice hours
        service.subservices.forEach(sub => {
          const subQuantity = sub.quantity || 1;
          const subHours = sub.baseHours || sub.hours || 0;
          total += Math.round((subQuantity * subHours) * 100) / 100;
        });
      } else {
        // Use service hours
        total += Math.round((serviceQuantity * serviceHours) * 100) / 100;
      }
    });
    
    return Math.round(total * 100) / 100;
  }
}

// Export singleton
let calculationEngineV2Instance: CalculationEngineV2 | null = null;

export function getCalculationEngineV2(): CalculationEngineV2 {
  if (!calculationEngineV2Instance) {
    calculationEngineV2Instance = new CalculationEngineV2();
  }
  return calculationEngineV2Instance;
}