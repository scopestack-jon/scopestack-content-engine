// Feature flags for research and content generation

export const FEATURE_FLAGS = {
  // Use the new service-first orchestration flow
  USE_SERVICE_FIRST_FLOW: true,
  
  // Enable detailed logging for calculations
  DEBUG_CALCULATIONS: true,
  
  // Use enhanced service generator with scaling metadata
  USE_ENHANCED_SERVICES: true,
  
  // Enable context-specific questions from research
  ENABLE_CONTEXT_QUESTIONS: true
};

// Helper to check if v2 orchestration is enabled
export function useV2Orchestration(): boolean {
  // Check environment variable first
  if (process.env.USE_V2_ORCHESTRATION === 'false') {
    return false;
  }
  
  return FEATURE_FLAGS.USE_SERVICE_FIRST_FLOW;
}