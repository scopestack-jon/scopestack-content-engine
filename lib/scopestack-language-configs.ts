/**
 * ScopeStack Language Field Configurations for Different Accounts
 * 
 * Each account may have different language field setups in their ScopeStack instance.
 * This file contains predefined configurations that can be easily selected.
 */

// Default configuration (our best guess at common field names)
export const DEFAULT_LANGUAGE_CONFIG = {
  keyAssumptions: 'assumptions',
  clientResponsibilities: 'customer',
  outOfScope: 'out',
  serviceDescription: 'implementation_language',
  operationalNotes: 'operate',
  deliverables: 'deliverables',
  designNotes: 'design_language',
  planningNotes: 'planning_language',
  internalNotes: 'internal_only',
  sla: 'service_level_agreement'
}

// Configuration based on your demo account example
export const DEMO_ACCOUNT_CONFIG = {
  keyAssumptions: 'assumptions',
  clientResponsibilities: 'customer',
  outOfScope: 'out',
  serviceDescription: 'implementation_language',
  operationalNotes: 'operate',
  deliverables: 'deliverables',
  designNotes: 'design_language',
  planningNotes: 'planning_language',
  internalNotes: 'internal_only',
  sla: 'service_level_agreement',
  sowLanguage: 'sow_language'
}

// Alternative configurations for other common setups
export const ALTERNATIVE_CONFIG_A = {
  keyAssumptions: 'key_assumptions',
  clientResponsibilities: 'client_responsibilities', 
  outOfScope: 'out_of_scope',
  serviceDescription: 'service_description',
  operationalNotes: 'operational_notes',
  deliverables: 'deliverables',
  designNotes: 'design_notes',
  planningNotes: 'planning_notes',
  internalNotes: 'internal_notes',
  sla: 'sla'
}

export const ALTERNATIVE_CONFIG_B = {
  keyAssumptions: 'assumptions',
  clientResponsibilities: 'deliverables', // Some accounts use 'deliverables' for client responsibilities
  outOfScope: 'out',
  serviceDescription: 'sow_language', // Some accounts use 'sow_language' as primary field
  operationalNotes: 'operate',
  deliverables: 'customer', // Swapped with client responsibilities
  designNotes: 'design_language',
  planningNotes: 'planning_language',
  internalNotes: 'internal_only',
  sla: 'service_level_agreement'
}

// Helper function to get configuration by account slug or name
export function getLanguageConfigForAccount(accountIdentifier: string): Record<string, string> {
  switch (accountIdentifier.toLowerCase()) {
    case 'demo':
    case 'scopestack-demo':
      return DEMO_ACCOUNT_CONFIG
    
    case 'alternative-a':
      return ALTERNATIVE_CONFIG_A
      
    case 'alternative-b':
      return ALTERNATIVE_CONFIG_B
      
    default:
      return DEFAULT_LANGUAGE_CONFIG
  }
}

// Helper function to create a custom configuration
export function createCustomLanguageConfig(mappings: Record<string, string>): Record<string, string> {
  return { ...DEFAULT_LANGUAGE_CONFIG, ...mappings }
}

// Available field examples (what we commonly see in ScopeStack accounts)
export const COMMON_SCOPESTACK_LANGUAGE_FIELDS = [
  'out',
  'operate', 
  'customer',
  'assumptions',
  'deliverables',
  'sow_language',
  'internal_only',
  'design_language',
  'planning_language', 
  'implementation_language',
  'service_level_agreement',
  'key_assumptions',
  'client_responsibilities',
  'out_of_scope',
  'service_description',
  'operational_notes',
  'design_notes',
  'planning_notes',
  'internal_notes',
  'sla'
]

/**
 * Instructions for setting up new accounts:
 * 
 * 1. Get the language fields from the ScopeStack account by inspecting an existing service
 * 2. Map our standard fields to their language field names:
 *    - keyAssumptions: What assumptions are being made
 *    - clientResponsibilities: What the client needs to do/provide
 *    - outOfScope: What is explicitly excluded
 *    - serviceDescription: Main detailed service description
 *    - operationalNotes: How to operate/maintain after implementation
 *    - deliverables: What will be delivered to the client
 *    - designNotes: Design considerations and decisions
 *    - planningNotes: Planning phase notes and considerations
 *    - internalNotes: Internal-only notes not visible to client
 *    - sla: Service level agreements and performance metrics
 * 
 * 3. Create a new configuration object or use createCustomLanguageConfig()
 * 4. Set it in the ScopeStack API service using setLanguageFieldMappings()
 */