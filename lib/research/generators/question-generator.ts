// AI-driven Question Generation
// Generates contextual questions based on research findings

import { getOpenRouterClient } from '../api/openrouter-client';
import { ResearchData, Question } from '../types/interfaces';
import { extractTechnologyName } from '../utils/response-processor';

export class QuestionGenerator {
  private client = getOpenRouterClient();

  /**
   * Generates research-driven questions for project scoping
   */
  async generateQuestionsFromResearch(researchData: ResearchData, userRequest: string): Promise<Question[]> {
    const technology = extractTechnologyName(userRequest);
    
    try {
      // Extract key insights from research to inform question generation
      const researchContext = {
        sources: researchData.sources || [],
        summary: researchData.researchSummary || '',
        insights: researchData.keyInsights || [],
        userRequest: userRequest
      };
      
      // Create a prompt for AI to generate contextual questions based on research
      const prompt = `Based on this research about "${userRequest}", generate 5-8 specific, actionable questions that would help scope a professional services project.

Research Context:
- User Request: ${userRequest}
- Research Summary: ${researchContext.summary}
- Key Insights: ${researchContext.insights.join(', ')}
- Source Topics: ${researchContext.sources.map((s: any) => s.title).slice(0, 5).join(', ')}

Generate questions that are:
1. Specific to the technology and use case mentioned
2. Based on the actual research findings above
3. Practical for professional services scoping
4. Include multiple choice options with realistic values/hours/complexities

Return ONLY a JSON array of questions in this exact format:
[
  {
    "text": "Question text here?",
    "type": "multiple_choice",
    "options": ["Option 1", "Option 2", "Option 3"],
    "required": true
  }
]

NO markdown, NO explanations, ONLY the JSON array.`;

      // Call OpenRouter API to generate research-driven questions
      const aiContent = await this.client.generateWithRetry(
        'anthropic/claude-3.5-sonnet',
        prompt
      );

      if (!aiContent) {
        console.warn('No AI response content, using fallback');
        return this.getFallbackQuestions(technology);
      }

      // Parse the AI-generated questions
      let questions;
      try {
        // Extract JSON from the response
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          questions = JSON.parse(aiContent);
        }
      } catch (parseError) {
        console.warn('Failed to parse AI questions:', parseError);
        return this.getFallbackQuestions(technology);
      }

      // Validate the structure
      if (Array.isArray(questions) && questions.length > 0) {
        // Ensure all questions have required fields
        const validatedQuestions: Question[] = questions.map((q: any, index: number) => ({
          text: q.text || q.question || `Question ${index + 1}`,
          type: q.type || 'multiple_choice',
          options: Array.isArray(q.options) ? q.options : ["Yes", "No"],
          required: q.required !== false // Default to true
        }));

        console.log(`✅ Generated ${validatedQuestions.length} AI-driven questions based on research`);
        return validatedQuestions.slice(0, 8); // Limit to 8 questions max
      }

    } catch (error) {
      console.warn('Error generating research-driven questions:', error);
    }

    // Fallback to basic questions if AI generation fails
    return this.getFallbackQuestions(technology);
  }

  /**
   * Fallback questions when AI generation fails
   */
  private getFallbackQuestions(technology: string): Question[] {
    return [
      {
        text: `What is the primary scope of your ${technology} project?`,
        type: 'multiple_choice',
        options: [
          "New implementation",
          "Upgrade/migration", 
          "Configuration changes",
          "Troubleshooting"
        ],
        required: true
      },
      {
        text: "What is the size of your environment?",
        type: 'multiple_choice',
        options: [
          "Small (1-50 users)",
          "Medium (51-500 users)",
          "Large (501-2000 users)",
          "Enterprise (2000+ users)"
        ],
        required: true
      },
      {
        text: "What is your target timeline for completion?",
        type: 'multiple_choice',
        options: [
          "1-2 weeks",
          "1-2 months",
          "3-6 months",
          "6+ months"
        ],
        required: true
      }
    ];
  }
}

// Singleton instance
let questionGeneratorInstance: QuestionGenerator | null = null;

export function getQuestionGenerator(): QuestionGenerator {
  if (!questionGeneratorInstance) {
    questionGeneratorInstance = new QuestionGenerator();
  }
  return questionGeneratorInstance;
}