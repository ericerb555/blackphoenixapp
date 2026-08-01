/**
 * TabErrorBoundary — isolates a rendering crash to a single tab/section.
 *
 * React error boundaries must be class components. Wrap a tab's content in this
 * so a bad data shape shows a friendly, actionable message instead of blanking
 * the whole screen. Give it a `resetKey` (e.g. the active tab id) — when the key
 * changes the boundary clears itself, so navigating away and back recovers.
 */
import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this value changes, the boundary resets and re-renders its children. */
  resetKey?: string | number;
  /** Optional label shown in the fallback ("Couldn't load the {label}."). */
  label?: string;
}

interface State {
  error: Error | null;
}

export default class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface the details for debugging without crashing the app.
    console.error(`[TabErrorBoundary]${this.props.label ? ` ${this.props.label}:` : ''}`, error, info);
  }

  componentDidUpdate(prev: Props) {
    // Reset when the caller signals a new context (e.g. a different tab).
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Couldn&apos;t load the {this.props.label || 'this section'}.
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">
            Something in this section&apos;s data caused a display error. Your other data is safe.
            Try again, or switch to another tab and back.
          </p>
          <p className="mx-auto mt-2 max-w-md truncate text-xs text-gray-600" title={this.state.error.message}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleRetry}
            className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
