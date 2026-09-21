/**
 * "Design Your Project" — the customer's way into the design centre.
 *
 * WHY THIS PANEL EXISTS RATHER THAN THE TAB JUST NAVIGATING
 *
 * The design centre is a working tool. It opens on an empty canvas and expects
 * dimensions, spans and a code edition, which is a cold start for somebody who
 * has only ever described what they want over the phone. Dropping a homeowner
 * straight into it is how a good tool gets a reputation for being difficult.
 *
 * So the tab lands here first: the walkthrough that starts a project, and the
 * designs they already have.
 *
 * THE WALKTHROUGH DOES THE WORK NOW
 *
 * This used to be a card explaining the design centre and a button that opened
 * it. That was still a cold start with a paragraph in front of it — everything
 * a homeowner wants to do first lived inside the tool, at stages and in panels
 * they had no reason to find. `DesignWalkthrough` asks the four questions and
 * writes the answers into a design project; the explanatory card is gone
 * because the walkthrough explains itself by asking.
 *
 * What stayed is the list below it. Somebody returning to this tab is usually
 * coming back to something they already started, and that is what it shows.
 *
 * WHY THE "SEND" ACTION IS HERE AND NOT IN THE DESIGNER
 *
 * Because a design that nobody at the company ever sees is a wasted evening.
 * Until now the design centre saved a design and produced nothing else — fine
 * while only staff were in there, since staff do the next step by hand. A
 * customer has no next step, so this is it: their design becomes a work request
 * and lands in the pipeline with everything else.
 *
 * It posts to the same `/work-requests` route the enquiry form uses rather than
 * a private one. One way in means one place where a job starts, and the
 * ownership check, the staff alert and the admin notification all come free
 * because they already guard that route.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';
import { authedHeaders } from '../../utils/authHeaders';
import DesignWalkthrough, { type ResumableIntake } from './DesignWalkthrough';
import { ownerKeyForCurrentUser } from '../../lib/designProjectService';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface DesignSummary {
  id: string;
  name: string;
  version?: number;
  floorCount?: number;
  elementCount?: number;
  updatedAt?: string;
  meta?: {
    kind?: string | null;
    site?: { projectName?: string; address?: string; town?: string; state?: string } | null;
    /** Present when the project was started by the portal walkthrough. */
    intake?: { kindId?: string; done?: boolean } | null;
  } | null;
}

