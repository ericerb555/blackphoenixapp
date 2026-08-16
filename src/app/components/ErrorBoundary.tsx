import React, { Component, ReactNode } from 'react';

/**
 * A page chunk that no longer exists on the server.
 *
 * Pages are loaded on demand and their filenames carry a build hash, so every
 * deploy renames them. A tab that was open across a deploy still holds the old
 * filenames, and the moment it opens a page it has not visited yet the request
 * 404s. The app is not broken — the browser is asking for a version of it that
 * has been replaced — but it surfaces as a hard render failure, which is how a
 * perfectly healthy site ends up saying something went wrong.
 *
 * Every browser words it differently, hence the list.
 */
const STALE_CHUNK = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css',
  'chunkloaderror',
  'loading chunk',
  'expected a javascript module script',
];

function isStaleChunk(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  const name = String((error as any)?.name || '').toLowerCase();
  return STALE_CHUNK.some(s => msg.includes(s) || name.includes(s));
}

/**
 * WHY THIS DOES NOT RELOAD BY ITSELF
 *
 * The obvious fix for a stale chunk is to reload and pick up the current build,
 * and that was tried. It is not safe. If the reload lands on the same failure —
 * for any reason, and there are several — it reloads again, and the result is
 * not an error message but a spinner that never stops. That is strictly worse
 * than the problem: an error screen tells you something is wrong and gives you
 * a button, an endless spinner tells you nothing and gives you nothing.
 *
 * A guard makes a loop unlikely rather than impossible, and "unlikely" is not
 * good enough for the code that runs when everything else has already failed.
 *
 * So the boundary only *recognises* the condition, and says plainly what
 * happened and what to do. Reloading is one click, it cannot loop, and the
 * person doing it can see whether it worked.
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onNavigate?: (page: string) => void;
}

interface State {
  hasError: boolean;
  /** True when the failure was a page replaced by a deploy, not a real fault. */
  stale: boolean;
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
      stale: false,
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
      stale: isStaleChunk(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't catch Suspense promises - let them bubble to Suspense boundary
    if (typeof error === 'object' && error !== null && 'then' in error) {
      // This is a promise (Suspense), re-throw it
      throw error;
    }

    // A page whose chunk was replaced by a deploy. Recorded so the fallback can
    // say what actually happened; see the note above on why it does not reload
    // on its own.
    if (isStaleChunk(error)) {
      console.warn('[ErrorBoundary] Stale page chunk — the app was updated while this tab was open.');
      this.setState({ stale: true });
    }

    // Suppress fetch-related errors (already handled by components)
    const errorMessage = error?.message || '';
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed')) {
      // Non-actionable network error — components handle their own fetch UX.
      // Reset error state instead of showing error UI
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        stale: false,
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
            {this.state.stale
              ? 'The app was updated while this tab was open'
              : 'Something went wrong loading this page'}
          </h1>
          <p style={{
            color: '#9ca3af',
            marginBottom: '8px',
            textAlign: 'center',
            maxWidth: '600px',
          }}>
            {this.state.stale
              // Naming the cause matters: nothing is broken and no work has
              // been lost, which is not what "something went wrong" suggests.
              ? 'This page was replaced by a newer version, so your browser asked for one that no longer exists. Reload and it will pick up the current version. Nothing has been lost.'
              : (this.state.error?.message || 'Unknown error')}
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
          {/* Reload first. The commonest cause of this screen is a page that
              was replaced by a deploy while the tab sat open, and a reload
              fixes that outright — where going to the dashboard just moves the
              problem somewhere else. */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
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
              Reload the page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null, stale: false });
                if (this.props.onNavigate) {
                  this.props.onNavigate('unified-dashboard');
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}