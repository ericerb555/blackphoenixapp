/**
 * A boundary around one panel.
 *
 * Without it, a throw anywhere in the designer unmounts the whole page and the
 * app-level boundary paints its dark fallback — which reads as "the screen went
 * black" and carries no information about what actually failed.
 *
 * This keeps the failure local, names the panel, and shows the error text and
 * the top of the stack so it can be read off the screen and acted on. The rest
 * of the designer keeps working.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props { name: string; children: ReactNode }
interface State { error: Error | null; info: string }

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Also to the console, so a screenshot is not the only record.
    console.error(`[${this.props.name}] crashed:`, error, info.componentStack);
    this.setState({ info: (info.componentStack || '').split('\n').slice(0, 4).join('\n') });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="rounded-2xl p-4"
        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)' }}>
        <div className="flex items-center gap-2 font-bold text-red-300 mb-2">
          <AlertTriangle className="w-5 h-5" /> {this.props.name} could not be drawn
        </div>
        <p className="text-sm text-red-200 font-mono break-words">
          {error.message || String(error)}
        </p>
        {info && (
          <pre className="text-[11px] text-red-200/70 mt-2 whitespace-pre-wrap">{info.trim()}</pre>
        )}
        <button onClick={() => this.setState({ error: null, info: '' })}
          className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.10)' }}>
          <RotateCw className="w-3.5 h-3.5" /> Try again
        </button>
        <p className="text-xs text-red-200/60 mt-2">
          The rest of the designer is unaffected. Send this message along and it can be fixed
          directly.
        </p>
      </div>
    );
  }
}
