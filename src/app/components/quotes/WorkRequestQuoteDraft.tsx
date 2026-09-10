/**
 * A draft quote, made the first time somebody opens a work request.
 *
 * WHY ON OPEN RATHER THAN ON SUBMIT
 *
 * Generating when a customer submitted spent a full gpt-4o takeoff on every
 * request that arrived — duplicates, tyre-kickers and all — and wrote the result
 * to a key nothing read, so the draft supposedly waiting for staff was never
 * visible to anybody. Generating when somebody actually looks costs the same for
 * the quotes that matter and nothing for the ones nobody opens.
 *
 * WHY OPENING TWICE IS FREE
 *
 * The server stores the draft under `quote_draft:{id}` and returns it unchanged
 * on every later open. It says which happened — `spent: true` the first time,
 * `spent: false` afterwards — and this component shows that, because a screen
 * that quietly re-generates is how a bill appears without anybody deciding
 * anything. React mounting this twice costs one cached read.
 *
 * WHAT IT IS NOT
 *
 * Not a quote. It is a starting point with the company's real material prices
 * and labour rates where they are known, and clearly-labelled estimates where
 * they are not. Sending it is a separate decision made on the quote screen.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props {
  workRequestId: string;
}

interface Draft {
  quote?: {
    total?: number;
    materialItems?: any[];
    laborItems?: any[];
  };
  confidence?: string;
  generatedAt?: string;
  spent?: boolean;
  cached?: boolean;
  priceSummary?: any;
}

const money = (n: unknown) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WorkRequestQuoteDraft({ workRequestId }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${API}/quote-draft/${encodeURIComponent(workRequestId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data?.session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.success) {
        setError(res.status === 403
          ? 'Drafting a quote is company staff only.'
          : (json.error || 'Could not draft a quote for this request.'));
        return;
      }
      setDraft(json);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [workRequestId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] p-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Drafting a quote from this request…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-[#141414] p-4">
        <p className="flex items-start gap-2 text-sm text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
        <button
          onClick={() => load(false)}
          className="mt-3 rounded-lg bg-[#2A2A2A] px-3 py-1.5 text-xs text-white transition hover:bg-[#3A3A3A]"
        >
          Try again
        </button>
      </div>
    );
  }

  const q = draft?.quote || {};
  const materials = q.materialItems?.length || 0;
  const labour = q.laborItems?.length || 0;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-[#ea580c]" />
            Draft quote
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {materials} material line{materials === 1 ? '' : 's'} · {labour} labour task{labour === 1 ? '' : 's'}
            {draft?.confidence ? ` · ${draft.confidence} confidence` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-white">{money(q.total)}</p>
          {/* Said out loud, because a screen that silently re-generates is how a
              bill appears without anybody deciding anything. */}
          <p className="text-[11px] text-gray-500">
            {draft?.spent ? 'generated just now' : 'from the saved draft — no new cost'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#2A2A2A] pt-3">
        <p className="text-[11px] text-gray-500">
          A starting point, not a quote — real prices where we have them, labelled estimates where we do not.
        </p>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-2.5 py-1 text-[11px] text-gray-400 transition hover:border-[#ea580c]/40 hover:text-white"
          title="Costs another model call. Use it when the request itself has changed."
        >
          <RefreshCw className="h-3 w-3" /> Redraft
        </button>
      </div>
    </div>
  );
}
