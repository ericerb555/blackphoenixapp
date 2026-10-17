/**
 * Refund & Returns Policy — public, standalone, and per company.
 *
 * WHY THIS PAGE EXISTS AND WHY ITS URL MATTERS
 *
 * Stripe's dispute evidence asks for the refund policy and for the URL where
 * the customer saw it. There was no such page and no such URL, so that field
 * went unanswered — and an unanswerable evidence field is a dispute you have
 * chosen to lose. See `tasks/chargeback-defence.md`.
 *
 * The URL is therefore the product here, as much as the words are. It is stable,
 * it needs no login, and it carries the company: each company is its own
 * standalone Stripe account, a dispute lands on one of them, and the policy that
 * answers it is that company's.
 *
 * IT SAYS WHEN THERE IS NO POLICY, RATHER THAN INVENTING ONE
 *
 * The content comes from `refund_policy:{companyId}`, written by a person and
 * published as a deliberate second act. Nothing here drafts legal text and
 * nothing is seeded: a term this business is bound by, written by software and
 * published unread, is a worse outcome than a page that admits the gap. So when
 * nothing is published the page says exactly that, which is true and visible.
 *
 * Sibling of `TermsOfService` and `PrivacyPolicy`, and deliberately the same
 * shape as them.
 */
import { useCallback, useEffect, useState } from 'react';
import { Receipt, Home, AlertCircle, Loader2, Mail } from 'lucide-react';
import { publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/**
 * Whose policy this page shows when the URL does not say.
 *
 * `?company=` overrides it, which is how a second company's policy is reached
 * on the same deployment. Not a fallback to "some policy" — it names one
 * company on purpose, and an unknown id shows the no-policy state rather than
 * somebody else's terms.
 */
const DEFAULT_COMPANY = 'bpb-8544';

interface Section { heading: string; body: string }

interface Published {
  version: number;
  effectiveFrom: string;
  sections: Section[];
  contactEmail: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function RefundPolicy({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [policy, setPolicy] = useState<Published | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const companyId = (() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('company');
      return (fromUrl || DEFAULT_COMPANY).toLowerCase();
    } catch {
      return DEFAULT_COMPANY;
    }
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`${SERVER}/refund-policy/${encodeURIComponent(companyId)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setFailed(true);
        setPolicy(null);
        return;
      }
      setPolicy(body.policy || null);
      setCompanyName(body.companyName || null);
    } catch {
      setFailed(true);
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const company = companyName || 'This company';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Refund &amp; Returns Policy</h1>
            {policy && (
              <p className="text-sm text-gray-400">
                In effect since {formatDate(policy.effectiveFrom) || 'its publication'}
                {' · '}version {policy.version}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-8 text-[15px] leading-relaxed text-gray-300">
          {loading && (
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading the policy…
            </div>
          )}

          {/*
            Three distinct states, deliberately not collapsed into one.

            "We could not load it" is not "there is no policy", and neither is
            "that is not a company we know". A page that said "no refund policy"
            because a fetch failed would be making a statement about this
            business's terms on the strength of a network error.
          */}
          {!loading && failed && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold">We could not load the policy just now</p>
                  <p className="text-gray-400 mt-1">
                    This is a problem at our end, not a statement that no policy exists.
                    Please try again, or write to us and we will send it to you.
                  </p>
                  <button
                    onClick={load}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-200 text-sm font-semibold hover:border-orange-500/50"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !failed && !policy && (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-5">
              <p className="text-white font-semibold">No policy is published yet.</p>
              <p className="text-gray-400 mt-2">
                {company} has not published a standing refund and returns policy at this
                address. Refunds, cancellations and deposits are handled according to the
                terms of your specific order, invoice or service agreement — the document
                you signed or approved.
              </p>
              <p className="text-gray-400 mt-2">
                If you want that in writing for your own records, ask us and we will send
                the terms that applied to your order.
              </p>
            </div>
          )}

          {!loading && policy?.sections?.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h2 className="text-lg font-semibold text-white mb-2">{section.heading}</h2>
              {/* whitespace-pre-line so a person writing paragraphs in a textarea
                  gets paragraphs, without this page interpreting markup. */}
              <p className="whitespace-pre-line">{section.body}</p>
            </section>
          ))}

          {!loading && policy?.contactEmail && (
            <section className="pt-2">
              <h2 className="text-lg font-semibold text-white mb-2">How to reach us</h2>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#ea580c] flex-shrink-0" />
                <a className="text-[#ea580c] hover:underline" href={`mailto:${policy.contactEmail}`}>
                  {policy.contactEmail}
                </a>
              </p>
            </section>
          )}
        </div>

        <button
          onClick={() => (onNavigate ? onNavigate('home') : (window.location.href = '/'))}
          className="mt-10 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
}
