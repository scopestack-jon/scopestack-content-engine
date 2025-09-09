// Improved Calculation Mapping System
// Maps questions/answers to calculations and service recommendations
// Following ScopeStack API structure

import { Question, Service, Calculation } from '../types/interfaces';

export interface SurveyCalculation {
  calculation_id: string;
  value: string | number;
  formula?: string;
  description?: string;
}

export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  quantity: number;
  baseHours: number;
  calculationIds: string[]; // Which calculations affect this service
}

export class CalculationMapper {
  /**
   * Create calculation IDs based on question patterns
   * Similar to ScopeStack's calculation_id format
   */
  generateCalculationId(question: Question): string {
    const text = question.text.toLowerCase();
    
    // Map question patterns to calculation IDs
    if (text.includes('mailbox')) {
      if (text.includes('size') || text.includes('gb')) return 'mailbox_size_calculation';
      if (text.includes('how many') || text.includes('number')) return 'mailbox_count_calculation';
      if (text.includes('type')) return 'mailbox_type_lookup';
    }
    
    if (text.includes('user')) {
      if (text.includes('how many') || text.includes('number')) return 'user_count_calculation';
      if (text.includes('hybrid')) return 'hybrid_user_calculation';
      if (text.includes('pilot')) return 'pilot_user_calculation';
      if (text.includes('training')) return 'training_requirement_calculation';
    }
    
    if (text.includes('migration')) {
      if (text.includes('approach') || text.includes('method')) return 'migration_approach_lookup';
      if (text.includes('timeline') || text.includes('duration')) return 'migration_timeline_calculation';
      if (text.includes('complexity')) return 'migration_complexity_factor';
    }
    
    if (text.includes('storage') || text.includes('data')) {
      if (text.includes('volume') || text.includes('gb') || text.includes('tb')) return 'data_volume_calculation';
      if (text.includes('retention')) return 'data_retention_calculation';
    }
    
    if (text.includes('integration') || text.includes('application')) {
      if (text.includes('how many') || text.includes('number')) return 'integration_count_calculation';
      if (text.includes('third-party')) return 'third_party_integration_calculation';
      if (text.includes('custom')) return 'custom_integration_calculation';
    }
    
    if (text.includes('domain')) {
      if (text.includes('how many') || text.includes('number')) return 'domain_count_calculation';
      if (text.includes('custom')) return 'custom_domain_calculation';
    }
    
    if (text.includes('security')) {
      if (text.includes('level') || text.includes('requirement')) return 'security_level_lookup';
      if (text.includes('compliance')) return 'compliance_requirement_calculation';
    }
    
    if (text.includes('downtime')) {
      if (text.includes('window') || text.includes('hours')) return 'downtime_window_calculation';
      if (text.includes('acceptable')) return 'acceptable_downtime_calculation';
    }
    
    if (text.includes('location') || text.includes('site')) {
      if (text.includes('how many') || text.includes('number')) return 'site_count_calculation';
      if (text.includes('geographic')) return 'geographic_distribution_calculation';
    }
    
    if (text.includes('environment')) {
      if (text.includes('current') || text.includes('existing')) return 'environment_assessment_calculation';
      if (text.includes('test') || text.includes('staging')) return 'environment_count_calculation';
    }
    
    // Default calculation ID based on question slug
    return question.slug || `custom_calculation_${Date.now()}`;
  }

  /**
   * Generate calculations from survey responses
   * Returns calculations in ScopeStack format
   */
  generateCalculationsFromResponses(
    questions: Question[],
    responses: Record<string, any>
  ): SurveyCalculation[] {
    const calculations: SurveyCalculation[] = [];
    
    questions.forEach(question => {
      const calculationId = this.generateCalculationId(question);
      const response = responses[question.slug || ''];
      
      if (response !== undefined) {
        const calculation = this.createCalculation(calculationId, question, response);
        if (calculation) {
          calculations.push(calculation);
        }
      }
    });
    
    // Add derived calculations (calculations based on multiple inputs)
    calculations.push(...this.generateDerivedCalculations(calculations));
    
    return calculations;
  }

  /**
   * Create a calculation based on question and response
   */
  private createCalculation(
    calculationId: string,
    question: Question,
    response: any
  ): SurveyCalculation | null {
    const text = question.text.toLowerCase();
    let value: string | number = response;
    
    // Handle different response types
    if (typeof response === 'object' && response.value !== undefined) {
      value = response.value;
    } else if (typeof response === 'object' && response.key !== undefined) {
      // Handle select options
      value = this.mapSelectOptionToValue(calculationId, response.key);
    }
    
    // Apply calculation formulas based on type
    switch (calculationId) {
      case 'mailbox_count_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'mailbox_count',
          description: 'Number of mailboxes to migrate'
        };
        
      case 'mailbox_size_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'avg_mailbox_size_gb',
          description: 'Average mailbox size in GB'
        };
        
