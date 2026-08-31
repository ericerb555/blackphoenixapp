/**
 * "Show me what that would look like."
 *
 * A homeowner photographs a room or the outside of their house, says what they
 * are imagining, and sees it. A deck on the back, a roof over the one they
 * have, a pergola, different siding, a different colour, a new kitchen layout,
 * hardwood instead of carpet, new windows.
 *
 * WHY IT IS THE FRONT DOOR RATHER THAN A TOY
 *
 * When they like one, it becomes a work request with the picture attached. So a
 * lead arrives already carrying a photograph of the house and an image of
 * exactly what the customer wants, which is a considerably better start than a
 * phone call saying "we were thinking about the back".
 *
 * Their photographs also seed the building record, so the same pictures that
 * showed them a deck are the ones the desk pass builds the plan from. Captured
 * once, used twice.
 *
 * THE LABELLING IS NOT DECORATION
 *
 * A render is far more persuasive than any small print under it, and a customer
 * who believes one is a promise is a dispute at handover. So it says what it is
 * on the image itself, in the caption, and again in the request that goes to the
 * office — an idea, not a plan, not a measurement and not a price.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Camera, Upload, Sparkles, Loader2, X, Info, Send, CheckCircle2, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { fileToDataUrl } from '../../lib/imageCapture';
import MarkArea, { buildMask, type MarkedArea } from '../MarkArea';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

/**
 * Starting points, not a menu.
 *
 * A blank box is intimidating and produces "make it nicer", which cannot be
 * rendered. These are phrased as a whole sentence so the box can be edited
 * rather than filled in.
 */
const IDEAS = [
  { label: 'A deck', wish: 'Add a deck across the back of the house, with a railing and steps down to the garden.' },
  { label: 'A roof over the deck', wish: 'Add a roof over the existing deck, supported on posts, matching the house.' },
  { label: 'A pergola', wish: 'Add a wooden pergola over the patio, open slatted roof.' },
  { label: 'New siding', wish: 'Replace the siding with new horizontal siding in a warm grey.' },
  { label: 'A different colour', wish: 'Paint the house a soft white with dark trim.' },
  { label: 'A patio', wish: 'Add a paver patio with a walkway to the door.' },
  { label: 'New kitchen', wish: 'Replace the kitchen with shaker cabinets, a quartz worktop and a tiled splashback.' },
  { label: 'Hardwood floors', wish: 'Replace the floor with wide oak hardwood boards.' },
  { label: 'Tile floor', wish: 'Replace the floor with large format grey tile.' },
  { label: 'New windows', wish: 'Replace the windows with white double-hung windows with grids.' },
];

interface Shot {
  url: string;
  wish: string;
  disclaimer: string;
}

