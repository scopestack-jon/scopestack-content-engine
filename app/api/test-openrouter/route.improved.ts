// Improved version of the OpenRouter test API with enhanced error handling
import { NextRequest } from 'next/server';
import { 
  withErrorHandling, 
  validateRequestBody, 
  createSuccessResponse,
  getRequiredEnvVar,
  withTimeout
} from '@/lib/api-utils';
import { retryAPICall } from '@/lib/retry';
import { ScopeStackError, ErrorCode, createAPIError } from '@/lib/errors';

interface TestRequest {
  prompt: string;
  model?: string;
}

async function testOpenRouterConnection(data: TestRequest) {
  const apiKey = getRequiredEnvVar('OPENROUTER_API_KEY');
  const model = data.model || 'anthropic/claude-3.5-sonnet';
  
  const response = await retryAPICall(
    async () => {
      const result = await withTimeout(
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'ScopeStack Content Engine Test'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: `Test prompt: ${data.prompt}`
              }
            ],
            max_tokens: 100,
            temperature: 0.1
          })
        }),
        30000, // 30 second timeout
        'OpenRouter API request timed out'
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw createAPIError(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      return response.json();
    },
    'OpenRouter test',
    model
  );

  return {
    success: true,
    model,
    responseLength: response.choices?.[0]?.message?.content?.length || 0,
    usage: response.usage,
    testTime: new Date().toISOString()
  };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request body
  const data = await validateRequestBody<TestRequest>(request, {
    required: ['prompt'],
    optional: ['model'],
    validate: (data) => typeof data.prompt === 'string' && data.prompt.trim().length > 0
  });

  // Test the connection
  const result = await testOpenRouterConnection(data);
  
  return createSuccessResponse(result);
});