/**
 * Leaving something for the crew.
 *
 * Eric, 2026-11-14: "we should allow the customer add a tip from the portal",
 * and the tip goes to the crew who did the job.
 *
 * THE WORDING IS THE FEATURE
 *
 * Because it goes to people rather than to the company, what this says has to
 * be true: "for the crew", not "add a tip" with no object. A customer who means
 * to thank the two people who carried a sofa down three flights should not have
 * to wonder where it lands — and we should not be able to quietly change our
 * minds about it later, which is why the record it creates names them.
 *
 * NOTHING IS PRESELECTED
 *
 * No default tip, no pre-ticked button. A tip that is on unless you turn it off
 * is a charge somebody did not choose, and it is the single most complained-
 * about pattern in checkout anywhere. Zero is the resting state and it is not
 * made awkward to stay there.
 */
import { useState } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  /** The invoice balance, where there is one. Drives the percentage presets. */
  base?: number;
  value: number;
  onChange: (amount: number) => void;
  /** Shown under the presets, e.g. who it reaches. */
  note?: string;
}

const money = (n: number) => `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;

export default function TipControl({ base, value, onChange, note }: Props) {
  const [custom, setCustom] = useState('');

  /*
   * Percentages against a bill, flat amounts without one.
   *
   * 15% of nothing is nothing, so a standalone tip gets figures somebody can
   * actually mean. Rounded to the dollar because a tip of $37.43 is an
   * arithmetic result, not a decision.
   */
  const presets = base && base > 0
    ? [0.1, 0.15, 0.2].map((pct) => ({
        label: `${Math.round(pct * 100)}%`,
        amount: Math.max(1, Math.round(base * pct)),
      }))
    : [10, 20, 40].map((amount) => ({ label: money(amount), amount }));

  const choose = (amount: number) => {
    setCustom('');
    onChange(value === amount ? 0 : amount);
  };

  return (
    <div className="rounded-xl" style={{ padding: '16px', background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.2)' }}>
      <p className="flex items-center gap-2 text-sm font-black text-white">
        <Heart className="w-4 h-4 text-orange-400" /> Add something for the crew?
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {note || 'It goes to the people who did the work, not to the company. Entirely optional.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = value === p.amount && !custom;
          return (
            <button
              key={p.label}
              onClick={() => choose(p.amount)}
              aria-pressed={active}
              className="rounded-lg text-sm font-bold transition-all"
              style={{
                padding: '10px 16px',
                background: active ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                color: active ? '#000' : '#d1d5db',
                border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {p.label}
              {base && base > 0 ? <span className="ml-1 opacity-70">({money(p.amount)})</span> : null}
            </button>
          );
        })}

        <input
          type="number" inputMode="decimal" min={0} step="any"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
          }}
          placeholder="Other"
          aria-label="Another tip amount"
          className="w-24 rounded-lg text-sm text-white bg-transparent"
          style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
        />

        {value > 0 && (
          <button
            onClick={() => { setCustom(''); onChange(0); }}
            className="rounded-lg text-sm font-bold text-gray-400"
            style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            No thanks
          </button>
        )}
      </div>

      {value > 0 && (
        <p className="mt-3 text-xs font-bold text-orange-300">
          {money(value)} for the crew{base && base > 0 ? `, on top of the ${money(base)} invoice` : ''}.
        </p>
      )}
    </div>
  );
}
