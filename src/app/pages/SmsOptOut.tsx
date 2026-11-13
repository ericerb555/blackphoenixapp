/**
 * The page somebody lands on when they want the texts to stop.
 *
 * WHY IT IS PUBLIC AND PLAIN
 *
 * Anyone reaching for it has already decided. The only thing it owes them is
 * to work on the first try, so there is no account, no sign-in, no "are you
 * sure", and nothing that could be mistaken for an attempt to talk them out
 * of it. A page that argues is the one people complain about instead of using.
 *
 * REPLYING STOP IS STILL THE BETTER ROUTE and the page says so first, because
 * the carrier sees that one and acts on it at the network — this page only
 * tells our own system. Somebody who still has one of our texts should use
 * the reply; this is for the person who deleted it.
 *
 * It can only ever REVOKE. The route behind it cannot grant consent at all —
 * see `smsConsentRoutes.ts` — so a stranger typing somebody else's number
 * achieves an unsubscribe the owner undoes with one reply, rather than a
 * subscription they never asked for.
 */
import { useState } from 'react';
import { MessageSquareOff, Check, LoaderCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/apiConfig';
import { publicAnonKey } from '../utils/supabase/info';

export default function SmsOptOut() {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setMessage('Enter the mobile number you want texts stopped to.'); return; }
    setState('sending');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/sms/opt-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
          apikey: publicAnonKey,
        },
        body: JSON.stringify({ phone }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setState('idle');
        setMessage(payload?.error || 'That did not go through. Please try again, or reply STOP to any of our texts.');
        return;
      }
      setState('done');
      setMessage(payload.message || 'That number has been unsubscribed.');
    } catch {
      setState('idle');
      /**
       * The fallback is the better channel anyway, so a network failure here
       * is told in terms of the thing that does not depend on this page.
       */
      setMessage('We could not reach the server. Reply STOP to any text from us and that will work regardless.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-5 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A1A1A]">
            <MessageSquareOff className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Stop text messages</h1>
            <p className="text-xs text-gray-500">The Black Phoenix Company</p>
          </div>
        </div>

        {/* Said first, because it is the route that works at the carrier. */}
        <p className="mb-6 rounded-xl border border-[#2A2A2A] bg-[#111] p-4 text-sm leading-relaxed text-gray-400">
          If you still have a text from us, replying <span className="font-bold text-white">STOP</span> to
          it is the quickest way and works immediately. Use this page if you have deleted it.
        </p>

        {state === 'done' ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-green-400">
              <Check className="h-4 w-4" /> Unsubscribed
            </p>
            <p className="mt-2 text-sm text-green-200/90">{message}</p>
            <p className="mt-3 text-xs text-gray-500">
              You may still receive messages about something you have specifically
              asked for, such as a one-time security code you request yourself.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-400" htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(603) 555-0100"
              className="w-full rounded-xl border border-[#2A2A2A] bg-[#111] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
            />
            {message && <p className="text-sm text-amber-400">{message}</p>}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {state === 'sending'
                ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Stopping…</>
                : 'Stop texts to this number'}
            </button>
            <p className="pt-1 text-xs leading-relaxed text-gray-600">
              This stops marketing and account texts to the number you enter. It does
              not close your account or stop email.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
