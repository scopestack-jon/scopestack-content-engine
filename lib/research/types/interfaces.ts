// Type definitions for research and content generation

export interface Subservice {
  name: string;
  description: string;
  hours: number;
  baseHours?: number;  // Base hours per unit
  quantity?: number;   // Calculated quantity from questions
  serviceDescription?: string;
  keyAssumptions?: string;
  clientResponsibilities?: string;
  outOfScope?: string;
}

export interface Service {
  name: string;
  description: string;
  hours: number;
  baseHours?: number;  // Base hours per unit
  quantity?: number;   // Calculated quantity from questions
  phase?: string;
  subservices?: Subservice[];
  serviceDescription?: string;
  keyAssumptions?: string;
  clientResponsibilities?: string;
  outOfScope?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  summary: string;
  credibility: 'high' | 'medium' | 'low';
  relevance: number;
  sourceType: 'documentation' | 'guide' | 'case_study' | 'vendor' | 'community' | 'blog' | 'news' | 'other';
}

export interface ResearchData {
  sources: ResearchSource[];
  researchSummary: string;
  keyInsights: string[];
  confidence: number;
}

export interface Question {
  id?: string;
  text: string;
  question?: string; // Frontend compatibility
  slug?: string; // Frontend compatibility
  type: 'multiple_choice' | 'text' | 'number' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface Calculation {
  id?: string;
  name: string;
  value: number | string;
  formula?: string;
  unit: string;
  source: string;
  mappedQuestions?: string[]; // Array of question slugs
  mappedServices?: string[]; // Array of service names this calculation applies to
}

export interface GeneratedContent {
  technology: string;
  questions: Question[];
  services: Service[];
  calculations: Calculation[];
  sources: ResearchSource[];
  totalHours: number;
}

export interface APIResponse {
  content?: GeneratedContent;
  error?: string;
  progress?: number;
}

export interface StreamingEvent {
  type: 'step' | 'progress' | 'complete' | 'error';
  stepId?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'error';
  progress?: number;
  model?: string;
  sources?: string[];
  content?: GeneratedContent;
  error?: string;
}