// OpenRouter API Client with retry logic and timeout handling

import { API_TIMEOUT, MAX_RETRY_ATTEMPTS, INITIAL_RETRY_DELAY, MAX_RETRY_DELAY } from '../config/constants';

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Generate text with timeout handling
   */
  async generateTextWithTimeout(
    model: string,
    prompt: string,
    timeout: number = API_TIMEOUT
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate text with retry logic
   */
  async generateWithRetry(
    model: string,
    prompt: string,
    maxRetries: number = MAX_RETRY_ATTEMPTS
  ): Promise<string> {
    let lastError: Error | null = null;
    let delay = INITIAL_RETRY_DELAY;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API call attempt ${attempt}${attempt > 1 ? ` (retry)` : ''}`);
        return await this.generateTextWithTimeout(model, prompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`API call attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          // Add jitter to prevent thundering herd
          const jitter = Math.random() * 0.3; // 30% jitter
          const actualDelay = delay * (1 + jitter);
          
          console.log(`Retrying after ${actualDelay.toFixed(1)}ms...`);
          await new Promise(resolve => setTimeout(resolve, actualDelay));
          
          // Exponential backoff with max delay
          delay = Math.min(delay * 2, MAX_RETRY_DELAY);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Basic API call without retry logic (for internal use)
   */
  async callOpenRouter(model: string, prompt: string): Promise<any> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let openRouterClientInstance: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!openRouterClientInstance) {
    openRouterClientInstance = new OpenRouterClient();
  }
  return openRouterClientInstance;
}