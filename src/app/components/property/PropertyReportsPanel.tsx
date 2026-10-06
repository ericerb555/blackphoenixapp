/**
 * PropertyReportsPanel — the three generated reports, per property.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The reports, their gates and their documents were all built server-side, and
 * until now the only way to reach one was to type a URL. A product nobody can
 * see is a product nobody buys, and more to the point the *refusals* were
 * invisible: the gate works out that a landlord is one completed inspection
 * away from two reports, and that was being computed and thrown away.
 *
 * WHAT IT SHOWS, AND WHY THE REFUSALS ARE THE POINT
 *
 * `GET /property-reports/:propertyId` returns all three with `available`, a
 * `blocker` and the full requirement list. Most properties will not qualify for
 * most of them for a while — so this panel is mostly a list of near misses, and
 * it is written to read as "here is what would unlock this" rather than "no".
 * A gate that only refuses loses the customer who was one step away.
 *
 * It does not sell anything yet. Nothing charges for a report — there is no
 * Stripe product and no purchase — so an available report opens its document
 * directly. When billing arrives this is where the price goes, which is why the
 * price is already displayed.
 */
import { useEffect, useState } from 'react';
import { FileText, Check, Lock, LoaderCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

interface Requirement { met: boolean; need: string; have: string }
interface ReportOffer {
  id: string;
  title: string;
  priceCents: number;
  blurb: string;
  available: boolean;
  blocker: string | null;
  requirements: Requirement[];
  basis?: { caveat?: string } | null;
}

const money = (cents: number) => `$${Math.round(cents / 100)}`;

export function PropertyReportsPanel({ propertyId }: { propertyId: string }) {
  const [reports, setReports] = useState<ReportOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { if (live) setError('Sign in to see what is available for this property.'); return; }
        if (live) setToken(session.access_token);
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/property-reports/${encodeURIComponent(propertyId)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const json = await res.json();
        if (!live) return;
        if (!res.ok || !json?.success) { setError(json?.error || 'Could not read what is available.'); return; }
        setReports(Array.isArray(json.reports) ? json.reports : []);
      } catch {
        if (live) setError('Could not reach the server.');
      }
    })();
    return () => { live = false; };
  }, [propertyId]);

  if (error) {
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#101010] p-4">
        <p className="flex items-center gap-2 text-sm text-gray-400"><AlertCircle className="h-4 w-4" /> {error}</p>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#101010] p-4">
        <p className="flex items-center gap-2 text-sm text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking what this property has on record…</p>
      </div>
    );
  }

  const ready = reports.filter((r) => r.available).length;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#101010] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <FileText className="h-4 w-4 text-teal-300" /> Reports for this property
        </p>
        <span className="text-xs text-gray-500">
          {ready === 0
            ? 'none available yet'
            : `${ready} of ${reports.length} available`}
        </span>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Each one is built from this property&rsquo;s own records. Where a report is not
        available it is because something it needs has not been recorded yet — the
        requirement is shown, so you can see what would unlock it.
      </p>

      <div className="mt-3 space-y-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`rounded-lg border p-3 ${report.available ? 'border-teal-500/30 bg-teal-500/5' : 'border-[#2A2A2A] bg-[#151515]'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  {report.available
                    ? <Check className="h-4 w-4 flex-shrink-0 text-teal-400" />
                    : <Lock className="h-4 w-4 flex-shrink-0 text-gray-500" />}
                  {report.title}
                  <span className="text-xs font-normal text-gray-500">{money(report.priceCents)}</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">{report.blurb}</p>
              </div>
              {report.available && token && (
                <a
                  href={`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/property-reports/${encodeURIComponent(propertyId)}/${report.id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-500"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
              )}
            </div>

            {/*
              The requirements, not just the refusal. Each line says what is
              needed and what exists, which is what turns "locked" into a thing
              somebody can act on.
            */}
            {!report.available && (
              <div className="mt-2.5 space-y-1 border-t border-[#2A2A2A] pt-2.5">
                {report.requirements.map((req, i) => (
                  <p key={i} className="flex items-start gap-2 text-xs">
                    {req.met
                      ? <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-teal-500" />
                      : <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />}
                    <span className={req.met ? 'text-gray-500' : 'text-gray-300'}>
                      {req.need}
                      <span className="text-gray-600"> — {req.have}</span>
                    </span>
                  </p>
                ))}
              </div>
            )}

            {/*
              Said before anybody pays, not discovered inside the document: the
              capital plan estimates remaining life from the building's age
              wherever an inspection has not looked.
            */}
            {report.available && report.basis?.caveat && (
              <p className="mt-2 border-t border-teal-500/20 pt-2 text-xs text-gray-500">{report.basis.caveat}</p>
            )}
          </div>
        ))}
      </div>

      {/*
        Honest about where this stands. Nothing charges for a report yet, and a
        panel that showed a price beside an Open button without saying so would
        read as a thing somebody had already bought.
      */}
      <p className="mt-3 text-xs text-gray-600">
        Prices are set but not yet chargeable — an available report opens straight
        away while billing is being wired up.
      </p>
    </div>
  );
}

export default PropertyReportsPanel;
