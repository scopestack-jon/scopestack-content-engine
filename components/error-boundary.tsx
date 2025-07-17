"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ScopeStackError, logError, getUserFriendlyMessage } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      errorId: this.state.errorId
    });

    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleReportError = () => {
    const { error, errorId } = this.state;
    const errorData = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Copy error data to clipboard for reporting
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please paste this information when reporting the issue.');
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const userMessage = getUserFriendlyMessage(error);
      const isProductionError = error instanceof ScopeStackError;

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-red-700">
              <p className="font-medium">{userMessage}</p>
              {errorId && (
                <p className="text-sm text-red-600 mt-2">
                  Error ID: <code className="bg-red-100 px-1 rounded">{errorId}</code>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>

              {!isProductionError && (
                <Button
                  onClick={this.handleReportError}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600"
                >
                  <Bug className="h-4 w-4" />
                  Report Error
                </Button>
              )}
            </div>

            {/* Show technical details only in development */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs">
                  <pre className="whitespace-pre-wrap break-words">
                    <strong>Error:</strong> {error.message}
                    {'\n\n'}
                    <strong>Stack:</strong>
                    {'\n'}
                    {error.stack}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        <strong>Component Stack:</strong>
                        {'\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Specialized error boundaries for different sections
export function ResearchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-medium text-orange-800 mb-2">Research Process Error</h3>
            <p className="text-orange-700 mb-4">
              There was a problem with the research process. This might be due to network issues or AI service problems.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Restart Research
            </Button>
          </CardContent>
        </Card>
      }
      onError={(error, errorInfo) => {
        logError(error, {
          section: 'research',
          componentStack: errorInfo.componentStack
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ContentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-medium text-blue-800 mb-2">Content Display Error</h3>
            <p className="text-blue-700 mb-4">
              There was a problem displaying the generated content. The content might be corrupted or in an unexpected format.
            </p>
            <Button 
              onClick={() => {
                localStorage.removeItem('generated_content');
                window.location.reload();
              }} 
              variant="outline"
            >
              Clear Content & Restart
            </Button>
          </CardContent>
        </Card>
      }
      onError={(error, errorInfo) => {
        logError(error, {
          section: 'content-display',
          componentStack: errorInfo.componentStack
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}