export default function CustomerDesignTab({
  customerEmail,
  customerName,
  customerAddress,
}: {
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
}) {
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Design ids that already have a work request against them. */
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  /**
   * Their designs, and which of them have already been sent.
   *
   * "Already sent" is worked out by reading their own work requests and looking
   * for the design id, rather than by writing a flag onto the design. A flag
   * would be a second copy of the truth, and the one that drifts is always the
   * copy — if the office deletes a request, this should stop claiming it was
   * sent.
   */
  const load = useCallback(async () => {
    try {
      const headers = await authedHeaders();
      /**
       * The owner key is not optional, though this asked as though it were.
       *
       * The server reads `?owner=` and hands it to `permittedOwnerKey`, which
       * defaults a missing one to `shared` — a staff namespace. A customer is
       * refused it, the handler answers with an empty list rather than an
       * error, and the panel below says "Nothing saved yet" in a reassuring
       * tone. So this list has never shown a customer a single one of their own
       * designs, however many they had, and it looked like working software
       * the whole time.
       *
       * The deck designer has always passed it. This is the same call.
       */
      const owner = await ownerKeyForCurrentUser();
      const [designRes, wrRes] = await Promise.all([
        fetch(`${SERVER}/design-projects?owner=${encodeURIComponent(owner)}`, { headers }),
        fetch(`${SERVER}/work-requests`, { headers }),
      ]);
      if (!designRes.ok) throw new Error(`The design service responded ${designRes.status}`);
      const designJson = await designRes.json();
      const wrJson = wrRes.ok ? await wrRes.json().catch(() => []) : [];

      setDesigns(Array.isArray(designJson?.projects) ? designJson.projects : []);
      const already = new Set<string>();
      for (const wr of Array.isArray(wrJson) ? wrJson : []) {
        const id = String(wr?.designProjectId || wr?.design_project_id || '');
        if (id) already.add(id);
      }
      setSent(already);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load your designs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, customerEmail]);

  /**
   * A walkthrough they began and never finished, if there is one.
   *
   * The most recent only. Offering a list of abandoned attempts would be a
   * nag; offering the last one is a courtesy. Projects are returned newest
   * first, so the first match is the right one.
   */
  const resumable: ResumableIntake | null = (() => {
    const found = designs.find(d => d.meta?.intake && d.meta.intake.done !== true);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name || 'Untitled',
      kindId: String(found.meta?.intake?.kindId || ''),
    };
  })();

  /**
   * Open the design centre.
   *
   * `from=portal` tells it a customer is driving, which trims the workspace rail
   * down to the design tools — permits, variances and the document scanner are
   * office workflow and are one click away otherwise. The address rides along so
   * the design starts at their house: it decides snow load, frost depth and
   * which code edition applies, so it is not a convenience.
   */
  const openDesigner = (designId?: string) => {
    const params = new URLSearchParams({ from: 'portal' });
    if (designId) params.set('projectId', designId);
    if (customerAddress) params.set('address', customerAddress);
    if (customerEmail) params.set('email', customerEmail);
    const route = `deck-designer?${params.toString()}`;
    const nav = (window as any).__navigateApp;
    if (typeof nav === 'function') nav(route);
    else window.location.assign(`/${route}`);
  };

  async function send(design: DesignSummary) {
    setSending(design.id);
    try {
      const site = design.meta?.site || null;
      const address = [site?.address, site?.town, site?.state].filter(Boolean).join(', ')
        || customerAddress || '';
      const res = await fetch(`${SERVER}/work-requests`, {
        method: 'POST',
        headers: { ...(await authedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The reference back to the design. Everything else on the request is
          // a description; this is the part that lets the office open the real
          // thing rather than work from a summary of it.
          designProjectId: design.id,
          designVersion: design.version || 1,
          serviceType: design.meta?.kind || 'design',
          project_name: design.name || 'Design centre project',
          title: design.name || 'Design centre project',
          description:
            `Designed in the customer design centre.\n\n`
            + `Design: ${design.name || 'Untitled'} (version ${design.version || 1})\n`
            + (address ? `Address: ${address}\n` : '')
            + `Reference: ${design.id}\n\n`
            + `This is the customer's own layout. It has not been checked for spans, `
            + `loads or code, and it carries no price.`,
          propertyAddress: address,
          client_info: { name: customerName || '', email: customerEmail || '' },
          source: 'customer-design-centre',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `The server responded ${res.status}`);
      setSent(prev => new Set(prev).add(design.id));
      toast.success('Sent. Someone will look at it and come back to you.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send this design.');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <DesignWalkthrough
        customerEmail={customerEmail}
        customerName={customerName}
        customerAddress={customerAddress}
        resumable={resumable}
        onChanged={load}
      />

      <div>
        <h4 className="mb-3 font-bold text-white">Your designs</h4>

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#111] p-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your designs…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">{error}</div>
        ) : designs.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-6 text-center">
            <p className="text-sm text-gray-400">
              Nothing saved yet. Open the design centre and whatever you save will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {designs.map(design => {
              const site = design.meta?.site || null;
              const where = [site?.address, site?.town].filter(Boolean).join(', ');
              const isSent = sent.has(design.id);
              return (
                <div key={design.id} className="rounded-xl border border-[#2A2A2A] bg-[#111] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{design.name || 'Untitled design'}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {where && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {where}
                          </span>
                        )}
                        {design.updatedAt && (
                          <span>Last changed {new Date(design.updatedAt).toLocaleDateString()}</span>
                        )}
                        {design.elementCount ? <span>{design.elementCount} pieces</span> : null}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openDesigner(design.id)}
                        className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-orange-500/40 hover:text-white"
                      >
                        Open
                      </button>

                      {/* Sending again would raise a second job for the same
                          design, so once it has gone the button says so instead
                          of offering to do it twice. */}
                      {isSent ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sent to us
                        </span>
                      ) : (
                        <button
                          onClick={() => send(design)}
                          disabled={sending === design.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                        >
                          {sending === design.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                            : <><Send className="h-3.5 w-3.5" /> Send to Black Phoenix</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
