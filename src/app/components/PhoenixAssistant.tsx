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
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import PhoenixConsole from './PhoenixConsole';

export default function PhoenixAssistant() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask Phoenix"
        aria-label="Open the Phoenix assistant"
        className="group fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/30 bg-[#0A0A0A] shadow-lg shadow-black/60 transition hover:scale-105 hover:border-orange-500/70 hover:shadow-orange-900/40"
      >
        {/*
          The company's own mark, not a generic chat bubble. It is the
          button, so it carries an aria-label — an image alone tells a
          screen reader nothing about what pressing it does.
        */}
        <img
          src={phoenixLogo}
          alt=""
          className="h-11 w-11 object-contain transition group-hover:brightness-110"
        />
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#101010]">
              <img src={phoenixLogo} alt="" className="h-7 w-7 object-contain" />
            </div>
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
          <PhoenixConsole autoFocus onQueueCount={setPending} />
        </div>
      </div>
    </div>
  );
}
