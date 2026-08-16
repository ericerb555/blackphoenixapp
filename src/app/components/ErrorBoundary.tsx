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
 * Reload once, and only once, so a genuine failure cannot become a reload loop.
 * The marker is per tab and expires, so a stale chunk hours later still recovers.
 */
const RELOAD_MARK = 'bpb:stale-chunk-reload';
const RELOAD_WINDOW_MS = 60_000;

function reloadOnceForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARK) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_MARK, String(Date.now()));
  } catch {
    // Private browsing with storage disabled: reloading once is still better
    // than showing an error for a page that would load fine.
  }
  window.location.reload();
  return true;
}

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

  /**
   * A dynamic import can also fail as an unhandled rejection, which never
   * reaches a boundary. Catching it here means a deploy mid-session recovers
   * the same way wherever the failure surfaces.
   */
  private onRejection = (e: PromiseRejectionEvent) => {
    if (!isStaleChunk(e.reason)) return;
    console.warn('[ErrorBoundary] Stale page chunk in a rejected import — reloading.');
    reloadOnceForStaleChunk();
  };

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.onRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.onRejection);
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

    // A page whose chunk was replaced by a deploy. Fetch the new one rather
    // than telling someone their app is broken when it is not.
    if (isStaleChunk(error)) {
      console.warn('[ErrorBoundary] Stale page chunk — reloading to pick up the current build.');
      if (reloadOnceForStaleChunk()) return;
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
                this.setState({ hasError: false, error: null, errorInfo: null });
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