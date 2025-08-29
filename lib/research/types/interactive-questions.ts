/**
 * Enhanced question types for interactive questionnaire with service impact
 */

export interface InteractiveQuestion {
  id: string;
  text: string;
  description?: string;
  type: 'multiple_choice' | 'text' | 'number' | 'boolean' | 'slider' | 'multi_select' | 'dropdown';
  options?: QuestionOption[];
  validation?: QuestionValidation;
  impact?: ServiceImpact;
  dependsOn?: QuestionDependency[];
  category?: string;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
}

export interface QuestionOption {
  value: string | number;
  label: string;
  description?: string;
  impact?: ServiceImpact;
  showIf?: QuestionCondition[];
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface ServiceImpact {
  // Impact on service hours
  hourModifiers?: {
    serviceName?: string; // If specified, only affects this service
    phasePattern?: string; // Regex pattern to match phase names
    operation: 'multiply' | 'add' | 'set';
    value: number;
  }[];
  
  // Impact on which services are included
  serviceInclusion?: {
    include?: string[]; // Service names to include
    exclude?: string[]; // Service names to exclude
  };
  
  // Impact on subservices
  subserviceModifiers?: {
    parentService?: string;
    operation: 'multiply' | 'add' | 'remove';
    value?: number;
    targetSubservices?: string[]; // Specific subservices to affect
  }[];
  
  // Complexity multiplier (affects all hours)
  complexityMultiplier?: number;
}

export interface QuestionDependency {
  questionId: string;
  condition: QuestionCondition;
}

export interface QuestionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface QuestionnaireResponse {
  questionId: string;
  value: any;
  impact?: ServiceImpact; // Calculated impact based on answer
}

export interface InteractiveQuestionnaire {
  id: string;
  name: string;
  description: string;
  categories: QuestionCategory[];
  questions: InteractiveQuestion[];
  baseServices: any[]; // Base services before modifications
  calculationRules?: CalculationRule[];
}

export interface QuestionCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  icon?: string;
}

export interface CalculationRule {
  id: string;
  name: string;
  description: string;
  trigger: QuestionCondition[];
  impact: ServiceImpact;
}

// Predefined question templates for common scenarios
export const QUESTION_TEMPLATES = {
  userCount: {
    text: "How many users will be using the system?",
    type: 'slider' as const,
    validation: { min: 1, max: 10000 },
    impact: {
      hourModifiers: [
        {
          phasePattern: 'Execution|Implementation',
          operation: 'multiply' as const,
          value: 1.0 // Base value, will be calculated based on user tiers
        }
      ]
    }
  },
  
  locations: {
    text: "How many locations/sites need to be configured?",
    type: 'number' as const,
    validation: { min: 1, max: 500 },
    impact: {
      hourModifiers: [
        {
          phasePattern: '.*',
          operation: 'multiply' as const,
          value: 1.0 // Will scale based on location count
        }
      ]
    }
  },
  
  complexity: {
    text: "What is the complexity level of your environment?",
    type: 'dropdown' as const,
    options: [
      { 
        value: 'simple', 
        label: 'Simple', 
        description: 'Standard configuration, single site',
        impact: { complexityMultiplier: 0.8 }
      },
      { 
        value: 'moderate', 
        label: 'Moderate', 
        description: 'Multiple sites, some customization',
        impact: { complexityMultiplier: 1.0 }
      },
      { 
        value: 'complex', 
        label: 'Complex', 
        description: 'Enterprise-wide, heavy customization',
        impact: { complexityMultiplier: 1.5 }
      }
    ]
  },
  
  highAvailability: {
    text: "Do you require high availability configuration?",
    type: 'boolean' as const,
    impact: {
      serviceInclusion: {
        include: ['High Availability Configuration', 'Failover Testing']
      },
      hourModifiers: [
        {
          serviceName: 'Platform Deployment',
          operation: 'multiply' as const,
          value: 1.3
        }
      ]
    }
  },
  
  integrations: {
    text: "Which systems need to be integrated?",
    type: 'multi_select' as const,
    options: [
      { 
        value: 'ad', 
        label: 'Active Directory',
        impact: {
          serviceInclusion: { include: ['Active Directory Integration'] },
          hourModifiers: [{ operation: 'add' as const, value: 16 }]
        }
      },
      { 
        value: 'radius', 
        label: 'RADIUS/TACACS+',
        impact: {
          serviceInclusion: { include: ['RADIUS Configuration'] },
          hourModifiers: [{ operation: 'add' as const, value: 12 }]
        }
      },
      { 
        value: 'siem', 
        label: 'SIEM Platform',
        impact: {
          serviceInclusion: { include: ['SIEM Integration'] },
          hourModifiers: [{ operation: 'add' as const, value: 8 }]
        }
      },
      { 
        value: 'mdm', 
        label: 'MDM Solution',
        impact: {
          serviceInclusion: { include: ['MDM Integration'] },
          hourModifiers: [{ operation: 'add' as const, value: 20 }]
        }
      }
    ]
  },
  
  timeline: {
    text: "What is your desired implementation timeline?",
    type: 'dropdown' as const,
    options: [
      { 
        value: 'aggressive', 
        label: 'Aggressive (< 30 days)',
        description: 'Fast-track implementation with parallel workstreams',
        impact: { 
          complexityMultiplier: 1.2,
          serviceInclusion: { include: ['Accelerated Deployment Services'] }
        }
      },
      { 
        value: 'standard', 
        label: 'Standard (30-90 days)',
        description: 'Normal pace with sequential phases',
        impact: { complexityMultiplier: 1.0 }
      },
      { 
        value: 'phased', 
        label: 'Phased (90+ days)',
        description: 'Gradual rollout with pilot groups',
        impact: { 
          complexityMultiplier: 1.1,
          serviceInclusion: { include: ['Phased Rollout Management'] }
        }
      }
    ]
  },
  
  training: {
    text: "What level of training is required?",
    type: 'dropdown' as const,
    options: [
      {
        value: 'none',
        label: 'None',
        impact: { serviceInclusion: { exclude: ['Training Services'] } }
      },
      {
        value: 'admin',
        label: 'Administrator Training Only',
        impact: { 
          serviceInclusion: { include: ['Administrator Training'] },
          hourModifiers: [{ serviceName: 'Knowledge Transfer', operation: 'add' as const, value: 8 }]
        }
      },
      {
        value: 'full',
        label: 'Full Team Training',
        impact: { 
          serviceInclusion: { include: ['Administrator Training', 'End User Training'] },
          hourModifiers: [{ serviceName: 'Knowledge Transfer', operation: 'add' as const, value: 24 }]
        }
      }
    ]
  }
};

