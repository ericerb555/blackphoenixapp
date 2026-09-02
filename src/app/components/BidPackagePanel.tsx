/**
 * The scope goes out to bid, one package per trade.
 *
 * WHAT THIS IS FOR
 *
 * A subcontractor is being asked to put a number on work he has not seen.
 * Everything he cannot determine he prices as a risk, and the number he picks
 * for a risk is always bigger than the truth. So a vague package does not get
 * refused — it gets accepted, and we quietly pay for the vagueness.
 *
 * This builds his package out of the scope itself: his lines, his quantities,
 * in build order, with the inspections that constrain him named.
 *
 * WHERE IT STOPS
 *
 * It creates the request as a **draft** in the bid room that already exists,
 * and then gets out of the way. Opening it, inviting providers, sealed bids
 * and awarding are the bid room's job and it does them properly — building a
 * second one here would be two systems disagreeing about who was invited to
 * what. The screen says where the package went so that is not a mystery.
 *
 * WHAT NEVER LEAVES
 *
 * Our money. `PackageLine` has no price field, and no budget is written onto
 * the request — a budget shown to a bidder is a floor he bids just under.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Send, Loader2, AlertTriangle, CheckCircle2, PackageOpen, Clock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import {
  type BidPackage,
  packagesFor, packageGaps, packageNote, packageTitle, sequencingNote,
  tradeLabel, isSendable,
} from '../lib/bidPackageModel';
import { phaseOf } from '../lib/scopeModel';
import { conditionsNote } from '../lib/walkthroughModel';
import type { Scope } from '../lib/scopeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const input = 'px-2.5 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

interface AdminOrg { id: string; name: string }

export default function BidPackagePanel({ scope, jobTitle, siteAddress, designProjectId, conditionIds }: {
  scope: Scope;
  jobTitle?: string;
  siteAddress?: string;
  /** From the walkthrough. Costs he would otherwise price as risk. */
  conditionIds?: string[];
  /** Carried onto the request so a returned price can find its way home. */
  designProjectId?: string;
}) {
  const [site, setSite] = useState(siteAddress || '');
  const [dueAt, setDueAt] = useState('');
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [orgId, setOrgId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});

  const packages = useMemo(() => packagesFor(scope), [scope]);
  const ctx = useMemo(
    () => ({ site, walkthroughDone: scope.walkthroughDone }),
    [site, scope.walkthroughDone],
  );

  /**
   * The orgs this person may post work for.
   *
   * Read rather than assumed, and only owners and admins — an ordinary member
   * or a viewer does not put work out to bid. The database enforces the same
   * rule; this only keeps the dropdown honest.
   */
  const loadOrgs = useCallback(async () => {
    if (orgs) return;
    const { data: mems } = await supabase
      .from('organization_members').select('org_id, role, status');
    const admin = (mems || []).filter(
      (m: any) => m.status === 'active' && ['owner', 'admin'].includes(m.role),
    );
    if (!admin.length) { setOrgs([]); return; }
    const { data } = await supabase
      .from('organizations').select('id, name').in('id', admin.map((m: any) => m.org_id));
    const list = (data || []) as AdminOrg[];
    setOrgs(list);
    if (list.length && !orgId) setOrgId(list[0].id);
  }, [orgs, orgId]);

  const send = useCallback(async (pkg: BidPackage) => {
    if (!orgId) { toast.error('Choose which organisation is posting this.'); return; }
    if (!isSendable(pkg, ctx)) { toast.error('Fix what is blocking this package first.'); return; }

    setBusy(pkg.trade);
    let createdId: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const row: Record<string, any> = {
        org_id: orgId,
        title: packageTitle(pkg, jobTitle),
        trade: pkg.trade,
        // The prose, not the lines. The lines are rows, so he can price them.
        // The conditions ride along because every one of them is a cost he
        // would otherwise meet on the first morning and pad for ever after.
        description: [sequencingNote(pkg), conditionsNote(conditionIds || [])]
          .filter(Boolean).join('\n\n'),
        site_address: site.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        // Draft on purpose. Nothing reaches a provider until somebody opens it
        // in the bid room, which is also where the invitations happen.
        status: 'draft',
        created_by: session?.user?.id || null,
        // No budget_low / budget_high. See the note at the top of this file.
      };
      if (designProjectId) row.design_project_id = designProjectId;

      const { data, error } = await supabase.from('bid_requests').insert(row).select();
      if (error) throw error;
      if (!data?.length) throw new Error('You do not have permission to post work for that organisation.');
      createdId = data[0].id;

      const { error: lineErr } = await supabase.from('bid_request_lines').insert(
        pkg.lines.map(l => ({
          bid_request_id: createdId,
          source_line_id: l.sourceLineId,
          phase: l.phase,
          description: l.description,
          qty: l.qty,
          unit: l.unit,
          confidence: l.confidence,
          sort_order: l.sortOrder,
        })),
      );

      // A request with no lines is worse than no request — it looks like a real
      // package and is a paragraph again. So it is removed rather than left.
      if (lineErr) {
        await supabase.from('bid_requests').delete().eq('id', createdId);
        createdId = null;
        throw new Error(`The scope lines could not be attached, so nothing was posted. ${lineErr.message}`);
      }

      setSent(s => ({ ...s, [pkg.trade]: createdId! }));
      toast.success(`${tradeLabel(pkg.trade)} is in the bid room as a draft. Open it there to invite providers.`);
    } catch (err: any) {
      toast.error(err?.message || 'That could not be posted.');
    } finally {
      setBusy(null);
    }
  }, [orgId, ctx, jobTitle, site, dueAt, designProjectId, conditionIds]);

  if (!packages.length) return null;

  return (
    <div className={card}>
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <PackageOpen className="w-4 h-4 text-[#ea580c]" /> Put it out to bid
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        The lines you marked to bid out, split into {packages.length} package
        {packages.length === 1 ? '' : 's'} — one per trade, in build order, with his quantities
        and the inspections that constrain him. Each goes to the bid room as a draft; you open
        it and invite providers there. No budget is sent, because a budget is a floor he bids
        just under.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <label className="text-[11px] text-gray-500">
          Site
          <input value={site} onChange={e => setSite(e.target.value)}
            placeholder="12 Elm St, Salem NH" className={`${input} w-full mt-0.5`} />
        </label>
        <label className="text-[11px] text-gray-500">
          Bids due
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            className={`${input} w-full mt-0.5`} />
        </label>
        <label className="text-[11px] text-gray-500">
          Posting as
          <select value={orgId} onChange={e => setOrgId(e.target.value)} onFocus={loadOrgs}
            className={`${input} w-full mt-0.5`}>
            {orgs === null && <option value="">Loading…</option>}
            {orgs?.length === 0 && <option value="">No organisation you can post for</option>}
            {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {packages.map(pkg => {
          const gaps = packageGaps(pkg, ctx);
          const blocking = gaps.filter(g => g.severity === 'blocking');
          const warnings = gaps.filter(g => g.severity === 'warning');
          const done = sent[pkg.trade];

          return (
            <div key={pkg.trade}
              className={`rounded-xl border p-3 ${
                done ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                  : blocking.length ? 'border-red-500/25 bg-red-500/[0.04]'
                  : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-white">{tradeLabel(pkg.trade)}</span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {pkg.lines.length} line{pkg.lines.length === 1 ? '' : 's'} ·{' '}
                  {phaseOf(pkg.firstPhase).label}
                  {pkg.firstPhase !== pkg.lastPhase && ` → ${phaseOf(pkg.lastPhase).label}`}
                </span>
              </div>

              <p className={`text-[11px] mb-1.5 ${blocking.length ? 'text-red-300' : 'text-gray-500'}`}>
                {packageNote(pkg, ctx)}
              </p>

              {/* The inspections. Said in prose because a hold point rendered
                  as a field is a hold point somebody scans past. */}
              <p className="text-[10px] text-gray-600 flex items-start gap-1.5 mb-2">
                <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                {sequencingNote(pkg)}
              </p>

              <ul className="mb-2 space-y-0.5">
                {pkg.lines.slice(0, 4).map(l => (
                  <li key={l.sourceLineId} className="text-[11px] text-gray-400 flex justify-between gap-2">
                    <span className="truncate">
                      {l.description}
                      {l.confidence === 'provisional' && (
                        <span className="text-amber-500/70"> · provisional</span>
                      )}
                    </span>
                    <span className="shrink-0 text-gray-500">
                      {l.qty > 0 ? `${l.qty} ${l.unit}` : <span className="text-red-400">no qty</span>}
                    </span>
                  </li>
                ))}
                {pkg.lines.length > 4 && (
                  <li className="text-[10px] text-gray-600">and {pkg.lines.length - 4} more</li>
                )}
              </ul>

              {blocking.map((g, i) => (
                <p key={i} className="text-[10px] text-red-300 flex items-start gap-1.5 mb-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{g.message}
                </p>
              ))}
              {warnings.map((g, i) => (
                <p key={i} className="text-[10px] text-amber-200/80 flex items-start gap-1.5 mb-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{g.message}
                </p>
              ))}

              {done ? (
                <a href="/bid-room"
                  className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  In the bid room as a draft — open it to invite providers
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button onClick={() => send(pkg)}
                  disabled={!!busy || blocking.length > 0 || !orgId}
                  onMouseEnter={loadOrgs}
                  className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40"
                  style={{ background: '#ea580c' }}>
                  {busy === pkg.trade
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                  {busy === pkg.trade ? 'Posting…' : 'Send to the bid room'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
