/**
 * Phoenix — its own screen, reached from the Owner's Control Center.
 *
 * WHY A PAGE AND NOT ONLY THE SLIDE-OVER
 *
 * The panel is for the question you have while looking at something else.
 * This is for the other half: sitting down with it. That needs width the
 * panel does not have, because the conversation shares the screen with
 * whatever Phoenix has been asked to show.
 *
 * Ask to see something and the real module mounts on the right, live, with
 * the transcript still on the left explaining it. See PhoenixWorkspace for
 * why that is the same component the route would render and not a copy.
 */
import { useState } from 'react';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import PhoenixMark from '../components/PhoenixMark';
import PhoenixConsole from '../components/PhoenixConsole';
import PhoenixWorkspace from '../components/PhoenixWorkspace';
import type { OpenDirective } from '../lib/aiActivity';

interface PhoenixCommandCenterProps {
  onNavigate?: (page: string) => void;
}

export default function PhoenixCommandCenter({ onNavigate }: PhoenixCommandCenterProps) {
  const [pending, setPending] = useState(0);
  /** The module on screen beside the conversation, if Phoenix opened one. */
  const [module, setModule] = useState<OpenDirective | null>(null);
  const [expanded, setExpanded] = useState(false);

  const back = () => {
    if (onNavigate) onNavigate('owners-dashboard');
    else window.location.href = '/owners-dashboard';
  };

  return (
    <div className="flex h-screen flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#ea580c]/30 bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] shadow-xl shadow-[#ea580c]/5">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={back}
              className="rounded-lg p-2 transition-colors hover:bg-[#2A2A2A]"
              title="Back to Owner's Control Center"
              aria-label="Back to Owner's Control Center"
            >
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
            {/*
              The mark at the size the brand uses it, not shrunk into an
              icon slot. On this screen it is the subject, not a label.
            */}
            <PhoenixMark className="h-14 w-14" pad="p-2" round={false} />
            <div>
              <h1 className="text-3xl font-bold text-white">Phoenix</h1>
              <p className="mt-0.5 text-gray-400">
                Reads your operations. Proposes; you approve.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pending > 0 && (
              <span className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-sm font-semibold text-orange-300">
                {pending} waiting on you
              </span>
            )}
            {/*
              The particle prototype. Here rather than in the owner's header
              because it is a thing to go and look at deliberately, not a
              second door to the assistant.
            */}
            <button
              onClick={() => onNavigate?.('phoenix-prototype')}
              className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:border-orange-500/80 hover:text-orange-200"
              title="Preview the particle Phoenix"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Particle preview
            </button>
            {/*
              Said on the screen rather than in a tooltip, because the whole
              reason this is safe to leave open is that it cannot act alone.
            */}
            <span className="hidden items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#101010] px-3 py-1.5 text-xs text-gray-400 lg:flex">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Read-only until you approve
            </span>
          </div>
        </div>
      </div>

      {/*
        Conversation and workspace side by side. min-h-0 on both so each
        scrolls inside itself rather than pushing the composer off the page.

        The conversation is never unmounted when a module opens — collapsing
        it to zero width would drop the transcript, and the answer that
        explains what you are looking at is in that transcript.
      */}
      <div className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 ${
            !module ? 'flex-1' : expanded ? 'hidden' : 'hidden w-[30rem] shrink-0 lg:block'
          }`}
        >
          <PhoenixConsole
            centered={!module}
            autoFocus
            onQueueCount={setPending}
            onOpenModule={(d) => { setModule(d); setExpanded(false); }}
          />
        </div>

        {module && (
          <div className="min-h-0 flex-1">
            <PhoenixWorkspace
              module={module}
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => { setModule(null); setExpanded(false); }}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
