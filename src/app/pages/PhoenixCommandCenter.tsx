/**
 * Phoenix — its own screen, reached from the Owner's Control Center.
 *
 * WHY A PAGE AND NOT ONLY THE SLIDE-OVER
 *
 * The panel is for the question you have while looking at something else.
 * This is for the other half: sitting down with it. That needs width the
 * panel does not have, and it is the frame the workspace grows into —
 * tables, charts and live module views around the mark in the corner.
 *
 * Today it is the same conversation at full size. The chrome is here so the
 * rest has somewhere to land without moving the conversation again.
 */
import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import PhoenixConsole from '../components/PhoenixConsole';

interface PhoenixCommandCenterProps {
  onNavigate?: (page: string) => void;
}

export default function PhoenixCommandCenter({ onNavigate }: PhoenixCommandCenterProps) {
  const [pending, setPending] = useState(0);

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
            <img src={phoenixLogo} alt="" className="h-14 w-14 object-contain" />
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

      {/* The conversation, at full height. min-h-0 so the transcript scrolls
          inside the page instead of pushing the composer off the bottom. */}
      <div className="min-h-0 flex-1">
        <PhoenixConsole centered autoFocus onQueueCount={setPending} />
      </div>
    </div>
  );
}