      case 'user_count_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'user_count',
          description: 'Total number of users'
        };
        
      case 'data_volume_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'total_data_gb',
          description: 'Total data volume in GB'
        };
        
      case 'integration_count_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'integration_count',
          description: 'Number of integrations'
        };
        
      case 'domain_count_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'domain_count',
          description: 'Number of domains'
        };
        
      case 'site_count_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'site_count',
          description: 'Number of sites/locations'
        };
        
      case 'downtime_window_calculation':
        return {
          calculation_id: calculationId,
          value: value,
          formula: 'max_downtime_hours',
          description: 'Maximum acceptable downtime in hours'
        };
        
      case 'migration_approach_lookup':
        return {
          calculation_id: calculationId,
          value: this.getMigrationComplexityValue(value),
          formula: 'migration_complexity_factor',
          description: 'Migration approach complexity factor'
        };
        
      case 'security_level_lookup':
        return {
          calculation_id: calculationId,
          value: this.getSecurityLevelValue(value),
          formula: 'security_complexity_factor',
          description: 'Security implementation complexity'
        };
        
      default:
        return {
          calculation_id: calculationId,
          value: value,
          description: `Calculation for ${question.text}`
        };
    }
  }

  /**
   * Generate derived calculations based on other calculations
   */
  private generateDerivedCalculations(calculations: SurveyCalculation[]): SurveyCalculation[] {
    const derived: SurveyCalculation[] = [];
    
    // Calculate total migration effort
    const mailboxCount = this.findCalculationValue(calculations, 'mailbox_count_calculation');
    const avgSize = this.findCalculationValue(calculations, 'mailbox_size_calculation');
    
    if (mailboxCount && avgSize) {
      derived.push({
        calculation_id: 'total_migration_data_gb',
        value: (Number(mailboxCount) * Number(avgSize)).toString(),
        formula: 'mailbox_count × avg_mailbox_size',
        description: 'Total data to migrate in GB'
      });
      
      // Migration rate calculation (GB per hour)
      const migrationRate = 10; // 10 GB per hour baseline
      derived.push({
        calculation_id: 'migration_duration_hours',
        value: ((Number(mailboxCount) * Number(avgSize)) / migrationRate).toFixed(2),
        formula: 'total_data_gb / migration_rate',
        description: 'Estimated migration duration in hours'
      });
    }
    
    // Calculate complexity score
    const integrations = this.findCalculationValue(calculations, 'integration_count_calculation');
    const domains = this.findCalculationValue(calculations, 'domain_count_calculation');
    const sites = this.findCalculationValue(calculations, 'site_count_calculation');
    
    const complexityScore = 
      (Number(integrations) || 0) * 2 +
      (Number(domains) || 0) * 1.5 +
      (Number(sites) || 0) * 3;
    
    if (complexityScore > 0) {
      derived.push({
        calculation_id: 'project_complexity_score',
        value: complexityScore.toFixed(2),
        formula: '(integrations × 2) + (domains × 1.5) + (sites × 3)',
        description: 'Overall project complexity score'
      });
    }
    
    // Add overhead calculation
    derived.push({
      calculation_id: 'project_management_overhead',
      value: '0.15',
      formula: 'total_effort × 0.15',
      description: 'Project management overhead (15%)'
    });
    
    return derived;
  }

  /**
   * Map calculations to service recommendations
   */
  mapCalculationsToServices(
    calculations: SurveyCalculation[],
    services: Service[]
  ): ServiceRecommendation[] {
    const recommendations: ServiceRecommendation[] = [];
    
    services.forEach(service => {
      const recommendation = this.createServiceRecommendation(service, calculations);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });
    
    return recommendations;
  }

  /**
   * Apply calculations to update service and subservice quantities
   */
  applyCalculationsToServices(
    services: Service[],
    calculations: SurveyCalculation[]
  ): Service[] {
    return services.map(service => {
      const updatedService = { ...service };
      
      // Apply calculations to main service
      const serviceRecommendation = this.createServiceRecommendation(service, calculations);
      if (serviceRecommendation) {
        updatedService.quantity = serviceRecommendation.quantity;
        updatedService.baseHours = serviceRecommendation.baseHours;
      }
      
      // Apply calculations to subservices
      if (service.subservices) {
        updatedService.subservices = service.subservices.map(subservice => {
          const updatedSubservice = { ...subservice };
          
          // Map subservice to calculations based on name and type
          this.applyCalculationsToSubservice(updatedSubservice, service, calculations);
          
          return updatedSubservice;
        });
      }
      
      return updatedService;
    });
  }

  /**
   * Apply specific calculations to a subservice
   */
  private applyCalculationsToSubservice(
    subservice: any,
    parentService: Service,
    calculations: SurveyCalculation[]
  ): void {
    const subserviceName = subservice.name.toLowerCase();
    const parentServiceName = parentService.name.toLowerCase();
    
    console.log(`    🔍 Checking subservice: "${subservice.name}" in service "${parentService.name}"`);
    console.log(`    📋 Available calculations:`, calculations.map(c => c.calculation_id));
    
    // User-specific subservices first (most specific)
    const isUserSpecific = subserviceName.includes('user') || subserviceName.includes('training') || 
                           subserviceName.includes('knowledge') || subserviceName.includes('admin') ||
                           subserviceName.includes('support') && !subserviceName.includes('migration');
    
    if (isUserSpecific) {
      const userCountCalc = calculations.find(c => c.calculation_id === 'user_count_calculation');
      if (userCountCalc) {
        const quantity = Number(userCountCalc.value) || 1;
        subservice.quantity = quantity;
        
        if (subserviceName.includes('training') || subserviceName.includes('knowledge')) {
          subservice.baseHours = 1.5; // 1.5 hours per user for training
        } else if (subserviceName.includes('support')) {
          subservice.baseHours = 0.5; // 0.5 hours per user for support setup
        } else {
          subservice.baseHours = 1.0; // Default for user-related tasks
        }
        
        console.log(`    👥 Setting subservice ${subservice.name}: quantity=${quantity}, baseHours=${subservice.baseHours}`);
        
        // Add mapped questions for UI display
        const relatedCalc = calculations.find(c => 
          c.calculation_id === 'user_count_calculation' ||
          c.calculation_id.includes('user') ||
          c.description?.toLowerCase().includes('user')
        );
        
        if (relatedCalc && relatedCalc.description) {
          subservice.mappedQuestions = [relatedCalc.description];
          subservice.calculationIds = [relatedCalc.calculation_id];
        } else {
          // Fallback: use a generic user-related description
          subservice.mappedQuestions = [`${quantity} users`];
          subservice.calculationIds = ['user_count_calculation'];
        }
      }
    }
    
    // Integration-specific subservices
    else if (subserviceName.includes('integration') || subserviceName.includes('application') || 
             subserviceName.includes('connector') || subserviceName.includes('third')) {
      
      const integrationCalc = calculations.find(c => c.calculation_id === 'integration_count_calculation');
      if (integrationCalc) {
        const quantity = Number(integrationCalc.value) || 1;
        subservice.quantity = quantity;
        subservice.baseHours = 4; // 4 hours per integration
        
        console.log(`    🔗 Setting subservice ${subservice.name}: quantity=${quantity}, baseHours=${subservice.baseHours}`);
        
        // Add mapped questions for UI display
        const relatedCalc = calculations.find(c => 
          c.calculation_id === 'integration_count_calculation' ||
          c.calculation_id.includes('integration') ||
          c.description?.toLowerCase().includes('integration')
        );
        
        if (relatedCalc && relatedCalc.description) {
          subservice.mappedQuestions = [relatedCalc.description];
          subservice.calculationIds = [relatedCalc.calculation_id];
        } else {
          // Fallback: use a generic integration-related description
          subservice.mappedQuestions = [`${quantity} integrations`];
          subservice.calculationIds = ['integration_count_calculation'];
        }
      }
    }
    
    // Storage/Data volume-specific subservices
    else if (subserviceName.includes('storage') || subserviceName.includes('data volume') || 
             subserviceName.includes('archiv')) {
      
      const dataVolumeCalc = calculations.find(c => c.calculation_id === 'data_volume_calculation');
      const totalDataCalc = calculations.find(c => c.calculation_id === 'total_migration_data_gb');
      
      const calc = dataVolumeCalc || totalDataCalc;
      if (calc) {
        const dataGB = Number(calc.value) || 1;
        subservice.quantity = dataGB;
        subservice.baseHours = 0.05; // 0.05 hours per GB
        
        console.log(`    💾 Setting subservice ${subservice.name}: quantity=${dataGB}GB, baseHours=${subservice.baseHours}`);
      }
    }
    
    // Default: Most migration-related subservices scale with mailbox count
    else {
      // Look for mailbox calculations with more flexible patterns
      const mailboxCountCalc = calculations.find(c => 
        c.calculation_id === 'mailbox_count_calculation' || 
        c.calculation_id.includes('mailbox') || 
        c.description?.toLowerCase().includes('mailbox')
      );
      
      if (mailboxCountCalc) {
        const quantity = Number(mailboxCountCalc.value) || 1;
        subservice.quantity = quantity;
        
        // Different base hours for different types of operations
        if (subserviceName.includes('migration') || subserviceName.includes('deployment') || 
            subserviceName.includes('execution')) {
          subservice.baseHours = 0.5; // 0.5 hours per mailbox for migration/deployment
        } else if (subserviceName.includes('configuration') || subserviceName.includes('setup')) {
          subservice.baseHours = 0.25; // 0.25 hours per mailbox for configuration
        } else if (subserviceName.includes('testing') || subserviceName.includes('validation') || 
                   subserviceName.includes('verification')) {
          subservice.baseHours = 0.1; // 0.1 hours per mailbox for testing
        } else if (subserviceName.includes('assessment') || subserviceName.includes('analysis') ||
                   subserviceName.includes('planning') || subserviceName.includes('design')) {
          subservice.baseHours = 0.3; // 0.3 hours per mailbox for planning/analysis
        } else if (subserviceName.includes('documentation') || subserviceName.includes('report')) {
          subservice.baseHours = 0.2; // 0.2 hours per mailbox for documentation
        } else {
          subservice.baseHours = 0.25; // Conservative default for any mailbox-related task
        }
        
        console.log(`    📦 Setting subservice ${subservice.name}: quantity=${quantity}, baseHours=${subservice.baseHours}`);
        
        // Add mapped questions for UI display - find the most relevant calculation
        const relatedCalc = calculations.find(c => 
          c.calculation_id.includes('mailbox') || 
          c.calculation_id === 'mailbox_count_calculation' ||
          c.calculation_id.includes('size') ||
          c.description?.toLowerCase().includes('mailbox')
        );
        
        if (relatedCalc && relatedCalc.description) {
          subservice.mappedQuestions = [relatedCalc.description];
          subservice.calculationIds = [relatedCalc.calculation_id];
        } else {
          // Fallback: use a generic mailbox-related description
          subservice.mappedQuestions = [`${quantity} mailboxes to migrate`];
          subservice.calculationIds = ['mailbox_count_calculation'];
        }
      }
    }
    
    // Security-related subservices
    if (subserviceName.includes('security') || subserviceName.includes('compliance') || 
        subserviceName.includes('permission') || subserviceName.includes('access')) {
      
      const securityCalc = calculations.find(c => c.calculation_id === 'security_level_lookup');
      if (securityCalc) {
        const securityMultiplier = Number(securityCalc.value) || 1.0;
        // Apply security complexity to existing hours
        subservice.baseHours = (subservice.baseHours || subservice.hours) * securityMultiplier;
        
        console.log(`    🔒 Applying security multiplier ${securityMultiplier} to ${subservice.name}`);
      }
    }
    
    // Testing/Validation subservices - scale based on overall complexity
    if (subserviceName.includes('test') || subserviceName.includes('validation') || 
        subserviceName.includes('verification') || subserviceName.includes('quality')) {
      
      const complexityCalc = calculations.find(c => c.calculation_id === 'project_complexity_score');
      if (complexityCalc) {
        const complexityScore = Number(complexityCalc.value) || 1;
        const complexityMultiplier = Math.max(1, complexityScore / 10); // Scale complexity
        
        subservice.baseHours = (subservice.baseHours || subservice.hours) * complexityMultiplier;
        
        console.log(`    🧪 Applying complexity multiplier ${complexityMultiplier.toFixed(2)} to ${subservice.name}`);
      }
    }
  }

  /**
   * Create service recommendation based on calculations
   */
  private createServiceRecommendation(
    service: Service,
    calculations: SurveyCalculation[]
  ): ServiceRecommendation | null {
    const serviceName = service.name.toLowerCase();
    const relatedCalculations: string[] = [];
    let quantity = 1;
    let baseHours = service.hours;
    
    // Map service to relevant calculations
    if (serviceName.includes('migration')) {
      const mailboxCalc = calculations.find(c => c.calculation_id === 'mailbox_count_calculation');
      if (mailboxCalc) {
        relatedCalculations.push(mailboxCalc.calculation_id);
        quantity = Number(mailboxCalc.value) || 1;
        baseHours = 0.5; // 0.5 hours per mailbox
      }
      
      const dataCalc = calculations.find(c => c.calculation_id === 'total_migration_data_gb');
      if (dataCalc) {
        relatedCalculations.push(dataCalc.calculation_id);
      }
      
      const complexityCalc = calculations.find(c => c.calculation_id === 'migration_approach_lookup');
      if (complexityCalc) {
        relatedCalculations.push(complexityCalc.calculation_id);
        baseHours = baseHours * Number(complexityCalc.value);
      }
    }
    
    if (serviceName.includes('training') || serviceName.includes('knowledge')) {
      const userCalc = calculations.find(c => c.calculation_id === 'user_count_calculation');
      if (userCalc) {
        relatedCalculations.push(userCalc.calculation_id);
        quantity = Number(userCalc.value) || 1;
        baseHours = 2; // 2 hours per user for training
      }
    }
    
    if (serviceName.includes('integration')) {
      const integrationCalc = calculations.find(c => c.calculation_id === 'integration_count_calculation');
      if (integrationCalc) {
        relatedCalculations.push(integrationCalc.calculation_id);
        quantity = Number(integrationCalc.value) || 1;
        baseHours = 8; // 8 hours per integration
      }
    }
    
    if (serviceName.includes('security')) {
      const securityCalc = calculations.find(c => c.calculation_id === 'security_level_lookup');
      if (securityCalc) {
        relatedCalculations.push(securityCalc.calculation_id);
        baseHours = baseHours * Number(securityCalc.value);
      }
    }
    
    if (serviceName.includes('testing') || serviceName.includes('validation')) {
      const complexityCalc = calculations.find(c => c.calculation_id === 'project_complexity_score');
      if (complexityCalc) {
        relatedCalculations.push(complexityCalc.calculation_id);
        const complexityFactor = Math.max(1, Number(complexityCalc.value) / 10);
        baseHours = baseHours * complexityFactor;
      }
    }
    
    // Apply project management overhead to all services
    const overheadCalc = calculations.find(c => c.calculation_id === 'project_management_overhead');
    if (overheadCalc) {
      relatedCalculations.push(overheadCalc.calculation_id);
    }
    
    return {
      serviceId: `service_${service.name.replace(/\s+/g, '_').toLowerCase()}`,
      serviceName: service.name,
      quantity: quantity,
      baseHours: baseHours,
      calculationIds: relatedCalculations
    };
  }

  /**
   * Helper functions
   */
  private findCalculationValue(calculations: SurveyCalculation[], calculationId: string): string | null {
    const calc = calculations.find(c => c.calculation_id === calculationId);
    return calc ? calc.value.toString() : null;
  }

  private mapSelectOptionToValue(calculationId: string, optionKey: string): number {
    // Map select option keys to numeric values for calculations
    const mappings: Record<string, Record<string, number>> = {
      migration_approach_lookup: {
        'Cutover': 1.0,
        'Staged': 1.2,
        'Hybrid': 1.5,
        'Minimal': 0.8
      },
      security_level_lookup: {
        'Basic': 1.0,
        'Standard': 1.3,
        'Enhanced': 1.6,
        'Maximum': 2.0
      }
    };
    
    return mappings[calculationId]?.[optionKey] || 1.0;
  }

  private getMigrationComplexityValue(approach: any): number {
    const approachStr = typeof approach === 'string' ? approach.toLowerCase() : 
                       (approach.key || approach.value || '').toLowerCase();
    
    if (approachStr.includes('cutover')) return 1.0;
    if (approachStr.includes('staged')) return 1.2;
    if (approachStr.includes('hybrid')) return 1.5;
    if (approachStr.includes('minimal')) return 0.8;
    
    return 1.0;
  }

  private getSecurityLevelValue(level: any): number {
    const levelStr = typeof level === 'string' ? level.toLowerCase() :
                    (level.key || level.value || '').toLowerCase();
    
    if (levelStr.includes('basic')) return 1.0;
    if (levelStr.includes('standard')) return 1.3;
    if (levelStr.includes('enhanced')) return 1.6;
    if (levelStr.includes('maximum')) return 2.0;
    
    return 1.0;
  }
}

// Export singleton instance
export function getCalculationMapper() {
  return new CalculationMapper();
}