export default function HomeVisualiser({ customerEmail, customerName }: {
  customerEmail?: string;
  customerName?: string;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [wish, setWish] = useState('');
  const [area, setArea] = useState<MarkedArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [sent, setSent] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const take = useCallback(async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    try {
      setPhoto(await fileToDataUrl(f));
      setShots([]);
      setArea(null);
    } catch {
      toast.error('That photo could not be read.');
    }
  }, []);

  const imagine = useCallback(async () => {
    if (!photo || !wish.trim() || busy) return;
    setBusy(true);
    try {
      let mask = '';
      if (area) {
        try { mask = await buildMask(photo, area); } catch { /* whole photo then */ }
      }
      const res = await fetch(`${SERVER}/house-capture/imagine`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ photo, wish: wish.trim(), mask }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // The server's wording is better than anything invented here — it knows
        // how many images are left.
        toast.error(data?.error || 'That did not work.');
        return;
      }
      setShots(s => [{ url: data.url, wish: data.wish, disclaimer: data.disclaimer }, ...s]);
    } catch (err: any) {
      toast.error(err?.message || 'That did not work.');
    } finally {
      setBusy(false);
    }
  }, [photo, wish, area, busy]);

  /**
   * Turn a picture they liked into a real enquiry.
   *
   * The photograph and the image both travel with it, and the description says
   * plainly that the image is an illustration — so nobody at the office reads
   * it as a specification either.
   */
  const startRequest = useCallback(async (shot: Shot) => {
    if (!customerEmail) {
      toast.error('Sign in first so we know who to reply to.');
      return;
    }
    try {
      const res = await fetch(`${SERVER}/work-requests`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          title: shot.wish.slice(0, 80),
          description:
            `From the home visualiser. The customer asked to see:\n\n"${shot.wish}"\n\n`
            + 'The attached image is an illustration of that idea, not a design or a '
            + 'measurement. Nothing about size, structure or price has been established.',
          serviceType: 'Consultation',
          category: 'Visualiser',
          clientEmail: customerEmail,
          customerName: customerName || '',
          clientName: customerName || '',
          photos: [shot.url, photo].filter(Boolean),
          source: 'home-visualiser',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'That could not be sent.'); return; }
      setSent(shot.url);
      toast.success('Sent. Somebody will come back to you about it.');
    } catch (err: any) {
      toast.error(err?.message || 'That could not be sent.');
    }
  }, [customerEmail, customerName, photo]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          <Home className="w-4 h-4 text-[#ea580c]" /> See it on your own home
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Take a photo, say what you are imagining, and we will show you. It is an idea
          rather than a plan — but if you like it, we can talk about it properly.
        </p>

        {!photo ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => cameraInput.current?.click()}
              className="px-3 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#ea580c' }}>
              <Camera className="w-4 h-4" /> Take a photo
            </button>
            <button onClick={() => fileInput.current?.click()}
              className="px-3 py-3 rounded-xl text-sm font-semibold text-gray-300 border border-[#2A2A2A] flex items-center justify-center gap-2 hover:text-white">
              <Upload className="w-4 h-4" /> Choose one
            </button>
          </div>
        ) : (
          <>
            <MarkArea photo={photo} area={area} onChange={setArea}
              hint="Only the boxed part changes. Leave it blank to let us work on the whole picture." />
            <button onClick={() => { setPhoto(null); setShots([]); setArea(null); }}
              className="mt-2 text-[11px] text-gray-500 hover:text-white flex items-center gap-1">
              <X className="w-3 h-3" /> use a different photo
            </button>
          </>
        )}

        <input ref={fileInput} type="file" accept="image/*" className="hidden"
          onChange={e => take(e.target.files)} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => take(e.target.files)} />
      </div>

      {photo && (
        <div className={card}>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            What would you like to see?
          </label>
          <textarea value={wish} onChange={e => setWish(e.target.value)} rows={3} maxLength={500}
            placeholder="A deck across the back with steps down to the garden…"
            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c] resize-y" />

          <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
            {IDEAS.map(i => (
              <button key={i.label} onClick={() => setWish(i.wish)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white">
                {i.label}
              </button>
            ))}
          </div>

          <button onClick={imagine} disabled={busy || !wish.trim()}
            className="w-full px-3 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: '#ea580c' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? 'Working on it…' : 'Show me'}
          </button>
          <p className="text-[11px] text-gray-600 mt-2 text-center">
            You have a limited number of these. Each one takes a moment.
          </p>
        </div>
      )}

      {shots.map(shot => (
        <div key={shot.url} className={card}>
          <img src={shot.url} alt={shot.wish} className="w-full rounded-xl mb-2" />

          {/* Said on the picture, not only under it. */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-2.5 mb-2 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90">{shot.disclaimer}</p>
          </div>

          <p className="text-xs text-gray-400 mb-2">“{shot.wish}”</p>

          {sent === shot.url ? (
            <p className="text-xs text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Sent — somebody will be in touch.
            </p>
          ) : (
            <button onClick={() => startRequest(shot)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Send className="w-4 h-4" /> I like this — talk to me about it
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