// Helper function to calculate service impact based on responses
export function calculateServiceImpact(
  baseServices: any[],
  responses: QuestionnaireResponse[]
): any[] {
  let modifiedServices = JSON.parse(JSON.stringify(baseServices)); // Deep clone
  
  responses.forEach(response => {
    if (!response.impact) return;
    
    const impact = response.impact;
    
    // Apply complexity multiplier
    if (impact.complexityMultiplier) {
      modifiedServices = modifiedServices.map(service => ({
        ...service,
        hours: Math.round(service.hours * impact.complexityMultiplier),
        subservices: service.subservices?.map((sub: any) => ({
          ...sub,
          hours: Math.round(sub.hours * impact.complexityMultiplier)
        }))
      }));
    }
    
    // Apply hour modifiers
    if (impact.hourModifiers) {
      impact.hourModifiers.forEach(modifier => {
        modifiedServices = modifiedServices.map(service => {
          const matchesService = !modifier.serviceName || service.name.includes(modifier.serviceName);
          const matchesPhase = !modifier.phasePattern || 
            new RegExp(modifier.phasePattern, 'i').test(service.phase || '');
          
          if (matchesService || matchesPhase) {
            let newHours = service.hours;
            
            switch (modifier.operation) {
              case 'multiply':
                newHours = Math.round(service.hours * modifier.value);
                break;
              case 'add':
                newHours = service.hours + modifier.value;
                break;
              case 'set':
                newHours = modifier.value;
                break;
            }
            
            return { ...service, hours: newHours };
          }
          
          return service;
        });
      });
    }
    
    // Apply service inclusion/exclusion
    if (impact.serviceInclusion) {
      if (impact.serviceInclusion.exclude) {
        modifiedServices = modifiedServices.filter(
          service => !impact.serviceInclusion!.exclude!.some(
            pattern => service.name.includes(pattern)
          )
        );
      }
      
      // Note: Including new services would require having templates for them
      // This would be handled by the service generator
    }
  });
  
  return modifiedServices;
}

// Helper to get user tier multiplier
export function getUserTierMultiplier(userCount: number): number {
  if (userCount <= 100) return 0.8;
  if (userCount <= 500) return 1.0;
  if (userCount <= 2000) return 1.3;
  if (userCount <= 5000) return 1.6;
  return 2.0;
}

// Helper to get location tier multiplier
export function getLocationMultiplier(locationCount: number): number {
  if (locationCount === 1) return 1.0;
  if (locationCount <= 3) return 1.2;
  if (locationCount <= 10) return 1.5;
  if (locationCount <= 25) return 1.8;
  return 2.2;
}