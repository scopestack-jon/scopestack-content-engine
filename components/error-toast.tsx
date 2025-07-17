"use client"

import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Info, XCircle, RefreshCw } from 'lucide-react';
import { ScopeStackError, getUserFriendlyMessage, ErrorCode } from '@/lib/errors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ErrorToastOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  dismissible?: boolean;
}

/**
 * Enhanced error toast with retry functionality
 */
export function showErrorToast(
  error: unknown,
  options: ErrorToastOptions = {}
) {
  const userMessage = getUserFriendlyMessage(error);
  const title = options.title || 'Error';
  
  let icon = <XCircle className="h-4 w-4" />;
  let duration = options.duration || 5000;
  
  // Customize based on error type
  if (error instanceof ScopeStackError) {
    switch (error.severity) {
      case 'low':
        icon = <Info className="h-4 w-4" />;
        duration = 3000;
        break;
      case 'medium':
        icon = <AlertTriangle className="h-4 w-4" />;
        duration = 5000;
        break;
      case 'high':
      case 'critical':
        icon = <XCircle className="h-4 w-4" />;
        duration = 8000;
        break;
    }
  }

  const toastId = toast.error(userMessage, {
    description: options.description,
    duration,
    dismissible: options.dismissible !== false,
    icon,
    action: options.action ? {
      label: options.action.label,
      onClick: options.action.onClick
    } : undefined,
    style: {
      border: '1px solid #fecaca',
      backgroundColor: '#fef2f2'
    }
  });

  return toastId;
}

/**
 * Success toast for positive actions
 */
export function showSuccessToast(
  message: string,
  options: ErrorToastOptions = {}
) {
  const toastId = toast.success(message, {
    description: options.description,
    duration: options.duration || 3000,
    dismissible: options.dismissible !== false,
    icon: <CheckCircle className="h-4 w-4" />,
    action: options.action,
    style: {
      border: '1px solid #bbf7d0',
      backgroundColor: '#f0fdf4'
    }
  });

  return toastId;
}

/**
 * Warning toast for non-critical issues
 */
export function showWarningToast(
  message: string,
  options: ErrorToastOptions = {}
) {
  const toastId = toast.warning(message, {
    description: options.description,
    duration: options.duration || 4000,
    dismissible: options.dismissible !== false,
    icon: <AlertTriangle className="h-4 w-4" />,
    action: options.action,
    style: {
      border: '1px solid #fed7aa',
      backgroundColor: '#fffbeb'
    }
  });

  return toastId;
}

/**
 * Info toast for general information
 */
export function showInfoToast(
  message: string,
  options: ErrorToastOptions = {}
) {
  const toastId = toast.info(message, {
    description: options.description,
    duration: options.duration || 3000,
    dismissible: options.dismissible !== false,
    icon: <Info className="h-4 w-4" />,
    action: options.action,
    style: {
      border: '1px solid #bfdbfe',
      backgroundColor: '#eff6ff'
    }
  });

  return toastId;
}

/**
 * Loading toast for long-running operations
 */
export function showLoadingToast(
  message: string,
  options: ErrorToastOptions = {}
) {
  const toastId = toast.loading(message, {
    description: options.description,
    dismissible: false,
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    style: {
      border: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    }
  });

  return toastId;
}

/**
 * Retry toast with built-in retry functionality
 */
export function showRetryToast(
  error: unknown,
  onRetry: () => void,
  options: ErrorToastOptions = {}
) {
  const userMessage = getUserFriendlyMessage(error);
  const isRetryable = error instanceof ScopeStackError && error.isRetryable;
  
  return showErrorToast(error, {
    ...options,
    action: isRetryable ? {
      label: 'Retry',
      onClick: onRetry
    } : undefined,
    duration: 8000 // Longer duration for retry toasts
  });
}

/**
 * Progressive error toast that adapts based on error frequency
 */
let errorCount = 0;
let lastErrorTime = 0;

export function showProgressiveErrorToast(error: unknown, onRetry?: () => void) {
  const now = Date.now();
  const timeSinceLastError = now - lastErrorTime;
  
  // Reset count if it's been more than 5 minutes since last error
  if (timeSinceLastError > 300000) {
    errorCount = 0;
  }
  
  errorCount++;
  lastErrorTime = now;
  
  let message = getUserFriendlyMessage(error);
  let duration = 5000;
  let showRetry = false;
  
  if (errorCount === 1) {
    // First error - show simple message
    showRetry = true;
  } else if (errorCount === 2) {
    // Second error - suggest checking connection
    message = "Still having trouble. Please check your internet connection.";
    duration = 6000;
    showRetry = true;
  } else if (errorCount >= 3) {
    // Multiple errors - suggest refreshing or contacting support
    message = "Multiple errors detected. Try refreshing the page or contact support if the problem persists.";
    duration = 8000;
    showRetry = false;
  }
  
  return showErrorToast(error, {
    description: errorCount > 1 ? `Error ${errorCount} in the last few minutes` : undefined,
    duration,
    action: showRetry && onRetry ? {
      label: 'Retry',
      onClick: onRetry
    } : undefined
  });
}

/**
 * Research-specific error toast with step context
 */
export function showResearchErrorToast(
  error: unknown,
  step: string,
  onRetry?: () => void
) {
  let message = getUserFriendlyMessage(error);
  
  // Add step-specific context
  const stepMessages = {
    'parse': 'Failed to understand your request.',
    'research': 'Unable to conduct web research.',
    'analyze': 'Failed to analyze research results.',
    'generate': 'Could not generate content structure.',
    'format': 'Failed to format content for ScopeStack.'
  };
  
  const stepMessage = stepMessages[step as keyof typeof stepMessages];
  if (stepMessage) {
    message = stepMessage;
  }
  
  return showRetryToast(error, onRetry || (() => {}), {
    title: `${step.charAt(0).toUpperCase() + step.slice(1)} Failed`,
    description: error instanceof ScopeStackError ? error.message : undefined
  });
}

/**
 * Hook for handling errors with automatic toast display
 */
export function useErrorHandler() {
  const handleError = (
    error: unknown,
    options: {
      showToast?: boolean;
      onRetry?: () => void;
      context?: string;
    } = {}
  ) => {
    const { showToast = true, onRetry, context } = options;
    
    // Log error for debugging
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    // Show toast if requested
    if (showToast) {
      if (onRetry) {
        showRetryToast(error, onRetry);
      } else {
        showErrorToast(error);
      }
    }
    
    // Return error for further handling if needed
    return error;
  };
  
  return { handleError };
}

/**
 * Error boundary integration for toast notifications
 */
export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      showErrorToast(event.reason, {
        title: 'Unexpected Error',
        description: 'An unexpected error occurred. Please try refreshing the page.'
      });
    };
    
    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      showErrorToast(event.error, {
        title: 'System Error',
        description: 'A system error occurred. Please refresh the page.'
      });
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
  return <>{children}</>;
}