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
4. Mix of multiple choice questions AND numerical quantity questions
5. Use "How many" for quantity questions (users, mailboxes, servers, storage amounts)

QUESTION TYPES:
- Multiple choice: For decisions, preferences, complexity levels
- Numerical: For quantities like "How many users need to be migrated?", "How much storage data?", "What is the project budget?"

Return ONLY a JSON array of questions in this exact format:
[
  {
    "text": "How many users need to be migrated?",
    "type": "number",
    "required": true
  },
  {
    "text": "What is the complexity level of current email integrations?",
    "type": "multiple_choice", 
    "options": ["Simple (basic email only)", "Moderate (some integrations)", "Complex (many integrations)"],
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
        // Ensure all questions have required fields in frontend-compatible format
        const validatedQuestions: Question[] = questions.map((q: any, index: number) => {
          const questionText = q.text || q.question || `Question ${index + 1}`;
          const slug = questionText.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);

          // Convert options to frontend format
          const formattedOptions = Array.isArray(q.options) 
            ? q.options.map((opt: string, optIndex: number) => ({
                key: opt,
                value: optIndex + 1,
                default: optIndex === 0 // First option is default
              }))
            : [
                { key: "Yes", value: 1, default: true },
                { key: "No", value: 0, default: false }
              ];

          const finalQuestion = {
            id: `q${index + 1}`,
            slug: slug,
            question: questionText, // Frontend expects "question" not "text"
            options: formattedOptions,
            text: questionText,
            type: q.type || 'multiple_choice',
            required: q.required !== false
          };
          
          console.log(`Question ${index + 1} formatted:`, {
            text: finalQuestion.text,
            question: finalQuestion.question,
            slug: finalQuestion.slug,
            hasOptions: finalQuestion.options.length > 0
          });
          
          return finalQuestion as any; // Use any to accommodate both interfaces
        });

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
    const fallbackQuestions = [
      {
        text: `What is the primary scope of your ${technology} project?`,
        options: [
          "New implementation",
          "Upgrade/migration", 
          "Configuration changes",
          "Troubleshooting"
        ]
      },
      {
        text: "What is the size of your environment?",
        options: [
          "Small (1-50 users)",
          "Medium (51-500 users)",
          "Large (501-2000 users)",
          "Enterprise (2000+ users)"
        ]
      },
      {
        text: "What is your target timeline for completion?",
        options: [
          "1-2 weeks",
          "1-2 months",
          "3-6 months",
          "6+ months"
        ]
      }
    ];

    // Format fallback questions to match frontend expectations
    return fallbackQuestions.map((q: any, index: number) => {
      const slug = q.text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const formattedOptions = q.options.map((opt: string, optIndex: number) => ({
        key: opt,
        value: optIndex + 1,
        default: optIndex === 0 // First option is default
      }));

      return {
        id: `q${index + 1}`,
        slug: slug,
        question: q.text, // Frontend expects "question" not "text"
        options: formattedOptions,
        text: q.text,
        type: 'multiple_choice',
        required: true
      } as any; // Use any to accommodate both interfaces
    });
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