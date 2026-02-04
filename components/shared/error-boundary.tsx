"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackError } from '@/lib/monitoring/error-tracker';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  component?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Track error with context
    const trackedError = trackError(error, {
      component: this.props.component || 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        digest: (errorInfo as { digest?: string }).digest,
      },
    }, true);

    this.setState({ errorId: trackedError.id });
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} errorId={this.state.errorId} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, errorId, resetError }: { error?: Error; errorId?: string; resetError: () => void }): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <CardTitle className="text-zinc-50">Something went wrong</CardTitle>
          <CardDescription className="text-zinc-400">
            An unexpected error occurred. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <p className="text-sm text-zinc-300 font-mono break-all">
                {error.message}
              </p>
              {errorId && (
                <p className="text-xs text-zinc-500">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for functional components to catch errors
export function useErrorHandler(component?: string): (error: Error, errorInfo?: { componentStack?: string }) => void {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    trackError(error, {
      component,
      metadata: {
        componentStack: errorInfo?.componentStack,
      },
    }, true);
  };
}

