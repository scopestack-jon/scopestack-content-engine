// API utilities for improved error handling
import { NextRequest, NextResponse } from 'next/server';
import { ScopeStackError, ErrorCode, createAPIError, logError } from './errors';

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

/**
 * Standardized API error response
 */
export function createErrorResponse(
  error: unknown,
  status = 500
): NextResponse {
  let apiError: APIError;

  if (error instanceof ScopeStackError) {
    apiError = {
      code: error.code,
      message: error.message,
      details: error.context,
      timestamp: Date.now()
    };
    
    // Use appropriate HTTP status based on error code
    switch (error.code) {
      case ErrorCode.INPUT_REQUIRED:
      case ErrorCode.INPUT_INVALID_FORMAT:
        status = 400;
        break;
      case ErrorCode.API_KEY_MISSING:
      case ErrorCode.SCOPESTACK_CONFIG_MISSING:
        status = 401;
        break;
      case ErrorCode.API_RATE_LIMIT:
        status = 429;
        break;
      case ErrorCode.API_TIMEOUT:
        status = 408;
        break;
      default:
        status = error.severity === 'critical' ? 500 : 400;
    }
  } else if (error instanceof Error) {
    apiError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      timestamp: Date.now()
    };
  } else {
    apiError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'An unknown error occurred',
      timestamp: Date.now()
    };
  }

  // Log the error
  logError(error, { apiEndpoint: true });

  return NextResponse.json({ error: apiError }, { status });
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * Validate request body with structured error handling
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: {
    required?: string[];
    optional?: string[];
    validate?: (data: any) => boolean;
  }
): Promise<T> {
  let data: any;
  
  try {
    data = await request.json();
  } catch (error) {
    throw new ScopeStackError(
      ErrorCode.INPUT_INVALID_FORMAT,
      'Invalid JSON in request body'
    );
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!data[field]) {
        throw new ScopeStackError(
          ErrorCode.INPUT_REQUIRED,
          `Missing required field: ${field}`
        );
      }
    }
  }

  // Custom validation
  if (schema.validate && !schema.validate(data)) {
    throw new ScopeStackError(
      ErrorCode.INPUT_INVALID_FORMAT,
      'Request data failed validation'
    );
  }

  return data as T;
}

/**
 * Server-sent events helper with error handling
 */
export class SSEStream {
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private closed = false;

  constructor() {}

  createStream(): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.closed = true;
      }
    });
  }

  sendEvent(type: string, data: any): boolean {
    if (this.closed || !this.controller) {
      return false;
    }

    try {
      const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      this.controller.enqueue(this.encoder.encode(event));
      return true;
    } catch (error) {
      logError(error, { context: 'SSE event sending' });
      return false;
    }
  }

  sendError(error: unknown): boolean {
    const errorData = error instanceof ScopeStackError ? {
      code: error.code,
      message: error.message,
      severity: error.severity
    } : {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    };

    return this.sendEvent('error', errorData);
  }

  close(): void {
    if (this.controller && !this.closed) {
      this.controller.close();
      this.closed = true;
    }
  }
}

/**
 * Rate limiting helper
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || entry.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

/**
 * Environment variable helper with validation
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ScopeStackError(
      ErrorCode.API_KEY_MISSING,
      `Missing required environment variable: ${name}`
    );
  }
  return value;
}

export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

/**
 * Timeout wrapper for async operations
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ScopeStackError(ErrorCode.API_TIMEOUT, errorMessage)),
        timeoutMs
      )
    )
  ]);
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T = any>(
  text: string,
  fallback?: T
): T | null {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    logError(error, { context: 'JSON parsing', text: text.substring(0, 100) });
    return null;
  }
}

/**
 * Response helper for successful API responses
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: Date.now()
    },
    { status }
  );
}