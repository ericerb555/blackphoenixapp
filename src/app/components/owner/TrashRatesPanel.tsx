/**
 * What the junk and demo estimator charges.
 *
 * Eric, 2026-11-14: "where can i set the prics for these can we add a section
 * in the owners dash".
 *
 * WHY THIS SCREEN HAS TO EXIST AT ALL
 *
 * Every figure the estimator uses today is a published New Hampshire trade
 * average, not this company's number, and every line it produces says
 * `standard` on it for exactly that reason — `pricingDefaults.ts` set that
 * convention and its reasoning is the reason this screen is worth building: a
 * published standard figure is defensible, but it is not *this company's*
 * number, and a quote that cannot tell the difference is the same dishonesty
 * in a smarter suit.
 *
 * So the screen's main job is not data entry. It is making the difference
 * visible: every field says whether the number in it is Eric's or borrowed,
 * and what the borrowed one is, so the gap between the two is something he can
 * see rather than something he has to remember.
 *
 * THE FIELDS ARE COSTS, NOT PRICES
 *
 * Labour, tipping, trucks. The markup that turns cost into what a customer pays
 * lives where it already lives — the margin settings — and is deliberately not
 * duplicated here, because two places to set a margin is one place to forget.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/** Label, the key on the record, and the unit the number is in. */
const JOB_FIELDS: Array<{ key: string; label: string; unit: string; hint: string }> = [
  { key: 'laborPerHour', label: 'Labour', unit: '$ per crew hour', hint: 'What an hour of one pair of hands costs you.' },
  { key: 'cuYdPerCrewHour', label: 'Crew pace', unit: 'cubic yards per crew hour', hint: 'Ground floor, short carry. Stairs and distance are added on top automatically.' },
  { key: 'crewSize', label: 'Crew size', unit: 'people', hint: 'How many go out on a normal haul.' },
  { key: 'truckCuYd', label: 'Truck capacity', unit: 'cubic yards', hint: 'Usable capacity. Decides when a job becomes two trips.' },
  { key: 'perTrip', label: 'Per trip', unit: '$', hint: 'Fuel, drive time and the queue at the transfer station.' },
  { key: 'minimum', label: 'Minimum charge', unit: '$', hint: 'Nothing is quoted below this, however small.' },
];

const CLASS_LABELS: Record<string, string> = {
  'mixed-household': 'Mixed household',
  wood: 'Wood / timber',
  drywall: 'Drywall',
  metal: 'Metal (scrap)',
  'concrete-masonry': 'Concrete & masonry',
  'yard-waste': 'Yard waste',
  mattress: 'Mattress',
  appliance: 'Appliance',
  electronics: 'Electronics',
  tyre: 'Tyres',
};

