/**
 * The assistant, as a panel you can open from anywhere on the page.
 *
 * WHY A SLIDE-OVER AND NOT A TAB
 *
 * Because the questions it answers are the ones you have while looking at
 * something else — "is that quote out yet", "what is owed". A tab means
 * leaving the screen you are on to ask about it, which is the friction that
 * stops people using an assistant at all.
 *
 * The conversation itself lives in PhoenixConsole, shared with the Phoenix
 * page off the Owner's Control Center. This file is only the chrome: the
 * launcher, the backdrop, and the badge.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import PhoenixMark from './PhoenixMark';
import PhoenixConsole from './PhoenixConsole';

interface PhoenixAssistantProps {
  /**
   * Supplied by pages that have it. Without it the panel falls back to a
   * location change, which still works — it is just a reload.
   */
  onNavigate?: (page: string) => void;
}

export default function PhoenixAssistant({ onNavigate }: PhoenixAssistantProps = {}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  /**
   * The panel has no workspace to put a module in, so "show me X" leaves for
   * X's own page. The alternative — a chip that does nothing here but works
   * on the Phoenix page — is worse than a navigation.
   */
  const goTo = (route: string) => {
    setOpen(false);
    if (onNavigate) onNavigate(route);
    else window.location.href = `/${route}`;
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask Phoenix"
        aria-label="Open the Phoenix assistant"
        className="group fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        {/*
          The company's own mark, not a generic chat bubble. It is the
          button, so it carries an aria-label — an image alone tells a
          screen reader nothing about what pressing it does.
        */}
        <PhoenixMark className="h-12 w-12" />
        {/* A quiet pulse when something is waiting on a decision. */}
        {pending > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white ring-2 ring-[#0A0A0A]">
            {pending}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <div className="flex items-center gap-3">
            <PhoenixMark className="h-8 w-8" />
            <div>
              <p className="text-sm font-semibold text-white">Phoenix</p>
              <p className="text-[11px] text-gray-500">Reads your operations. Proposes; you approve.</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-[#1A1A1A] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <PhoenixConsole
            autoFocus
            onQueueCount={setPending}
            onOpenModule={(d) => goTo(d.route)}
          />
        </div>
      </div>
    </div>
  );
}
