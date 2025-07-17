// Structured error types for ScopeStack Content Engine

export enum ErrorCode {
  // API Errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_TIMEOUT = 'API_TIMEOUT',
  API_INVALID_RESPONSE = 'API_INVALID_RESPONSE',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  
  // Research Process Errors
  RESEARCH_PARSING_FAILED = 'RESEARCH_PARSING_FAILED',
  RESEARCH_WEB_SEARCH_FAILED = 'RESEARCH_WEB_SEARCH_FAILED',
  RESEARCH_ANALYSIS_FAILED = 'RESEARCH_ANALYSIS_FAILED',
  RESEARCH_CONTENT_GENERATION_FAILED = 'RESEARCH_CONTENT_GENERATION_FAILED',
  RESEARCH_FORMATTING_FAILED = 'RESEARCH_FORMATTING_FAILED',
  
  // Content Errors
  CONTENT_INVALID_FORMAT = 'CONTENT_INVALID_FORMAT',
  CONTENT_MISSING_REQUIRED_FIELDS = 'CONTENT_MISSING_REQUIRED_FIELDS',
  CONTENT_SERIALIZATION_FAILED = 'CONTENT_SERIALIZATION_FAILED',
  
  // ScopeStack Integration Errors
  SCOPESTACK_CONFIG_MISSING = 'SCOPESTACK_CONFIG_MISSING',
  SCOPESTACK_CONNECTION_FAILED = 'SCOPESTACK_CONNECTION_FAILED',
  SCOPESTACK_PUSH_FAILED = 'SCOPESTACK_PUSH_FAILED',
  
  // User Input Errors
  INPUT_REQUIRED = 'INPUT_REQUIRED',
  INPUT_INVALID_FORMAT = 'INPUT_INVALID_FORMAT',
  
  // System Errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export class ScopeStackError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    code: ErrorCode,
    message: string,
    context: Partial<ErrorContext> = {},
    isRetryable = false,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'ScopeStackError';
    this.code = code;
    this.context = {
      timestamp: Date.now(),
      ...context
    };
    this.isRetryable = isRetryable;
    this.severity = severity;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScopeStackError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      severity: this.severity,
      stack: this.stack
    };
  }
}

// Specific error classes for different domains
export class APIError extends ScopeStackError {
  public readonly statusCode?: number;
  public readonly responseBody?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    responseBody?: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(code, message, context, true, 'high'); // API errors are usually retryable
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class ResearchError extends ScopeStackError {
  public readonly step: string;
  public readonly model?: string;

  constructor(
    code: ErrorCode,
    message: string,
    step: string,
    model?: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(code, message, context, true, 'high');
    this.step = step;
    this.model = model;
  }
}

export class ContentError extends ScopeStackError {
  public readonly validationErrors?: string[];

  constructor(
    code: ErrorCode,
    message: string,
    validationErrors?: string[],
    context: Partial<ErrorContext> = {}
  ) {
    super(code, message, context, false, 'medium');
    this.validationErrors = validationErrors;
  }
}

// Error factory functions for common scenarios
export const createAPIError = (
  message: string,
  statusCode?: number,
  responseBody?: string
): APIError => {
  let code = ErrorCode.API_NETWORK_ERROR;
  
  if (statusCode) {
    if (statusCode === 429) code = ErrorCode.API_RATE_LIMIT;
    else if (statusCode === 408 || statusCode === 504) code = ErrorCode.API_TIMEOUT;
    else if (statusCode >= 400 && statusCode < 500) code = ErrorCode.API_INVALID_RESPONSE;
  }
  
  return new APIError(code, message, statusCode, responseBody);
};

export const createResearchError = (
  step: string,
  message: string,
  model?: string
): ResearchError => {
  const codeMap: Record<string, ErrorCode> = {
    'parse': ErrorCode.RESEARCH_PARSING_FAILED,
    'research': ErrorCode.RESEARCH_WEB_SEARCH_FAILED,
    'analyze': ErrorCode.RESEARCH_ANALYSIS_FAILED,
    'generate': ErrorCode.RESEARCH_CONTENT_GENERATION_FAILED,
    'format': ErrorCode.RESEARCH_FORMATTING_FAILED
  };
  
  const code = codeMap[step] || ErrorCode.UNKNOWN_ERROR;
  return new ResearchError(code, message, step, model);
};

// Utility functions for error handling
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof ScopeStackError) {
    return error.isRetryable;
  }
  
  // Check for common retryable error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('rate limit') ||
           message.includes('503') ||
           message.includes('502');
  }
  
  return false;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ScopeStackError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
};

export const getUserFriendlyMessage = (error: unknown): string => {
  if (error instanceof ScopeStackError) {
    switch (error.code) {
      case ErrorCode.API_KEY_MISSING:
        return 'API configuration is missing. Please check your settings.';
      case ErrorCode.API_RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCode.API_TIMEOUT:
        return 'The request took too long to complete. Please try again.';
      case ErrorCode.RESEARCH_PARSING_FAILED:
        return 'Failed to understand your request. Please try rephrasing it.';
      case ErrorCode.RESEARCH_WEB_SEARCH_FAILED:
        return 'Unable to conduct web research. Please check your internet connection.';
      case ErrorCode.SCOPESTACK_CONFIG_MISSING:
        return 'ScopeStack integration is not configured. Please check your settings.';
      case ErrorCode.INPUT_REQUIRED:
        return 'Please provide a description of your technology solution.';
      default:
        return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Error logging utility
export const logError = (error: unknown, context: Partial<ErrorContext> = {}): void => {
  const errorData = {
    timestamp: Date.now(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error),
    context
  };
  
  console.error('[ScopeStack Error]', errorData);
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, or Bugsnag
};