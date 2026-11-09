/**
 * The panel where a module appears when Phoenix is asked to show one.
 *
 * WHAT IS ACTUALLY HAPPENING HERE
 *
 * The real page component, mounted. Not a copy, not a summary, not rows the
 * model read out — `pageMap[route]` is the same component the route would
 * render, fetching its own data, as the signed-in person, through the
 * requests it always makes.
 *
 * That is the whole security argument for this feature, so it is worth
 * saying plainly: Phoenix does not fetch this data and does not see it. It
 * names a module; the browser decides whether this person may load it,
 * exactly as it would if they had typed the address. Phoenix cannot show
 * somebody something they could not already open, because Phoenix is not
 * the one opening it.
 *
 * It is also why a two-hundred-row table costs nothing. No row enters a
 * prompt, so no row is paid for in tokens or at risk of being retyped
 * slightly wrong by a language model.
 *
 * WHY THE BOUNDARY
 *
 * These components were written assuming a full screen and a particular
 * route's props. Some will throw in here. A throw must take out the panel
 * and leave the conversation alive — losing the transcript because a
 * dashboard could not mount would be a bad trade for the person mid-question.
 */
import { Suspense } from 'react';
import { X, Maximize2, Minimize2, ExternalLink, Loader2 } from 'lucide-react';
import { pageMap } from '../routes';
import PanelErrorBoundary from './PanelErrorBoundary';
import type { OpenDirective } from '../lib/aiActivity';

interface PhoenixWorkspaceProps {
  module: OpenDirective;
  onClose: () => void;
  /** Hand the whole page over to this module. */
  expanded: boolean;
  onToggleExpand: () => void;
  /** Leave Phoenix and go to the module's own route. */
  onNavigate?: (page: string) => void;
}

export default function PhoenixWorkspace({
  module, onClose, expanded, onToggleExpand, onNavigate,
}: PhoenixWorkspaceProps) {
  const Component = (pageMap as Record<string, any>)[module.route];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-[#2A2A2A] bg-[#0A0A0A]">
      {/* Panel chrome */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#2A2A2A] bg-[#101010] px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{module.label}</p>
          <p className="text-[11px] text-gray-600">Live — your data, your permissions</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onNavigate?.(module.route)}
            title="Open as a full page"
            aria-label={`Open ${module.label} as a full page`}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-[#1A1A1A] hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleExpand}
            title={expanded ? 'Show the conversation' : 'Fill the screen'}
            aria-label={expanded ? 'Show the conversation' : 'Expand this module to fill the screen'}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-[#1A1A1A] hover:text-white"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            aria-label={`Close ${module.label}`}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-[#1A1A1A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The module */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!Component ? (
          /*
           * The registry test makes this unreachable in a built tree. It is
           * here because the alternative to an honest message is a blank
           * panel that looks like a slow load forever.
           */
          <div className="p-6">
            <p className="text-sm text-rose-300">
              There is no screen registered at <code className="text-rose-200">{module.route}</code>.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              The capability list and the route map have come apart. Worth reporting.
            </p>
          </div>
        ) : (
          <PanelErrorBoundary name={module.label}>
            <Suspense
              fallback={
                <div className="flex items-center gap-3 p-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                  Loading {module.label}…
                </div>
              }
            >
              {/*
                `onNavigate` is passed through so links inside the module
                still work. They leave Phoenix, which is right: a module
                deep-linking into another module inside a side panel is how
                somebody ends up lost with no back button.
              */}
              <Component onNavigate={onNavigate} />
            </Suspense>
          </PanelErrorBoundary>
        )}
      </div>
    </div>
  );
}
