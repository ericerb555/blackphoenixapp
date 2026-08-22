/**
 * CondoOffersSection — what Black Phoenix can do for this condo, and for whom.
 *
 * A condo is two customers. The association is responsible for the common
 * elements and the building envelope; the owner is responsible for everything
 * inside their unit walls. So a board is shown envelope and grounds work, and a
 * unit owner is shown interior renovation — the company's core business, aimed
 * at a building full of kitchens with a known address.
 *
 * Someone governing the association also sees, separately and clearly labelled,
 * what their owners are being offered. Not to buy, but because a board that
 * knows what its residents are seeing is a board that can point them at it.
 *
 * EVERY CARD STATES WHY
 *
 * The reasoning comes from `condoOffers.ts`, which is held to the standard
 * `townLoads.ts` sets: a figure is looked up and carries its source, never
 * inferred. So the snow load quoted here is the one the town's building
 * department published, and where no town record exists the section says the
 * suggestions are seasonal only rather than inventing local knowledge. There
 * are no revenue projections here because we hold no data that would support
 * one.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Send, Loader2, MapPin, Info, Home, Building2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { offersForAudience, townBasis, seasonOf, type CondoFacts, type CondoOffer } from '../../lib/condoOffers';
import { lookupTownLoads } from '../../lib/townLoads';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Pull a town and state out of a free-text address, if one is written there. */
function townFromAddress(address: string): { town: string; state: string } | null {
  const text = String(address || '').trim();
  if (!text) return null;
  // "12 Harbour Way, Portsmouth, NH 03801" → Portsmouth / NH
  const m = text.match(/,\s*([A-Za-z .'-]+),\s*([A-Za-z]{2})\b/);
  if (m) return { town: m[1].trim(), state: m[2].trim().toUpperCase() };
  const m2 = text.match(/,\s*([A-Za-z .'-]+)\s+([A-Za-z]{2})\b/);
  if (m2) return { town: m2[1].trim(), state: m2[2].trim().toUpperCase() };
  return null;
}

export interface CondoOffersProps {
  association: any;
  /** The viewer's granted role on this association. */
  role: string;
  viewerName?: string;
  viewerEmail?: string;
}

const GOVERNING = ['board_president', 'board_member', 'property_manager'];

export default function CondoOffersSection({ association, role, viewerName, viewerEmail }: CondoOffersProps) {
  const [town, setTown] = useState<any>(null);
  const [townChecked, setTownChecked] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [showOther, setShowOther] = useState(false);

  const address = String(association?.address || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const place = townFromAddress(address);
      if (!place) { setTownChecked(true); return; }
      try {
        const record = await lookupTownLoads(place.town, place.state);
        if (!cancelled) setTown(record || null);
      } catch {
        // No record, or the lookup is unavailable. Either way the section falls
        // back to seasonal reasoning and says so — it never fills the gap.
      } finally {
        if (!cancelled) setTownChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  const facts: CondoFacts = useMemo(() => ({
    name: String(association?.name || ''),
    address,
    unitCount: Number(association?.unitCount) || 0,
    buildings: Number(association?.buildings) || 0,
    town,
  }), [association, address, town]);

  const governs = GOVERNING.includes(String(role));
  const mine = offersForAudience(facts, governs ? 'association' : 'owner');
  const theirs = offersForAudience(facts, governs ? 'owner' : 'association');
  const basis = townBasis(facts);
  const season = seasonOf(new Date());

  const request = async (offer: CondoOffer) => {
    setSending(offer.id);
    const ref = `BP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    try {
      const res = await fetch(`${SERVER}/work-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          clientName: viewerName || 'Condo member',
          clientEmail: viewerEmail || '',
          clientPhone: '',
          serviceType: offer.service,
          project_name: `${offer.title} — ${association?.name || 'condo association'}`,
          // The reason travels with the request, so whoever picks it up knows
          // what was said on screen and does not have to reconstruct it.
          description: `${offer.blurb}\n\nWhy this was suggested: ${offer.reason}`,
          address,
          urgency: 'flexible',
          requestNumber: ref,
          source: offer.audience === 'owner' ? 'condo_owner_offer' : 'condo_association_offer',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not send the request.');
      const id = data.workRequest?.id || ref;
      setSent((s) => ({ ...s, [offer.id]: id }));
      toast.success(`Request sent — reference ${id}. Someone will be in touch.`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send the request.');
    } finally {
      setSending(null);
    }
  };

  const Card = ({ offer, actionable }: { offer: CondoOffer; actionable: boolean }) => (
    <div className="flex flex-col rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <p className="font-bold text-white">{offer.title}</p>
        {offer.season && (
          <span className="shrink-0 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-semibold capitalize text-orange-300">
            {offer.season}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400">{offer.blurb}</p>
      {/* The reason is the point of the card, so it is given its own weight
          rather than being tucked underneath as fine print. */}
      <p className="mt-3 border-l-2 border-[#2A2A2A] pl-3 text-sm text-gray-300">{offer.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-500">{offer.price || 'Quoted per job'}</span>
        {actionable && (
          sent[offer.id] ? (
            <span className="text-sm font-semibold text-green-400">Requested · {sent[offer.id]}</span>
          ) : (
            <button
              type="button"
              disabled={sending === offer.id}
              onClick={() => request(offer)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
            >
              {sending === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Request this
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Sparkles className="h-5 w-5 text-orange-400" />
              {governs ? 'For your association' : 'For your unit'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {governs
                ? 'Work on the common elements and the building envelope — the association’s responsibility.'
                : 'Work inside your unit, which is yours to alter rather than the association’s.'}
            </p>
          </div>
          <span className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 text-sm capitalize text-gray-300">
            {season}
          </span>
        </div>

        {/* Where the reasoning comes from, said plainly — including when the
            answer is "nowhere yet". */}
        <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
          basis.hasRecord
            ? 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400'
            : 'border-yellow-500/25 bg-yellow-500/5 text-yellow-200/90'
        }`}>
          {basis.hasRecord ? <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{townChecked ? basis.line : 'Checking the town record…'}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mine.map((o) => <Card key={o.id} offer={o} actionable />)}
      </div>

      {/* What the other side of the building is being offered. Visible to
          whoever governs, because a board that knows what its residents see can
          point them at it — and to an owner, so the split is not a mystery. */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 p-5 text-left"
        >
          <span className="flex items-center gap-2 font-bold text-white">
            {governs ? <Home className="h-4 w-4 text-gray-400" /> : <Building2 className="h-4 w-4 text-gray-400" />}
            {governs ? 'What your unit owners are offered' : 'What the association is offered'}
          </span>
          {showOther ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showOther && (
          <div className="border-t border-[#2A2A2A] p-5">
            <p className="mb-4 text-sm text-gray-400">
              {governs
                ? 'Interior work is the owner’s to commission, not the association’s — this is here so you know what residents are seeing.'
                : 'Common areas and the building envelope are the association’s responsibility, not yours. Raise these with your board.'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {theirs.map((o) => <Card key={o.id} offer={o} actionable={false} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