export default function TrashRatesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [standard, setStandard] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  /** Everything as strings — an input is text, and "" must not become 0. */
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/trash-estimator/rates`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not read the rates (${res.status}).`);

      setStandard(data.standard);
      setRules(data.surchargeRules || []);
      setSaved(Boolean(data.saved));

      const next: Record<string, string> = {};
      for (const f of JOB_FIELDS) next[f.key] = String(data.rates?.[f.key] ?? '');
      for (const [cls, v] of Object.entries(data.rates?.disposalPerTon || {})) next[`ton.${cls}`] = String(v);
      for (const rule of (data.surchargeRules || [])) {
        const set = data.rates?.surcharges?.[rule.id];
        next[`sur.${rule.id}`] = set === undefined ? '' : String(set);
      }
      setForm(next);
    } catch (err: any) {
      setError(err?.message || 'Could not read the rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const disposalPerTon: Record<string, number> = {};
      const surcharges: Record<string, number> = {};
      const body: Record<string, unknown> = {};

      for (const f of JOB_FIELDS) {
        if (form[f.key] !== '') body[f.key] = Number(form[f.key]);
      }
      for (const cls of Object.keys(CLASS_LABELS)) {
        const v = form[`ton.${cls}`];
        if (v !== undefined && v !== '') disposalPerTon[cls] = Number(v);
      }
      for (const rule of rules) {
        const v = form[`sur.${rule.id}`];
        if (v !== undefined && v !== '') surcharges[rule.id] = Number(v);
      }

      const res = await fetch(`${SERVER}/trash-estimator/rates`, {
        method: 'PUT',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...body, disposalPerTon, surcharges }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `That did not save (${res.status}).`);

      setSaved(true);
      toast.success('Rates saved', {
        description: 'Every estimate from now on uses these, and says they are yours.',
      });
    } catch (err: any) {
      toast.error(err?.message || 'Could not save those rates.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400" style={{ padding: '24px' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Reading the rate card…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl" style={{ padding: '20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <p className="text-sm font-bold text-red-400">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-xs font-bold text-orange-400">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <Trash2 className="w-5 h-5 text-orange-400" /> Junk &amp; demo rates
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          What the photo estimator costs a job at. It prices from these the moment you save —
          nothing has to be redeployed.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl" style={{
          padding: '12px',
          background: saved ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)',
          border: `1px solid ${saved ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.3)'}`,
        }}>
          <Info className={`w-4 h-4 flex-shrink-0 ${saved ? 'text-green-400' : 'text-yellow-400'}`} />
          <p className={`text-xs leading-relaxed ${saved ? 'text-green-200/90' : 'text-yellow-200/90'}`}>
            {saved
              ? 'These are your rates. Estimates show each line as “your rate”.'
              : 'Nothing is set yet, so the estimator is using published New Hampshire trade averages and every line it prints says “standard”. They are a reasonable start — they are not your numbers. The quickest way to real ones is your last few transfer station receipts.'}
          </p>
        </div>
      </div>

      {/* ── the job ─────────────────────────────────────────────────────── */}
      <Group title="The job" subtitle="Labour, pace and what it costs to turn a truck out.">
        {JOB_FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label} unit={f.unit} hint={f.hint}
            value={form[f.key] ?? ''}
            standard={standard?.[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}
      </Group>

      {/* ── the tip ─────────────────────────────────────────────────────── */}
      <Group
        title="Disposal, per ton"
        subtitle="What each stream costs at the gate. Weight is worked out from volume, so these matter more than they look — concrete is six times the weight of household junk for the same truck space."
      >
        {Object.entries(CLASS_LABELS).map(([cls, label]) => (
          <Field
            key={cls}
            label={label} unit="$ per ton"
            value={form[`ton.${cls}`] ?? ''}
            standard={standard?.disposalPerTon?.[cls]}
            onChange={(v) => set(`ton.${cls}`, v)}
            hint={cls === 'metal' ? 'Zero because scrap value covers the tip fee. The labour line still charges for handling it.' : undefined}
          />
        ))}
      </Group>

      {/* ── per item ────────────────────────────────────────────────────── */}
      <Group
        title="Per-item surcharges"
        subtitle="Charged as their own line and never folded into the volume — a mattress is not expensive because it is big. Leave one blank to keep the published figure."
      >
        {rules.map((rule) => (
          <Field
            key={rule.id}
            label={rule.label} unit="$ each" hint={rule.why}
            value={form[`sur.${rule.id}`] ?? ''}
            standard={rule.standard}
            onChange={(v) => set(`sur.${rule.id}`, v)}
          />
        ))}
      </Group>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => void save()} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-black text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '14px 20px' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save these rates'}
        </button>
        <button
          onClick={() => void load()} disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl text-sm font-black text-gray-300"
          style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '14px 20px' }}
        >
          <RotateCcw className="w-4 h-4" /> Undo my changes
        </button>
      </div>

      <p className="text-xs text-gray-600">
        These are costs, not what the customer pays — your margin is applied on top and is set
        with the rest of your pricing, so there is only ever one place to change it.
      </p>
    </div>
  );
}

function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) {
  return (
    <div className="rounded-2xl" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-sm font-black text-white">{title}</h3>
      {subtitle && <p className="mt-1 text-xs leading-relaxed text-gray-500">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

/**
 * One number, with the published figure beside it.
 *
 * The standard is shown always, not only when the field is empty, because the
 * useful question is not "is this set" but "is this different from the figure
 * everybody else uses, and did I mean it to be".
 */
function Field({ label, unit, hint, value, standard, onChange }: {
  label: string; unit: string; hint?: string;
  value: string; standard?: number; onChange: (v: string) => void;
}) {
  const mine = value !== '' && Number(value) !== Number(standard);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-200">{label}</p>
        {hint && <p className="text-[11px] leading-relaxed text-gray-600">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number" inputMode="decimal" min={0} step="any"
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={standard === undefined ? '' : String(standard)}
          className="w-24 rounded-lg text-sm text-white bg-transparent text-right"
          style={{ border: `1px solid ${mine ? 'rgba(234,88,12,0.5)' : 'rgba(255,255,255,0.15)'}`, padding: '8px 10px' }}
          aria-label={`${label} — ${unit}`}
        />
        <span className="w-32 text-[11px] text-gray-500">{unit}</span>
      </div>
      <span className="text-[10px] font-bold w-28 flex-shrink-0 text-right"
        style={{ color: mine ? '#fb923c' : '#6b7280' }}>
        {mine ? 'your rate' : standard === undefined ? '' : `standard ${standard}`}
      </span>
    </div>
  );
}
