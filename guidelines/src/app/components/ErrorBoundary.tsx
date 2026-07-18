import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onNavigate?: (page: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Don't catch Suspense promises - let them bubble to Suspense boundary
    // Suspense works by throwing a promise, which looks like an error
    if (typeof error === 'object' && error !== null && 'then' in error) {
      // This is a promise (Suspense), re-throw it
      throw error;
    }
    
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't catch Suspense promises - let them bubble to Suspense boundary
    if (typeof error === 'object' && error !== null && 'then' in error) {
      // This is a promise (Suspense), re-throw it
      throw error;
    }

    // Suppress fetch-related errors (already handled by components)
    const errorMessage = error?.message || '';
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed')) {
      console.warn('⚠️ ErrorBoundary suppressed network error (handled elsewhere)');
      // Reset error state instead of showing error UI
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
      return;
    }

    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '40px',
          color: '#ffffff',
          backgroundColor: '#0A0A0A',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <h1 style={{
            color: '#ea580c',
            fontSize: '24px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            Something went wrong loading this page
          </h1>
          <p style={{
            color: '#9ca3af',
            marginBottom: '8px',
            textAlign: 'center',
            maxWidth: '600px',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          {this.state.errorInfo && (
            <details style={{
              marginTop: '16px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#1A1A1A',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
            }}>
              <summary style={{ color: '#ea580c', cursor: 'pointer', marginBottom: '8px' }}>
                Error Details
              </summary>
              <pre style={{
                color: '#9ca3af',
                fontSize: '12px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              if (this.props.onNavigate) {
                this.props.onNavigate('unified-dashboard');
              }
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}