/**
 * The page a customer opens when we have found something.
 *
 * WHAT IT IS FOR
 *
 * Clause 9 of the contract commits the company, in writing, to stopping work,
 * showing the customer what was uncovered, and waiting for their approval before
 * continuing. This is where that happens. Everything about it follows from one
 * idea: the person reading it did not expect this bill, so the page has to earn
 * the decision rather than extract it.
 *
 * WHICH IS WHY DECLINE IS A REAL BUTTON
 *
 * Not a small grey link under a large orange one. A change order they cannot
 * comfortably say no to is a change order they will dispute later, and a
 * declined item is a perfectly good outcome — the work simply stops there and
 * the scope shrinks.
 *
 * NO ACCOUNT, BY DESIGN
 *
 * The link is the credential: 256 bits, stored as a hash, expiring, revocable,
 * and refusing a second decision. Asking somebody to register before they can
 * answer a question about their own house is how a link goes unanswered.
 */
import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle, XCircle, Loader2, Camera, FileText, ShieldCheck,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function ChangeOrderApproval() {
  const [token, setToken] = useState('');
  const [co, setCo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approved' | 'declined' | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) { setError('This link is missing its code. Use the link from the email exactly as it was sent.'); setLoading(false); return; }
    void (async () => {
      try {
        // The anon key identifies the project; the token in the URL is what
        // actually authorises this. The reader has no account.
        const res = await fetch(`${SERVER}/change-orders/by-token/${encodeURIComponent(t)}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) { setError(json?.error || 'This link is invalid or has expired.'); return; }
        setCo(json.changeOrder);
        setSignerName(json.changeOrder?.customerName || '');
        if (['approved', 'declined'].includes(String(json.changeOrder?.status || ''))) {
          setOutcome(json.changeOrder.status);
        }
      } catch {
        setError('We could not load this. Check your connection and try the link again.');
      } finally { setLoading(false); }
    })();
  }, []);

  const decide = async (decision: 'approved' | 'declined') => {
    if (!signerName.trim()) { setError('Please put your name in before you decide.'); return; }
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/change-orders/by-token/${encodeURIComponent(token)}/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, signerName: signerName.trim(), note: note.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        // 409 means it was already answered — shown as the answer, not an error.
        if (res.status === 409 && json?.status) { setOutcome(json.status); return; }
        setError(json?.error || 'We could not record that. Please call us.');
        return;
      }
      setOutcome(decision);
    } catch {
      setError('We could not record that. Please call us and we will sort it out.');
    } finally { setBusy(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </p>
      </div>
    );
  }

  if (error && !co) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h1 className="text-xl font-bold text-white">We can't open this</h1>
          <p className="mt-2 text-gray-400">{error}</p>
          <p className="mt-4 text-sm text-gray-500">
            Give us a call and we will send a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const cost = Number(co?.estimatedCost || 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#ea580c]">
            {co?.coNumber} · {co?.projectName}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            We found something that wasn't in the original quote
          </h1>
          {/* The promise from clause 9, restated as the first thing they read —
              because the reassurance is what makes the rest readable. */}
          <p className="mt-3 flex items-start gap-2 text-gray-400">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ea580c]" />
            We have stopped work on this part of the job. Nothing is charged and nothing
            continues here until you decide.
          </p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <FileText className="h-5 w-5 text-[#ea580c]" /> {co?.title || 'What we found'}
          </h2>
          {co?.description && (
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-gray-300">{co.description}</p>
          )}

          <div className="mt-5 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-5">
            <p className="text-sm text-gray-400">Additional cost</p>
            <p className="text-3xl font-bold text-white">${cost.toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500">
              Added to your contract only if you approve it.
            </p>
          </div>
        </div>

        {/* The evidence. A number on its own asks to be argued with; a
            photograph of the rot is the whole case. */}
        {Array.isArray(co?.photos) && co.photos.length > 0 && (
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <Camera className="h-5 w-5 text-[#ea580c]" /> What it looks like
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {co.photos.map((p: any, i: number) => (
                <figure key={i} className="overflow-hidden rounded-xl border border-[#2A2A2A]">
                  {p.url
                    ? <img src={p.url} alt={p.caption || `Photo ${i + 1}`} className="w-full object-cover" loading="lazy" />
                    : <div className="flex h-40 items-center justify-center text-gray-600">Photo unavailable</div>}
                  {p.caption && (
                    <figcaption className="bg-[#0A0A0A] px-3 py-2 text-sm text-gray-400">{p.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {outcome ? (
          <div className={`rounded-2xl border-2 p-8 text-center ${
            outcome === 'approved' ? 'border-green-500/40 bg-green-500/10' : 'border-gray-600 bg-[#1A1A1A]'
          }`}>
            {outcome === 'approved'
              ? <CheckCircle className="mx-auto mb-3 h-14 w-14 text-green-400" />
              : <XCircle className="mx-auto mb-3 h-14 w-14 text-gray-400" />}
            <h2 className="text-2xl font-bold text-white">
              {outcome === 'approved' ? 'Approved — thank you' : 'Declined'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-400">
              {outcome === 'approved'
                ? 'We will pick this up and carry on. It has been added to your contract and it will appear on your next invoice.'
                : 'We will leave this as it is and carry on with the rest of the job. If you change your mind, give us a call.'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <h2 className="text-lg font-bold text-white">Your decision</h2>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm text-gray-400">Your name</span>
              <input
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white"
                value={signerName} onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full name"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm text-gray-400">Anything you want to say (optional)</span>
              <textarea
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-white"
                rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="A question, or a condition on your approval"
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {/* Two real buttons. Declining is an ordinary outcome — the work
                stops there and the scope shrinks — and a decision somebody
                cannot comfortably refuse is one they dispute later. */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => decide('approved')} disabled={busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-500 disabled:opacity-50"
              >
                {busy === 'approved' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                Approve ${cost.toLocaleString()}
              </button>
              <button
                onClick={() => decide('declined')} disabled={busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-6 py-4 text-lg font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
              >
                {busy === 'declined' ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                Don't do this work
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Typing your name and choosing above is your written instruction under clause 9 of
              your contract. You can only answer once — call us if something needs changing
              afterwards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
