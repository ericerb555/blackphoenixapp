/**
 * What a vendor permits us to do with their product photography, and how they
 * want their catalogue presented.
 *
 * WHY THE VENDOR ANSWERS THIS RATHER THAN US
 *
 * These started as three platform-wide decisions to be made once: may we show a
 * vendor's images, how often do we re-fetch them, and what does a product with
 * no picture do in the customer's picker. Every one of them is a question
 * suppliers genuinely differ on — a manufacturer's own distributor may be
 * delighted to have their photography shown everywhere, while a reseller may
 * hold no rights to it at all. Choosing centrally would have been choosing
 * wrongly for some of them, invisibly.
 *
 * THE DIFFERENCE BETWEEN A CONSENT AND AN OPTION
 *
 * The toggles at the top are permission and default to OFF. Nothing displays a
 * vendor's imagery until they say so, and the server records who agreed, when,
 * and against which version of the terms — because a consent nobody can produce
 * later is not evidence of anything.
 *
 * The choices below them are preferences with safe defaults, because most
 * vendors will import a catalogue once and never open this screen again.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * File types, size caps, the SSRF guard on a URL the vendor supplies, tenant
 * isolation, content filtering. Those protect other people, so they are rules
 * rather than settings. A setting a vendor can use to affect another party is a
 * vulnerability with a friendly label.
 */
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Save, Info, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  vendorId: string;
  apiBase: string;
  headers: () => Record<string, string>;
}

const SURFACES: Array<{ key: string; label: string; blurb: string }> = [
  {
    key: 'designCentre',
    label: 'In the design centre',
    blurb: 'Customers see your product photograph while they are choosing materials for their project.',
  },
  {
    key: 'quotes',
    label: 'On quotes and proposals',
    blurb: 'Your photograph appears beside the line it prices on the document a customer receives.',
  },
  {
    key: 'storefront',
    label: 'On the public storefront',
    blurb: 'Your photograph is shown on a page anybody can reach, without signing in.',
  },
];

const OPTIONS: Array<{ key: string; label: string; blurb: string; choices: Array<[string, string]> }> = [
  {
    key: 'imageResync',
    label: 'When we refresh your images',
    blurb: 'A catalogue sync always refreshes prices. This is about the pictures.',
    choices: [
      ['url-change', 'Only when the image address changes'],
      ['every-sync', 'Every time the catalogue syncs'],
      ['never', 'Never — keep the first image imported'],
    ],
  },
  {
    key: 'productsWithoutImages',
    label: 'Products with no picture',
    blurb: 'What a customer sees when one of your products has no image yet.',
    choices: [
      ['placeholder', 'Show it with a placeholder image'],
      ['hide', 'Hide it from the product picker'],
    ],
  },
];

export default function VendorImageConsent({ vendorId, apiBase, headers }: Props) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Seeded with the same defaults the server applies, so every control has a
  // valid value even before the first load returns — an empty <select> renders
  // as a blank row and reads as a missing choice rather than a pending one.
  const [draft, setDraft] = useState<{ imageDisplay: Record<string, boolean>; options: Record<string, string> }>({
    imageDisplay: Object.fromEntries(SURFACES.map(s => [s.key, false])),
    options: Object.fromEntries(OPTIONS.map(o => [o.key, o.choices[0][0]])),
  });

  const url = `${apiBase}/vendor-settings/${encodeURIComponent(vendorId)}`;

  const load = useCallback(async () => {
    if (!vendorId) { setLoading(false); return; }
    try {
      const res = await fetch(url, { headers: headers() });
      const json = await res.json().catch(() => ({}));
      if (!json.success) {
        setLoadError(res.status === 403
          ? 'These settings belong to another vendor account.'
          : (json.error || 'Could not load your settings.'));
        return;
      }
      setLoadError(null);
      setSettings(json.settings);
      setDraft({
        imageDisplay: Object.fromEntries(
          SURFACES.map(s => [s.key, Boolean(json.settings?.imageDisplay?.[s.key]?.granted)]),
        ),
        options: Object.fromEntries(
          OPTIONS.map(o => [o.key, json.settings?.options?.[o.key] || o.choices[0][0]]),
        ),
      });
    } catch {
      setLoadError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [url, vendorId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ imageDisplay: draft.imageDisplay, options: draft.options }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.success) { toast.error(json.error || 'Could not save.'); return; }
      setSettings(json.settings);
      toast.success('Saved.');
    } catch {
      toast.error('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  if (!vendorId) {
    return (
      <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-gray-400">
        These settings become available once your vendor account is linked.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your settings…
      </div>
    );
  }

  // A failed read is not a set of settings. Showing the form anyway would
  // present defaults as though they were the vendor's saved answers, and a save
  // from that state would overwrite real consents with the ones on screen.
  if (loadError) {
    return (
      <div className="p-4 bg-[#1A1A1A] border border-amber-500/30 rounded-lg">
        <p className="text-sm text-amber-400">{loadError}</p>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="mt-3 px-3 py-1.5 text-sm text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const dirty =
    SURFACES.some(s => Boolean(settings?.imageDisplay?.[s.key]?.granted) !== Boolean(draft.imageDisplay[s.key])) ||
    OPTIONS.some(o => (settings?.options?.[o.key] || '') !== (draft.options[o.key] || ''));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <ShieldCheck className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-orange-400 mb-1">Your product images</h3>
          <p className="text-sm text-gray-300">
            Nothing of yours is displayed until you say so here. Each place is asked for separately,
            because showing a photograph on one customer's quote is not the same as putting it on a
            public page.
          </p>
        </div>
      </div>

      {/* Consents */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg divide-y divide-[#2A2A2A]">
        {SURFACES.map(surface => {
          const record = settings?.imageDisplay?.[surface.key];
          const on = Boolean(draft.imageDisplay[surface.key]);
          return (
            <div key={surface.key} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-white">{surface.label}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{surface.blurb}</p>
                {record?.granted && record.grantedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Agreed {new Date(record.grantedAt).toLocaleDateString()} by {record.grantedBy}
                    {record.termsVersion ? ` · terms ${record.termsVersion}` : ''}
                  </p>
                )}
                {!record?.granted && record?.revokedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Withdrawn {new Date(record.revokedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={surface.label}
                onClick={() => setDraft(d => ({ ...d, imageDisplay: { ...d.imageDisplay, [surface.key]: !on } }))}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${on ? 'bg-orange-500' : 'bg-[#3A3A3A]'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* The honest part. It belongs in front of the toggle, not in a footer. */}
      <div className="flex items-start gap-3 p-4 bg-[#141414] border border-[#2A2A2A] rounded-lg">
        <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400">
          Turning these on confirms you hold the right to let us display these images. Product
          photography often belongs to the manufacturer rather than the supplier, so this is your
          confirmation rather than our assumption. You can withdraw permission at any time, and the
          images stop being shown.
        </p>
      </div>

      {/* Options */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg divide-y divide-[#2A2A2A]">
        {OPTIONS.map(option => (
          <div key={option.key} className="p-4">
            <label className="text-sm font-medium text-white" htmlFor={`opt-${option.key}`}>{option.label}</label>
            <p className="text-sm text-gray-400 mt-1 mb-3">{option.blurb}</p>
            <select
              id={`opt-${option.key}`}
              value={draft.options[option.key] || ''}
              onChange={e => setDraft(d => ({ ...d, options: { ...d.options, [option.key]: e.target.value } }))}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white"
            >
              {option.choices.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          {settings?.updatedAt
            ? `Last saved ${new Date(settings.updatedAt).toLocaleString()}`
            : 'Not saved yet — the defaults above apply.'}
        </p>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
